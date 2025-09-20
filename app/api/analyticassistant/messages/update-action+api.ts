import { getServerAuth } from "@/lib/server-utils";
import { supabaseServer } from "@/lib/supabaseServer";

type AllowedAction = 'favorite' | 'bookmark';
const ALLOWED_ACTIONS: AllowedAction[] = ['favorite', 'bookmark'];

export async function PATCH(req: Request) {
    try {
        const user = getServerAuth(req);
        if (!user) return new Response('Unauthorized', { status: 401 });

        const {
            messageId,
            actionType,
            value
        }: {
            messageId: string,
            actionType: AllowedAction,
            value: boolean
        } = await req.json();

        if (!messageId || !actionType || typeof value !== 'boolean') {
            return Response.json({ error: 'Missing required parameters: messageId, actionType, value.' }, { status: 400 });
        }

        if (!ALLOWED_ACTIONS.includes(actionType)) {
            return Response.json({ error: `Invalid action type: ${actionType}` }, { status: 400 });
        }

        // const { data: messageData, error: ownerError } = await supabaseServer
        //     .from('message')
        //     .select('created_user_id')
        //     .eq('id', messageId)
        //     .single();

        // if (ownerError || (messageData?.created_user_id as any) !== user.user_id) {
        //     return new Response('Forbidden: You do not own this message.', { status: 403 });
        // }

        const { error: updateError } = await supabaseServer
            .from('message')
            .update({ [actionType]: value })
            .eq('id', messageId);

        if (updateError) {
            console.error("Error updating message action:", updateError);
            throw new Error(updateError.message);
        }

        return Response.json({ success: true, message: `Message ${actionType} updated.` });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}