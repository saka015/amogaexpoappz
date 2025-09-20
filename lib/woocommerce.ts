import { useAuth } from "@/context/supabase-provider";

type FetchOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: object;
    params?: Record<string, any>;
};

export const wooApiFetch = async (
    endpoint: string,
    options: FetchOptions = {},
    namespace: string = "/wc/v3",
    storeSettings?: { url: string; consumerKey: string; consumerSecret: string; pluginAuthKey: string }
) => {
    // const WC_API_URL = 'https://storesdemo.morr.biz/wp-json' + namespace;
    // const WC_CONSUMER_KEY = 'ck_b6dba5073ef0694a34914e223620204315501c6b';
    // const WC_CONSUMER_SECRET = 'cs_f685d55bd439c404fa5a4a03c30a2b5ccb7af74a';

    const WC_API_URL = storeSettings?.url + '/wp-json' + namespace;
    const WC_CONSUMER_KEY = storeSettings?.consumerKey;
    const WC_CONSUMER_SECRET = storeSettings?.consumerSecret;
    if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
        throw new Error('WooCommerce API credentials are not set.');
    }

    if (!endpoint) {
        throw new Error('Endpoint is required for WooCommerce API requests.');
    }

    // Basic Authentication header
    const credentials = `${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`;
    const encoded = btoa(credentials);
    const authHeader = `Basic ${encoded}`;

    const { method = 'GET', body, params } = options;

    let url = `${WC_API_URL}/${endpoint}`;

    if (params) {
        const queryParams = new URLSearchParams(params).toString();
        url += `?${queryParams}`;
    }
    console.log(`Making WooCommerce API request to: ${url}`);
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'auth': storeSettings?.pluginAuthKey || "didnt set pluginAuthKey"
            },
            body: body ? JSON.stringify(body) : null,
        });
        console.log(`WooCommerce API Request: ${method} ${url}`, body);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error(`WooCommerce API Error (${endpoint}):`, error);
        throw error;
    }
};