import config from '@/config';
import { ImapFlow } from 'imapflow';

interface GETOTPRequestBody {
    tasks: ('deleteAuthUser' | 'clearInbox' | 'deleteUserSettings' | 'deleteUserChats')[];
    userEmail: string;
    imapConfig: { host: string; port: number; user: string; password: string }
}

export async function POST(req: Request) {
    // --- 1. Security Check ---
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = `Bearer ${config.MAESTRO_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedSecret) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { imapConfig }: GETOTPRequestBody = await req.json();

    if (!imapConfig) {
        return Response.json({ message: 'No imapConfig provided.' });
    }

    try {
        // --- 2. Configure IMAP Client ---
        const client = new ImapFlow({
            host: imapConfig.host,
            port: imapConfig.port,
            secure: true,
            auth: {
                user: imapConfig.user,
                pass: imapConfig.password,
            },
        });

        // --- 3. Connect and Fetch Email ---
        await client.connect();
        await client.mailboxOpen('INBOX');

        // --- CHANGE #1: Fetch the raw source of the email instead of just the body structure. ---
        // 'source' gives us the full email content as a Buffer.
        const message = await client.fetchOne('*', { source: true });

        if (!message) {
            throw new Error("No emails found in the INBOX.");
        }

        if (!message.source) {
            throw new Error("Email was found, but its content (source) could not be fetched.");
        }

        const emailBody = message.source.toString();
        console.log("emailBody", emailBody)

        // --- 4. Extract OTP using Regex (This part now works correctly) ---
        const otpMatch = emailBody.match(/\b\d{6}\b/);

        if (!otpMatch || !otpMatch[0]) {
            // It's helpful to log the body if the OTP isn't found for debugging
            console.log("Email Body received:", emailBody);
            throw new Error("Could not find a 6-digit OTP in the latest email.");
        }

        const otp = otpMatch[0];

        // --- 5. Clean Up and Respond ---
        await client.logout();

        console.log(`[Maestro Helper] Successfully found OTP: ${otp}`);

        return Response.json({ otp: otp });

    } catch (error: any) {
        console.error("[Maestro Helper] Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}