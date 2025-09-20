import { getServerAuth } from "@/lib/server-utils";
import { supabaseServer } from "@/lib/supabaseServer";

// Define the shape of the data for clarity
type StoreSettings = {
    business_name: string;
    store_url: string;
    store_email: string;
};

type WooCommerceSettings = {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    pluginAuthKey: string;
};

type AiSettings = {
    provider: 'google' | 'openai' | 'openrouter';
    apiKey: string;
};

export async function GET(req: Request) {
    try {
        const user = getServerAuth(req)
        if (!user) return new Response('Unauthorized', { status: 401 });

        const { data: userCatalog, error: userCatalogError } = await supabaseServer
            .from('user_catalog')
            .select('business_name, legal_business_name, business_registration_no, store_name, store_url, store_email, store_mobile, user_email, business_name, business_number, for_business_name, for_business_number')
            .eq('user_catalog_id', user.user_id)
            .single();

        if (userCatalogError) throw userCatalogError;
        if (!userCatalog || !(userCatalog.business_number || userCatalog.for_business_number)) {
            throw new Error("User has no associated business number.");
        }

        const { business_number, for_business_number, ...storeData } = userCatalog;

        // Use the business_number to get platform settings
        const { data: platformData, error: platformError } = await supabaseServer
            .from('business_settings')
            .select('data_source_json, ai_provider_key')
            .eq('business_number', (business_number || for_business_number))
            .single();

        if (platformError && platformError.code !== 'PGRST116') {
            throw platformError;
        }

        const wooCommerceSettings = platformData?.data_source_json?.find(
            (ds: any) => ds.platform_type === 'woocommerce'
        )?.credentials?.woocommerce || {};

        const aiSettings = platformData?.ai_provider_key || {};

        const allSettings = {
            store: storeData,
            woocommerce: wooCommerceSettings,
            ai: aiSettings,
        };

        return Response.json(allSettings);

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = getServerAuth(req)
        if (!user) return new Response('Unauthorized', { status: 401 });

        const { tab, data } = await req.json();

        if (!tab || !data) {
            return Response.json({ error: 'Missing tab or data' }, { status: 400 });
        }

        let error;

        // --- Save Logic based on the active tab ---

        if (tab === 'store') {
            const { error: storeUpdateError } = await supabaseServer
                .from('user_catalog')
                .update(data as StoreSettings)
                .eq('user_catalog_id', user.user_id);
            error = storeUpdateError;
        }

        else if (tab === 'woocommerce' || tab === 'ai') {
            // For both Woo and AI, we operate on the business_settings table using business_number.
            // We use 'upsert' which is perfect for new users.

            // First, fetch the current settings to avoid overwriting other fields.
            const { data: existingSettings } = await supabaseServer
                .from('business_settings')
                .select('data_source_json, ai_provider_key')
                .eq('business_number', (user.business_number || user.for_business_number))
                .single();

            let updatePayload: any = { business_number: (user.business_number || user.for_business_number) };

            if (tab === 'woocommerce') {
                const currentDataSources = existingSettings?.data_source_json || [];
                const wooIndex = currentDataSources.findIndex((ds: any) => ds.platform_type === 'woocommerce');
                const newWooConfig = {
                    platform_type: 'woocommerce',
                    status: 'pending',
                    credentials: { woocommerce: data as WooCommerceSettings },
                    updated_at: new Date().toISOString(),
                };
                if (wooIndex > -1) {
                    currentDataSources[wooIndex] = newWooConfig;
                } else {
                    currentDataSources.push(newWooConfig);
                }
                updatePayload.data_source_json = currentDataSources;
                // Preserve existing AI settings if they exist
                if (existingSettings?.ai_provider_key) {
                    updatePayload.ai_provider_key = existingSettings.ai_provider_key;
                }

            } else if (tab === 'ai') {
                updatePayload.ai_provider_key = data as AiSettings;
                // Preserve existing data sources if they exist
                if (existingSettings?.data_source_json) {
                    updatePayload.data_source_json = existingSettings.data_source_json;
                }
            }

            // Perform the upsert
            const { error: upsertError } = await supabaseServer
                .from('business_settings')
                .upsert(updatePayload, { onConflict: 'business_number' });
            error = upsertError;
        }

        if (error) {
            throw error;
        }

        return Response.json({ success: true, message: `${tab} settings saved!` });

    } catch (error: any) {
        console.error(`Error saving settings for tab:`, error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}