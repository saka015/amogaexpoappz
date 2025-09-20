import { generateText, CoreMessage } from 'ai';
import { getServerAuth } from "@/lib/server-utils";
import { selectModel } from "./chat+api";
import { supabaseServer } from '@/lib/supabaseServer';
import { calculateAICost } from '@/lib/ai/utils';

async function logTokenUsage(
    userId: string,
    chatId: string,
    modelName: string,
    modelProvider: string,
    promptTokens: number,
    completionTokens: number,
    businessNumber: string
) {
    const cost = calculateAICost({
        provider: modelProvider,
        model: modelName,
        promptTokens: promptTokens,
        completionTokens: completionTokens,
    }) ?? 0;

    const update_token_count = await supabaseServer.rpc('update_token_count', {
        chat_id_param: chatId,
        prompt_tokens_param: promptTokens,
        completion_tokens_param: completionTokens,
        cost_param: cost
    });

    const log_token_usage = await supabaseServer.rpc('log_token_usage', {
        user_id_param: userId,
        chat_id_param: chatId,
        model_name_param: modelName,
        prompt_tokens_param: promptTokens,
        completion_tokens_param: completionTokens,
        cost_param: cost,
        business_number_param: businessNumber,
        source_param: "chat_suggestions"
    });
    console.log("suggetion cost", log_token_usage, update_token_count)
}

export async function POST(req: Request) {
    try {
        const user = getServerAuth(req);
        if (!user) return new Response('Unauthorized', { status: 401 });

        const { messages, settings, chatId } = await req.json();

        if (!messages || messages.length === 0) {
            return Response.json({ error: 'Conversation history is required.' }, { status: 400 });
        }

        const model = selectModel(settings);

        const recentMessages = messages.slice(-5);

        const { text: suggestionsText, usage } = await generateText({
            model,
            system: `You are a helpful AI assistant that suggests the next logical questions a user might ask based on the provided conversation history.
- Provide 3 concise, relevant follow-up questions.
- Each suggestion should be a complete question a user could ask.
- **IMPORTANT**: Respond ONLY with a JSON array of strings in the format: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
- Do not add any other text, explanation, or formatting.`,
            prompt: `Here is the conversation history:\n\n${JSON.stringify(recentMessages)}`,
        });

        if (usage && chatId) {
            await logTokenUsage(
                user.user_id,
                chatId,
                settings?.model || 'unknown',
                settings?.provider || 'unknown',
                usage.promptTokens,
                usage.completionTokens,
                (user.business_number || user.for_business_number)
            );
        }

        try {
            const suggestions = JSON.parse(suggestionsText);
            return Response.json({ suggestions });
        } catch (e) {
            console.error("Failed to parse suggestions JSON:", suggestionsText);
            const fallbackSuggestions = suggestionsText.match(/"(.*?)"/g)?.map(s => s.replace(/"/g, '')) || [];
            return Response.json({ suggestions: fallbackSuggestions });
        }

    } catch (error: any) {
        console.error("Error generating suggestions:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
