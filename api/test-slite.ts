
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SliteNote {
    id: string;
    title: string;
}

// This is a Vercel serverless function dedicated to testing the Slite API connection.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.SLITE_API_KEY) {
        return res.status(500).json({ 
            success: false, 
            message: 'SLITE_API_KEY is not configured in the server environment.' 
        });
    }

    try {
        const testUrl = 'https://api.slite.com/v1/notes?limit=5';
        const sliteResponse = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'x-slite-api-key': process.env.SLITE_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!sliteResponse.ok) {
            let errorMessage = `Slite API returned status ${sliteResponse.status}.`;
            try {
                // Slite often provides a structured error message
                const errorData = await sliteResponse.json();
                if (errorData?.error?.message) {
                    errorMessage = `Slite API Error: ${errorData.error.message}`;
                }
            } catch (e) {
                // If the response isn't JSON, use the raw text
                errorMessage = `Slite API returned a non-JSON error: ${await sliteResponse.text()}`;
            }
            throw new Error(errorMessage);
        }

        const result = await sliteResponse.json();
        const notes: SliteNote[] = result.data;
        const noteCount = notes?.length || 0;

        return res.status(200).json({ 
            success: true, 
            message: `Successfully connected to Slite and found ${noteCount} recent note(s).`,
            data: notes.map(n => n.title),
        });

    } catch (error) {
        console.error("Error in Slite connection test:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ 
            success: false, 
            message: `Failed to connect to Slite. Details: ${errorMessage}` 
        });
    }
}
