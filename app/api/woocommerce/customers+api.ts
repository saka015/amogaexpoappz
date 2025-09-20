//TODO: move woo customer api call to this api to keep store settings in server only
import { getServerAuth } from '@/lib/server-utils';
import { supabaseServer } from '@/lib/supabaseServer';

// Helper to get settings from the database
async function getWooCommerceSettings(userId: string) {
    const { data } = await supabaseServer
        .from('business_settings')
        .select('data_source_json')
        .eq('user_catalog_id', userId)
        .single();
    
    return data?.data_source_json?.find((ds: any) => ds.platform_type === 'woocommerce')?.credentials?.woocommerce;
}

export async function GET(req: Request) {
    try {
        const user = getServerAuth(req);
        if (!user) return new Response('Unauthorized', { status: 401 });

        const settings = await getWooCommerceSettings(user.id);
        if (!settings) throw new Error("WooCommerce settings not configured.");

        const wooAPI = createWooCommerceAPI(settings);

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const search = searchParams.get('search') || '';
        const per_page = 15; // Items per page

        const { data: customers } = await wooAPI.get('customers', {
            page,
            per_page,
            search,
            role: 'all',
        });
        
        return Response.json(customers || []);

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = getServerAuth(req);
        if (!user) return new Response('Unauthorized', { status: 401 });
        
        const settings = await getWooCommerceSettings(user.id);
        if (!settings) throw new Error("WooCommerce settings not configured.");
        
        const wooAPI = createWooCommerceAPI(settings);
        const customerData = await req.json();

        const { data: newCustomer } = await wooAPI.post('customers', customerData);

        return Response.json(newCustomer);
    } catch (error: any) {
         return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
     try {
        const user = getServerAuth(req);
        if (!user) return new Response('Unauthorized', { status: 401 });
        
        const settings = await getWooCommerceSettings(user.id);
        if (!settings) throw new Error("WooCommerce settings not configured.");
        
        const wooAPI = createWooCommerceAPI(settings);
        const { customerId, customerData } = await req.json();
        
        if (!customerId) throw new Error("Customer ID is required for an update.");

        const { data: updatedCustomer } = await wooAPI.put(`customers/${customerId}`, customerData);

        return Response.json(updatedCustomer);
    } catch (error: any) {
         return Response.json({ error: error.message }, { status: 500 });
    }
}

function createWooCommerceAPI(settings: any) {
    return {} as any
}
