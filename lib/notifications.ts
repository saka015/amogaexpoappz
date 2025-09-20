import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { supabaseServer } from "@/lib/supabaseServer";
import config from '@/config';

// Define the shape of your push token object stored in Supabase
interface UserPushToken {
    device_id: string;
    push_token: string;
    device_name: string;
    platform: 'ios' | 'android' | string; // 'ios' or 'android' are key
    last_updated: string;
}

// Define the shape of the notification payload you'll pass
interface NotificationPayload {
    title: string;
    body: string;
    // The `data` object is where you put extra info, like a URL for deep linking
    data?: {
        [key: string]: any;
        url?: string;
    };
}

const expo = new Expo({ accessToken: config.EXPO_ACCESS_TOKEN || "" });
const YOUR_APP_SCHEMA = config.APP_SCHEMA

/**
 * Sends a push notification to all registered devices for a given user.
 * Handles platform-specific deep link transformations.
 * 
 * @param userId The ID of the user (from your 'user_catalog' table).
 * @param payload The notification content (title, body, and optional data with a URL).
 */
export async function sendNotificationToUser(userId: string, payload: NotificationPayload) {
    // Get the user's push tokens from Supabase
    const { data: userData, error: fetchError } = await supabaseServer
        .from('user_catalog')
        .select('push_tokens')
        .eq('user_catalog_id', userId)
        .single();

    if (fetchError || !userData) {
        console.error(`[Notification] User not found for ID: ${userId}`, fetchError);
        return { success: false, error: 'User not found' };
    }

    const userTokens = userData.push_tokens as UserPushToken[] | null;

    if (!userTokens || userTokens.length === 0) {
        console.log(`[Notification] No push tokens found for user: ${userId}.`);
        return { success: true, message: 'No devices to notify.' };
    }

    // Create the messages to send
    const messages: ExpoPushMessage[] = [];
    for (const tokenInfo of userTokens) {
        // Skip any invalid tokens
        if (!Expo.isExpoPushToken(tokenInfo.push_token)) {
            console.warn(`[Notification] Invalid push token skipped: ${tokenInfo.push_token}`);
            continue;
        }

        // Deep link transformation logic
        let finalData = payload.data || {};
        const originalUrl = payload.data?.url;

        // If a URL is provided AND the device is a native mobile app...
        if (originalUrl && (tokenInfo.platform === 'ios' || tokenInfo.platform === 'android')) {
            try {
                // ...transform the URL into a deep link.
                // e.g., "https://yourapp.com/profile/123" -> "myapp://profile/123"
                const urlObject = new URL(originalUrl);
                const deepLink = `${YOUR_APP_SCHEMA}://${urlObject.host}${urlObject.pathname}${urlObject.search}`;
                
                // We'll put the transformed link in the `data` payload
                finalData = { ...payload.data, url: deepLink, path: `${urlObject.pathname}${urlObject.search}` };
                console.log(`[Notification] Transformed URL to deep link for ${tokenInfo.platform}: ${deepLink}`);

            } catch (e) {
                console.warn(`[Notification] Invalid URL format for deep link transformation: ${originalUrl}`);
                // Proceed with original data if URL is malformed
            }
        }

        messages.push({
            to: tokenInfo.push_token,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            data: finalData,
        });
    }

    if (messages.length === 0) {
        console.log(`[Notification] No valid push tokens to send for user: ${userId}.`);
        return { success: true, message: 'No valid devices to notify.' };
    }

    // Chunk and send the notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    console.log(`[Notification] Sending ${messages.length} notifications in ${chunks.length} chunk(s).`);

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
            // NOTE: You can process ticketChunk here to check for errors like 'DeviceNotRegistered'
            // and remove the token from your database. This is an advanced implementation.
        } catch (error) {
            console.error('[Notification] Error sending push notification chunk:', error);
        }
    }

    // Log the results
    tickets.forEach(ticket => {
        if (ticket.status === 'error') {
            console.error(`[Notification] Error ticket received:`, ticket.details);
        }
    });
    
    return { success: true, message: 'Notifications sent successfully.' };
}