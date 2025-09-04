
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SliteSearchResult {
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

    // Use the search endpoint, as it's the core functionality of the app.
    const testUrl = 'https://api.slite.com/v1/search/notes';
    const testQuery = 'SOP'; // A generic query likely to return results.

    try {
        const apiKey = process.env.SLITE_API_KEY.trim();

        const sliteResponse = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: testQuery, limit: 5 }),
        });

        if (!sliteResponse.ok) {
            let errorMessage = `Slite API returned status ${sliteResponse.status}.`;
            try {
                const errorData = await sliteResponse.json();
                if (errorData?.error?.message) {
                    errorMessage = `Slite API Error: ${errorData.error.message}`;
                }
            } catch (e) {
                const rawText = await sliteResponse.text();
                if (rawText) {
                  errorMessage += ` Response: ${rawText}`;
                }
            }
            throw new Error(errorMessage);
        }

        const result = await sliteResponse.json();
        const notes: SliteSearchResult[] = result.data;
        const noteCount = notes?.length || 0;

        return res.status(200).json({ 
            success: true, 
            message: `Successfully connected and found ${noteCount} note(s) matching the query '${testQuery}'.`,
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
