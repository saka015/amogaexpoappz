import { saveMessages } from '@/lib/ai/actions'; // Reuse your DB action

function decodeJwt(token: string) {
    const payload = token.split('.')[1];
    const json = atob(payload); // or Buffer.from(payload, 'base64').toString() in Node
    return JSON.parse(json);
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        let user = null;
        if (token) {
            user = decodeJwt(token);
        }

        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { messagesToSave } = await req.json();

        if (!messagesToSave || !Array.isArray(messagesToSave) || messagesToSave.length === 0) {
            return Response.json({ error: 'No messages provided to save.' }, { status: 400 });
        }

        // Use your existing, clean action to save the messages
        const { error } = await saveMessages(messagesToSave);

        if (error) {
            console.error("Error saving messages:", error);
            return Response.json({ error: 'Failed to save messages.' }, { status: 500 });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        console.error('API Error in save-messages route:', error);
        return Response.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}