
import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StructuredResponse, Message, Sender } from '../types';

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
 * Fetches all documents from your Slite workspace.
 * This is a two-step process:
 * 1. Use the /search-notes endpoint to get a list of all notes.
 * 2. For each note ID, fetch the full content.
 */
async function fetchSopsFromSlite(apiKey: string): Promise<string> {
    // Step 1: Use the /v1/search-notes endpoint to find all notes using GET and query params.
    const searchUrl = 'https://api.slite.com/v1/search-notes?query='; // Empty query to get all
    const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'x-slite-api-key': apiKey,
            'Content-Type': 'application/json',
        },
    });

    if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Failed to search for notes on Slite API. Status: ${searchResponse.status} ${searchResponse.statusText}. Response: ${errorText}`);
    }

    const searchResult = await searchResponse.json();
    // The list of notes is nested inside a 'data' property in the response object
    const notesList: SliteNoteSearchResult[] = searchResult.data;

    if (!notesList || !Array.isArray(notesList) || notesList.length === 0) {
        console.log("No SOPs found in Slite or response format was unexpected.");
        return "[]"; // No SOPs found
    }

    // Step 2: For each note found, fetch its full content.
    // This runs all fetches in parallel for efficiency.
    const noteDetailPromises = notesList.map(noteInfo =>
        fetch(`https://api.slite.com/v1/notes/${noteInfo.id}`, {
            headers: { 'x-slite-api-key': apiKey }
        }).then(res => {
            if (!res.ok) {
                // Log the error but don't throw, so one failed note doesn't break the whole app
                console.error(`Failed to fetch details for note ${noteInfo.id}. Status: ${res.status}`);
                return null;
            }
            return res.json() as Promise<SliteNoteDetails>;
        })
    );

    // Wait for all detail fetches to complete and filter out any that failed (returned null)
    const noteDetails = (await Promise.all(noteDetailPromises)).filter(Boolean) as SliteNoteDetails[];

    // Step 3: Format the notes with content for the AI.
    const formattedSops = noteDetails.map(note => ({
        title: note.title,
        content: note.plaintext.substring(0, 500) + (note.plaintext.length > 500 ? '...' : ''),
    }));

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
            nullable: true 
        },
        notes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of important notes or reminders from the SOP.",
            nullable: true 
        },
        sources: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "An array containing the exact 'title' of the SOP(s) used for the answer." 
        },
        clarification: { type: Type.STRING, description: "A question to ask the user for clarification.", nullable: true },
        isNotFound: { type: Type.BOOLEAN, description: "Set to true if no relevant SOP is found.", nullable: true },
        isOutOfScope: { type: Type.BOOLEAN, description: "Set to true if the query is outside the scope of SOPs.", nullable: true },
    },
    required: ["summary", "sources"]
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages }: { messages: Message[] } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required and must be a non-empty array.' });
    }

    if (!process.env.API_KEY || !process.env.SLITE_API_KEY) {
        return res.status(500).json({ error: 'API keys for Gemini and Slite are not configured.' });
    }

    try {
        // 1. Fetch live SOP data from Slite
        const sopContentForAI = await fetchSopsFromSlite(process.env.SLITE_API_KEY);

        // 2. Construct the system prompt with the live data and new personality
        const systemInstruction = `You are the SJG SOP Assistant, a sharp, friendly, and slightly witty AI partner for a top-tier real estate team. Your primary mission is to provide clear, accurate answers based *only* on the provided Standard Operating Procedures (SOPs). While you are professional, you're also approachable and can use light, real estate-themed humor or puns to make interactions more engaging.

        **Core Rules:**
        1.  **Accuracy is Paramount:** Your answers MUST be derived exclusively from the content of the provided SOPs. Do not use external knowledge or invent information. Your personality should never compromise the accuracy of the information.
        2.  **Engaging Personality:** Start your responses with a friendly greeting (e.g., "Happy to help!", "Alright, let's take a look at that for you.", "Great question!"). You can sprinkle in clever real estate puns or light humor where appropriate (e.g., "Let's get this deal closed!").
        3.  **Cite Your Sources:** Every answer that provides SOP information must cite the exact 'title' of the SOP document(s) used in the 'sources' field. This is non-negotiable.
        4.  **Prioritize Answering Over Clarifying:** Your main goal is to be helpful and provide an answer.
            - If a user's question is broad (e.g., "tell me about operations"), you should find all relevant SOPs and provide a comprehensive summary.
            - Only ask a clarifying question if a query is completely ambiguous and could lead to a factually incorrect answer. Avoid clarification loops.
        5.  **Use Chat History:** The entire conversation is provided. Use the context of previous messages to understand the user's intent. If you have already asked for clarification, use the user's next message to provide a direct answer.
        6.  **Handle "Not Found":** If you are certain no SOP covers the user's request, respond with the exact JSON object: \`{"isNotFound": true}\`. Do not ask for clarification if you know there is no relevant SOP.
        7.  **Handle "Out of Scope":** If the user asks for non-SOP work (like creative writing or jokes), respond with the exact JSON object: \`{"isOutOfScope": true}\`.
        8.  **Structured Responses:** Your final output must always be a JSON object adhering to the specified schema.

        **Provided SOPs from Slite:**
        ${sopContentForAI}
        `;
        
        // 3. Convert message history to Gemini's format
        const geminiContents = messages
            .map((msg) => {
              let textContent: string | null = null;
              if (typeof msg.content === 'string') {
                textContent = msg.content;
              } else if (msg.content.clarification) {
                textContent = msg.content.clarification;
              }
        
              if (!textContent) return null;
        
              return {
                role: msg.sender === Sender.USER ? 'user' : 'model',
                parts: [{ text: textContent }],
              };
            })
            .filter((item): item is { role: string; parts: { text: string }[] } => item !== null);

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

        const jsonText = response.text.trim();
        const assistantResponse: StructuredResponse = JSON.parse(jsonText);
        
        return res.status(200).json(assistantResponse);

    } catch (error) {
        console.error("Error in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: `Failed to get response from AI service. Details: ${errorMessage}` });
    }
}