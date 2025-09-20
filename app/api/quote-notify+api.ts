import config from '@/config';
import { sendNotificationToUser } from '@/lib/notifications';
import { supabaseServer } from '@/lib/supabaseServer';

type Quote = { quote_id: number; customer_key: string; supplier_key: string; created_at: string; line_items: { product_name: string; quantity: number; product_id: number; product_image: string }[]; quote_status: string; supplier_name?: string; };

interface QuoteWebhookPayload {
    quote_id: number;
    quote: Quote;
}

const APP_URL = config.EXPO_PUBLIC_API_URL

export async function POST(req: Request) {
    try {
        const { quote_id, quote } = await req.json() as QuoteWebhookPayload;

        if (!quote_id || !quote) {
            return Response.json({ error: 'Missing quote_id or quote' }, { status: 400 });
        }

        // 1. Fetch the customer's details to get their name
        const { data: customer, error: customerError } = await supabaseServer
            .from('user_catalog')
            .select('first_name, last_name, user_catalog_id')
            .eq('user_mobile', quote.customer_key)
            .single();

        if (customerError || !customer) {
            console.error('Could not find customer to personalize message:', customerError);
        }

        const customerName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

        // --- Logic Branching based on status ---

        if (quote.quote_status === 'waiting-for-approval') {
            // === ACTION: Notify the SUPPLIER ===

            const supplierMobile = quote.supplier_key;
            if (!supplierMobile) {
                return Response.json({ error: 'Supplier mobile not found on quote' }, { status: 400 });
            }

            // Find the supplier's user_catalog_id
            const { data: supplierUser, error: supplierError } = await supabaseServer
                .from('user_catalog')
                .select('user_catalog_id')
                .eq('user_mobile', supplierMobile)
                .single();

            if (supplierError || !supplierUser) {
                console.error(`Supplier user not found for mobile ${supplierMobile}:`, supplierError);
                return Response.json({ error: 'Supplier user not found' }, { status: 404 });
            }

            const receiverUserId = supplierUser.user_catalog_id;

            // Construct the notification message
            const notificationMessage = `You have a new Quote from ${customerName} Please check the details `;

            // Create the notification in the 'message' table
            const { error: insertError } = await supabaseServer.from('message').insert({
                chat_message_type: 'APP_NOTIFICATION',
                archive_status: false,
                receiver_user_id: receiverUserId,
                chat_message: notificationMessage,
                created_user_name: "Quote Request",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                custom_one: `${APP_URL}/supplier/quote/${quote.quote_id}`
            });

            if (insertError) {
                console.error('Error inserting supplier notification:', insertError);
                return Response.json({ error: 'Failed to create supplier notification' }, { status: 500 });
            }

            console.log(`Successfully created 'waiting-for-approval' notification for supplier ${receiverUserId}.`);

            await sendNotificationToUser(receiverUserId, {
                title: 'Quote Request',
                body: notificationMessage,
                data: {
                    path: `/supplier/quote/${quote.quote_id}`
                }
            })
        } else {
            // === ACTION: Notify the CUSTOMER (for any other status change) ===
            if (customerError || !customer) {
                console.error(`Customer user not found for mobile ${quote.customer_key}:`, customerError);
                return Response.json({ error: 'Customer user not found' }, { status: 404 });
            }

            const receiverUserId = customer.user_catalog_id;

            // Construct the notification message based on the new status
            const notificationMessage = `The status of your quote request #${quote_id} has been updated to: ${quote.quote_status}.`;

            // Create the notification in the 'message' table
            const { error: insertError } = await supabaseServer.from('message').insert({
                chat_message_type: 'APP_NOTIFICATION',
                archive_status: false,
                receiver_user_id: receiverUserId,
                chat_message: notificationMessage,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                created_user_name: "Quote Request",
                custom_one: `${APP_URL}/supplier/quote/${quote.quote_id}`
            });

            if (insertError) {
                console.error('Error inserting customer notification:', insertError);
                return Response.json({ error: 'Failed to create customer notification' }, { status: 500 });
            }

            console.log(`Successfully created status update notification for customer ${receiverUserId}.`);

            await sendNotificationToUser(receiverUserId, {
                title: 'Quote Request',
                body: notificationMessage,
                data: {
                    path: `/supplier/quote/${quote.quote_id}`
                }
            })
        }

        // --- Final Success Response ---
        return Response.json({ success: true, message: `Notification processed for quote ${quote_id}` });

    } catch (error: any) {
        console.error('Unhandled API Error:', error);
        return Response.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
    }
}