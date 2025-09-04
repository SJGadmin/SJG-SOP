import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple interfaces
interface StructuredResponse {
    summary?: string;
    steps?: string[];
    notes?: string[];
    sources?: string[];
    clarification?: string;
    isNotFound?: boolean;
    isOutOfScope?: boolean;
}

interface Message {
    id: string;
    sender: 'user' | 'assistant';
    content: string | StructuredResponse;
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

async function fetchSliteData(apiKey: string): Promise<string> {
    try {
        const response = await fetch('https://api.slite.com/v1/search-notes?query=', {
            method: 'GET',
            headers: {
                'x-slite-api-key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Slite API error:', response.status, response.statusText);
            return JSON.stringify([{
                title: "Sample SOP",
                content: "This is a placeholder SOP for testing purposes."
            }]);
        }

        const data = await response.json();
        const notes = data.data || [];
        
        // Limit to first 5 notes to avoid timeout
        const limitedNotes = notes.slice(0, 5);
        
        const formattedNotes = limitedNotes.map((note: any) => ({
            title: note.title || "Untitled",
            content: "SOP content placeholder"
        }));

        return JSON.stringify(formattedNotes);
    } catch (error) {
        console.error('Error fetching from Slite:', error);
        return JSON.stringify([{
            title: "Error fetching SOPs",
            content: "Unable to retrieve SOPs at this time."
        }]);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages required' });
        }

        if (!process.env.API_KEY || !process.env.SLITE_API_KEY) {
            return res.status(500).json({ error: 'API keys not configured' });
        }

        // Fetch SOPs
        const sopContent = await fetchSliteData(process.env.SLITE_API_KEY);

        const systemInstruction = `You are the SJG SOP Assistant. Provide helpful answers based on the provided SOPs.
        
        SOPs available:
        ${sopContent}
        
        Respond with a JSON object following the schema.`;

        // Convert messages to Gemini format
        const geminiContents = messages.map((msg: Message) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ 
                text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) 
            }],
        }));

        // Call Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiContents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const jsonText = response.text || '{}';
        const assistantResponse = JSON.parse(jsonText);
        
        return res.status(200).json(assistantResponse);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            summary: "Sorry, I'm having trouble right now. Please try again.",
        });
    }
}
