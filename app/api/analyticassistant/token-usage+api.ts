import { getServerAuth } from "@/lib/server-utils";
import { supabaseServer } from "@/lib/supabaseServer";

const PAGE_SIZE = 20; // Number of logs per page

export async function GET(req: Request) {
    try {
        const user = getServerAuth(req)
        if (!user) return new Response('Unauthorized', { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const offset = (page - 1) * PAGE_SIZE;

        const { data: logs, error, count } = await supabaseServer
            .from('token_usage_logs')
            .select('*', { count: 'exact' })
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;

        const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

        return Response.json({
            logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: count
            }
        });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}