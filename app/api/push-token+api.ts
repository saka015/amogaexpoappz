import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    try {
        const { user_id, device_id, push_token, device_name, platform } = await req.json();
        console.log("push token", user_id, device_id, push_token, device_name, platform)
        if (!user_id || !device_id || !push_token) {
            return Response.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 1. Fetch existing push_tokens array
        const { data: userData, error: fetchError } = await supabaseServer
            .from('user_catalog')
            .select('push_tokens')
            .eq('user_catalog_id', user_id)
            .single();

        if (fetchError || !userData) {
            console.error('User not found:', fetchError);
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const pushTokens = userData.push_tokens || [];

        const THIRTY_DAYS_AGO = Date.now() - 1000 * 60 * 60 * 24 * 30;

        // 2. Replace or add current device
        const updatedTokens = [
            ...pushTokens
                .filter((t: any) => t.device_id !== device_id)
                .filter((t: any) => {
                    const lastUpdated = new Date(t.last_updated).getTime();
                    return lastUpdated > THIRTY_DAYS_AGO;
                }),
            {
                device_id,
                push_token,
                device_name,
                platform,
                last_updated: now,
            }
        ];

        // 3. Update user row
        const { error: updateError } = await supabaseServer
            .from('user_catalog')
            .update({ push_tokens: updatedTokens })
            .eq('user_catalog_id', user_id);

        if (updateError) {
            console.error('Failed to update tokens:', updateError);
            return Response.json({ error: 'Failed to update push tokens' }, { status: 500 });
        }

        return Response.json({ success: true });

    } catch (err: any) {
        console.error('Unhandled error:', err);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
