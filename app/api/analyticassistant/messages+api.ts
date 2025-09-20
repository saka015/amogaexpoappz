import { getMessagesByChatId } from "@/lib/ai/actions";
import { convertToUIMessages } from "@/lib/ai/utils";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
    try {
        // const { data: { user } } = await supabaseServer.auth.getUser();

        // if (!user) {
        //     return new Response('Unauthorized', { status: 401 });
        // }

        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) {
            return Response.json({ error: 'chatId is required.' }, { status: 400 });
        }
        
        // You could add a check here to ensure the user owns this chat
        
        const dbMessages = await getMessagesByChatId(chatId);
        
        // Convert DB messages to the format the UI needs (`useChat`'s `Message` type)
        // const uiMessages = convertToUIMessages(dbMessages);
        
        return Response.json(dbMessages);

    } catch (error) {
        console.error('API Error:', error);
        return Response.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}