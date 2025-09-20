import config from '@/config';
import { supabaseServer } from '@/lib/supabaseServer';
import { ImapFlow } from 'imapflow';

// Define the shape of the incoming request body for clarity
interface CleanupRequestBody {
    tasks: ('deleteAuthUser' | 'clearInbox' | 'deleteUserSettings' | 'deleteUserChats')[];
    userEmail: string;
    imapConfig: { host: string; port: number; user: string; password: string }
}

// Reusable helper functions for each cleanup task
async function deleteSupabaseUser(email: string) {
    // const { data: { users }, error: listError } = await supabaseServer.auth.admin.listUsers({ email } as any);
    const { data: userId, error: rpcError } = await supabaseServer.rpc('get_user_id_by_email', {
        user_email: email
    });
    if (rpcError) throw rpcError;
    if (userId) {
        console.log("users[0]", userId)
        // Also delete from database tables
        // await supabaseServer.from('business_settings').delete().eq('user_catalog_id', userId);
        await supabaseServer.from('user_catalog').delete().eq('user_id', userId);

        // Finally, delete the auth user
        const { error: deleteError } = await supabaseServer.auth.admin.deleteUser(userId);
        // const { error: deleteError } = await supabaseServer.rpc('force_delete_user', {
        //     user_id: userId
        // });
        console.log("deleteError", deleteError)
        if (deleteError) throw deleteError;

        return `Successfully deleted user '${email}'.`;
    }
    return `User '${email}' did not exist.`;
}

async function clearImapInbox(config: any) {
    const imapClient = new ImapFlow(config);
    await imapClient.connect();
    await imapClient.mailboxOpen('INBOX');

    const allMessages = await imapClient.search({ all: true });
    if (Array.isArray(allMessages) && allMessages.length > 0) {
        await imapClient.messageDelete(allMessages);
        await imapClient.logout();
        return `Deleted ${allMessages.length} email(s).`;
    }

    await imapClient.logout();
    return 'Inbox was already empty.';
}

// The main API handler
export async function POST(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${config.MAESTRO_SECRET_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { tasks, userEmail, imapConfig: imapInitConfig }: CleanupRequestBody = await req.json();
        if (!tasks || tasks.length === 0) {
            return Response.json({ message: 'No cleanup tasks provided.' });
        }

        if (!imapInitConfig) {
            return Response.json({ message: 'No imapConfig provided.' });
        }

        const imapConfig = {
            host: imapInitConfig.host, port: imapInitConfig.port, secure: true,
            auth: { user: imapInitConfig.user, pass: imapInitConfig.password },
        };

        const results: string[] = [];

        // Sequentially execute tasks based on the request
        for (const task of tasks) {
            console.log(`[Maestro Cleanup] Executing task: ${task}`);
            switch (task) {
                case 'deleteAuthUser':
                    results.push(await deleteSupabaseUser(userEmail));
                    break;
                case 'clearInbox':
                    results.push(await clearImapInbox(imapConfig));
                    break;
                // You can easily add more cases here in the future
                // case 'deleteUserSettings':
                // case 'deleteUserChats':
            }
        }

        return Response.json({ message: 'Cleanup completed.', results });

    } catch (error: any) {
        console.error("[Maestro Cleanup] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
