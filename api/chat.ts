



import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { type StructuredResponse, type Message, Sender } from '../types.js';

// This is a Vercel serverless function
// https://vercel.com/docs/functions/serverless-functions

// Type for the result from /v1/search-notes
interface SliteNoteSearchResult {
    id: string;
    title: string;
}

// Type for the result from /v1/notes/:id
interface SliteNoteDetails {
    id: string;
    title: string;
    plaintext: string;
}

/**
 * Fetches relevant documents from your Slite workspace based on a user query.
 * This is a two-step process:
 * 1. Use the /search-notes endpoint to find notes matching the query.
 * 2. For each note ID, fetch the full content.
 */
async function fetchSopsFromSlite(apiKey: string, userQuery: string): Promise<string> {
    console.log(`Searching Slite with query: "${userQuery}"`);
    // Step 1: Use the /v1/search-notes endpoint to find notes using the user's query.
    const searchUrl = `https://api.slite.com/v1/search-notes?query=${encodeURIComponent(userQuery)}`;
    const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'x-slite-api-key': apiKey,
            'Content-Type': 'application/json',
        },
    });

    if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`Failed to search Slite. Status: ${searchResponse.status}. Response: ${errorText}`);
        throw new Error(`Failed to search for notes on Slite API.`);
    }

    const searchResult = await searchResponse.json();
    const notesList: SliteNoteSearchResult[] = searchResult.data;
    
    console.log(`Found ${notesList?.length || 0} potential SOP(s) in Slite.`);

    if (!notesList || !Array.isArray(notesList) || notesList.length === 0) {
        return "[]"; // No SOPs found, return an empty array string.
    }

    // Step 2: For each note found, fetch its full content.
    const noteDetailPromises = notesList.map(noteInfo =>
        fetch(`https://api.slite.com/v1/notes/${noteInfo.id}`, {
            headers: { 'x-slite-api-key': apiKey }
        }).then(res => {
            if (!res.ok) {
                console.error(`Failed to fetch details for note ${noteInfo.id}. Status: ${res.status}`);
                return null; // Skip failed fetches
            }
            return res.json() as Promise<SliteNoteDetails>;
        })
    );

    const noteDetails = (await Promise.all(noteDetailPromises)).filter(Boolean) as SliteNoteDetails[];

    // Step 3: Format the notes for the AI, including title and content.
    const formattedSops = noteDetails.map(note => ({
        title: note.title,
        content: note.plaintext.substring(0, 1000) + (note.plaintext.length > 1000 ? '...' : ''),
    }));
    
    console.log(`Returning ${formattedSops.length} full SOPs to the AI.`);

    return JSON.stringify(formattedSops, null, 2);
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A concise summary of the answer." },
        steps: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of actionable steps from the SOP.",
        },
        notes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of important notes or reminders from the SOP.",
        },
        sources: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "An array containing the exact 'title' of the SOP(s) used for the answer." 
        },
        clarification: { type: Type.STRING, description: "A question to ask the user for clarification." },
        isNotFound: { type: Type.BOOLEAN, description: "Set to true if no relevant SOP is found." },
        isOutOfScope: { type: Type.BOOLEAN, description: "Set to true if the query is outside the scope of SOPs." },
    },
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages }: { messages: Message[] } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required and must be a non-empty array.' });
    }
    
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.sender !== Sender.USER || typeof lastUserMessage.content !== 'string') {
        return res.status(400).json({ error: 'The last message must be from the user.' });
    }
    const userQuery = lastUserMessage.content;

    if (!process.env.API_KEY || !process.env.SLITE_API_KEY) {
        return res.status(500).json({ error: 'API keys for Gemini and Slite are not configured.' });
    }

    try {
        // 1. Fetch live SOP data from Slite based on the user's latest query
        const sopContentForAI = await fetchSopsFromSlite(process.env.SLITE_API_KEY, userQuery);

        // 2. Construct the system prompt with the live data and personality
        const systemInstruction = `You are the SJG SOP Assistant, a sharp, friendly, and slightly witty AI partner for a top-tier real estate team. Your primary mission is to provide clear, accurate answers based *only* on the provided Standard Operating Procedures (SOPs).

        **Core Rules:**
        1.  **Accuracy is Paramount:** Your answers MUST be derived exclusively from the content of the provided SOPs. Do not use external knowledge or invent information.
        2.  **Engaging Personality:** Start your responses with a friendly greeting (e.g., "Happy to help!", "Alright, let's take a look at that for you."). You can sprinkle in clever real estate puns or light humor where appropriate.
        3.  **Cite Your Sources:** Every answer that provides SOP information must cite the exact 'title' of the SOP document(s) used in the 'sources' field. This is non-negotiable.
        4.  **Prioritize Answering:** Your main goal is to be helpful. If a user's question is broad, use the provided SOPs to give a comprehensive summary. Only ask for clarification if a query is completely ambiguous.
        5.  **Use Chat History:** The entire conversation is provided. Use the context of previous messages to understand the user's intent.
        6.  **Handle Empty Search Results:** If the "Provided SOPs from Slite" section is empty (i.e., "[]"), it means my search found no relevant documents. In this case, you MUST return \`{"isNotFound": true}\` immediately. Do not invent an answer.
        7.  **Handle "Out of Scope":** If the user asks for non-SOP work (like creative writing), respond with the exact JSON object: \`{"isOutOfScope": true}\`.
        8.  **Structured Responses:** Your final output must always be a JSON object adhering to the specified schema.

        **Provided SOPs from Slite (based on user query):**
        ${sopContentForAI}
        `;
        
        // 3. Convert message history to Gemini's format
        const geminiContents = messages.map((msg) => {
            const textContent = typeof msg.content === 'string'
              ? msg.content // User message
              : JSON.stringify(msg.content); // Assistant's structured response
      
            return {
              role: msg.sender === Sender.USER ? 'user' : 'model',
              parts: [{ text: textContent }],
            };
        });

        // 4. Call the Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiContents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                thinkingConfig: { thinkingBudget: 0 }
            },
        });

        const jsonText = (response.text ?? '{}').trim();
        const assistantResponse: StructuredResponse = JSON.parse(jsonText);
        
        return res.status(200).json(assistantResponse);

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: `Failed to get response from AI service. Details: ${errorMessage}` });
    }
}