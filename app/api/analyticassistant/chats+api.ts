import { supabaseServer } from "@/lib/supabaseServer";

function decodeJwt(token: string) {
    const payload = token.split('.')[1];
    const json = atob(payload); // or Buffer.from(payload, 'base64').toString() in Node
    return JSON.parse(json);
}

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        let user = null;
        if (token) {
            user = decodeJwt(token);
        }

        if (!user) return new Response('Unauthorized', { status: 401 });

        const { data: chats, error } = await supabaseServer
            .from('chat')
            .select('id, title, createdAt, prompt_tokens, completion_tokens, total_tokens, token_cost')
            .eq('user_id', user.user_id)
            .eq('chat_group', 'ANALYTICASSISTAT')
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('Error fetching chats:', error);
            return Response.json({ error: 'Failed to fetch chats.' }, { status: 500 });
        }

        return Response.json(chats || []);

    } catch (error) {
        console.error('API Error:', error);
        return Response.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
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

        const { searchParams } = new URL(req.url);
        const chatIdToDelete = searchParams.get('id');

        if (!chatIdToDelete) {
            return Response.json({ error: 'Chat ID is required.' }, { status: 400 });
        }

        // Security Check: First, verify the user owns the chat they are trying to delete.
        const { data: chatData, error: ownerError } = await supabaseServer
            .from('chat')
            .select('id')
            .eq('id', chatIdToDelete)
            .eq('user_id', user.user_id)
            .single();

        if (ownerError || !chatData) {
            return new Response('Forbidden: You do not own this chat.', { status: 403 });
        }

        const { error: deleteChatError } = await supabaseServer
            .from('chat')
            .delete()
            .eq('id', chatIdToDelete);

        if (deleteChatError) {
            console.error('Error deleting chat:', deleteChatError);
            return Response.json({ error: 'Failed to delete chat.' }, { status: 500 });
        }

        const { error: deleteMessaggesError } = await supabaseServer.from('message').delete().eq('chatId', chatIdToDelete)
        if (deleteMessaggesError) {
            console.error('Error deleting chat messages:', deleteMessaggesError, "ChatId", chatIdToDelete);
            return Response.json({ error: 'Failed to delete chat messages.' }, { status: 500 });
        }

        return Response.json({ success: true, message: 'Chat deleted successfully.' });

    } catch (error) {
        console.error('API Error:', error);
        return Response.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}