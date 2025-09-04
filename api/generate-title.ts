
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string.' });
    }
    
    if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'API key for Gemini is not configured.' });
    }

    const systemInstruction = `You are an expert at creating concise, descriptive titles. Based on the user's first message to a chatbot, create a short title for the chat session. The title should be no more than 5 words and should accurately summarize the user's main intent or question. Do not add any introductory text like "Here is the title:". Just return the title itself.`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
                systemInstruction,
            },
        });

        const title = (response.text ?? 'New Chat').trim();
        
        return res.status(200).json({ title });

    } catch (error) {
        console.error("Error in generate-title function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: `Failed to generate title. Details: ${errorMessage}` });
    }
}