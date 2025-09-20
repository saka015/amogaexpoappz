import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export function selectModel(settings: any) {
    const provider = settings?.provider;
    const providerKey = settings?.providerKey;
    const modelId = settings?.model;

    if (!provider || !providerKey) {
        throw new Error("AI provider or API key is missing from settings.");
    }

    switch (provider) {
        case 'google':
        case 'gemini':
            const google = createGoogleGenerativeAI({ apiKey: providerKey });
            return google(modelId || 'gemini-1.5-flash');
        case 'openrouter':
            const openrouter = createOpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: providerKey,
            });
            return openrouter(modelId || 'google/gemini-flash-1.5');
        case 'openai':
            const openai = createOpenAI({ apiKey: providerKey });
            return openai(modelId || "gpt-4o-mini");
        case 'anthropic':
            const anthropic = createOpenAI({
                baseURL: 'https://api.anthropic.com',
                apiKey: providerKey
            });
            return anthropic(modelId || 'claude-2');
        case 'deepseek':
            const deepseek = createOpenAI({
                baseURL: 'https://api.deepseek.ai',
                apiKey: providerKey
            });
            return deepseek(modelId || 'deepseek-v1');
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

export async function POST(req: Request): Promise<Response> {
    try {
        const settings = await req.json();

        if (!settings?.provider || !settings?.apiKey || !settings?.model) {
            return Response.json({ success: false, error: 'Missing provider, API key, or model.' }, { status: 400 });
        }

        const model = selectModel({
            provider: settings.provider,
            providerKey: settings.apiKey,
            model: settings.model
        });

        const { text, finishReason } = await generateText({
            model,
            prompt: 'Hello, world!',
            maxTokens: 50, // Keep it very small and cheap
        });

        console.log("AI Test Finish Reason:", finishReason, "| Text:", text);

        if (finishReason !== 'stop' && finishReason !== 'length') {
            throw new Error(`AI generation failed with an unexpected reason: ${finishReason}`);
        }

        if (!text) {
            throw new Error('AI returned an empty response, connection might be unstable.');
        }

        return Response.json({ success: true, message: 'Connection successful!' });

    } catch (error: any) {
        console.error("AI Connection Test Error:", error);

        let errorMessage = "Connection failed. Please check your credentials and model name.";
        if (error.message?.includes('invalid') || error.message?.includes('Incorrect API key')) {
            errorMessage = "Authentication failed. Please check your API Key.";
        } else if (error.message?.includes('quota')) {
            errorMessage = "Quota exceeded. Please check your plan and billing details.";
        } else if (error.message?.includes('not found')) {
            errorMessage = "Model not found. Please check the model name is correct for the selected provider.";
        } else if (error.message) {
            errorMessage = `Connection failed: ${error.message}`;
        }

        return Response.json({ success: false, error: errorMessage }, { status: 400 });
    }
}