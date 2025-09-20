import { WooCommerceAPIClient } from '@/lib/woo-api-client';

export async function POST(req: Request): Promise<Response> {
    try {
        const { url, consumerKey, consumerSecret } = await req.json();

        if (!url || !consumerKey || !consumerSecret) {
            return Response.json({ success: false, error: 'Missing required credentials.' }, { status: 400 });
        }

        const wooAPI = new WooCommerceAPIClient({
            url,
            consumerKey,
            consumerSecret,
        });

        await wooAPI.get('system_status');

        return Response.json({ success: true, message: 'Connection successful!' });

    } catch (error: any) {
        console.error("WooCommerce Connection Test Error:", error);
        // Provide a more user-friendly error message
        let errorMessage = "Connection failed. Please check your URL and keys.";
        if (error.message?.includes('401')) {
            errorMessage = "Authentication failed. Please check your Consumer Key and Secret.";
        } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('fetch failed')) {
            errorMessage = "Could not reach the provided URL. Please check for typos and ensure it is accessible.";
        }
        
        return Response.json({ success: false, error: errorMessage }, { status: 400 });
    }
}