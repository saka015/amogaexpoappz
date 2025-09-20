import { CoreMessage, CoreUserMessage, createDataStreamResponse, LanguageModelV1, smoothStream, streamText, TextPart, tool, ToolCallPart, UserContent } from 'ai';
import { jwt, z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createWooCommerceTools, WooCommerceAPI } from '@/lib/ai/woomcp';
import { supabaseServer } from '@/lib/supabaseServer';
import { convertToUIMessages, flattenResponseMessagesToUIMessage, generateTitleFromUserMessage, getChatById, sanitizeResponseMessages, saveChat, saveMessages } from '@/lib/ai/actions';
import { v4 as uuidv4 } from 'uuid';
import { getServerAuth } from '@/lib/server-utils';
import { calculateAICost } from '@/lib/ai/utils';

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


export async function POST(req: Request) {
    try {
        const userInfo = getServerAuth(req);

        if (!userInfo) return new Response('Unauthorized', { status: 401 });

        const { messages, settings, chatId } = await req.json();

        if (!chatId) {
            return new Response('chatId is required', { status: 400 });
        }

        const transformedMessages: CoreMessage[] = messages.map((msg: any) => {
            // If there are no attachments and content is a simple string, it's a standard message.
            // Return it as is to avoid breaking existing assistant/tool messages.
            if (!msg.experimental_attachments && typeof msg.content === 'string') {
                return msg as CoreMessage;
            }

            const contentParts: UserContent = [];

            // 1. Add text content if it exists
            if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
                contentParts.push({
                    type: 'text',
                    text: msg.content,
                });
            }

            // 2. Handle attachments (like audio)
            if (msg.experimental_attachments) {
                for (const attachment of msg.experimental_attachments) {
                    if (attachment.contentType.startsWith("audio/")) {
                        const base64Data = attachment.url.split(",")[1];
                        contentParts.push({
                            type: 'file',
                            data: Buffer.from(base64Data, 'base64'),
                            mimeType: attachment.contentType,
                        });
                    }
                    // If you want to support images:
                    // else if (attachment.contentType.startsWith("image/")) {
                    //     const base64Data = attachment.url.split(",")[1];
                    //     contentParts.push({
                    //         type: 'image',
                    //         image: Buffer.from(base64Data, 'base64'),
                    //         mimeType: attachment.contentType,
                    //     });
                    // }
                }
            }

            if (contentParts.length === 0) {
                return null;
            }

            return {
                role: msg.role,
                content: contentParts,
            };
        }).filter(Boolean) as CoreMessage[];

        const lastUserMessage = messages[messages.length - 1];
        let isLastMessageFromUser = true;
        if (!lastUserMessage || lastUserMessage.role !== 'user') {
            isLastMessageFromUser = false;
        }

        const existingChat = await getChatById(chatId);
        // console.log("existingChat", existingChat)
        let isNewChat = !existingChat;

        let wooAPI = null
        if (settings.wooCommerceUrl && settings.consumerKey && settings.consumerSecret) {
            wooAPI = new WooCommerceAPI({
                url: settings.wooCommerceUrl,
                consumerKey: settings.consumerKey,
                consumerSecret: settings.consumerSecret,
            })
        }

        const model = selectModel(settings);

        const extendedPromptExample = `---
**ENHANCED WORKFLOW EXAMPLES:**

1.  **User:** "Show me my top 5 most expensive products that are currently on sale."
2.  **You (silently):** Call \`getProducts({ on_sale: true, per_page: 5, orderby: 'price', order: 'desc' })\`, then call \`createTable()\` with the results.
3.  **You (response to user):** "Here are your top 5 most expensive products on sale. It looks like 'Premium Widget Pro' is leading the list."

4.  **User:** "What products were in my last order?"
5.  **You (silently):** Call \`getOrders({ per_page: 1 })\`. The result will contain the products. Then call \`createTable()\` using the \`products\` array from the result.
6.  **You (response to user):** "Your last order contained 'Standard Widget' and 'Accessory Pack'. Would you like more details on that order?"

7.  **User:** "Who has the highest value order recently?"
8.  **You (silently):** Call \`getOrders({ per_page: 10 })\`. You will then manually find the order with the highest \`total\` in the results, then respond with information from the \`customer\` object of that specific order.
9.  **You (response to user):** "It looks like John Doe (john.doe@email.com) made the largest recent purchase with order ."
`
        const systemPrompt = `⚠️ **CRITICAL RULE — VISUALIZE FIRST**
Whenever the user asks for anything related to orders, products, or customers:
1. Fetch the data using the correct tool(s).
2. Immediately create a \`createChart\` or \`createTable\` (or both) from the fetched data.
3. Then provide your insight — never before visualization.

---

You are an expert WooCommerce Data Analyst. Your primary function is to interpret user requests, fetch the relevant data, create a clear visualization (chart or table), and then **provide concise, actionable insights** based on that visualization.

**CORE DIRECTIVES:**
1.  **VISUALIZE FIRST, ALWAYS:** For any request about orders, products, customers, etc., your first step is ALWAYS to call the necessary tools to fetch data and then immediately create a \`createChart\` or \`createTable\` visualization.
2.  **DO NOT REPEAT RAW DATA:** The user can see the chart or table. Do not list the numbers or rows from the visualization in your text response.
3.  **PROVIDE INSIGHTS (Your Most Important Job):** After the visualization is created, your main task is to act as an analyst. Your response should be a brief paragraph (2-4 sentences) that highlights the most important takeaways.
    - **Identify Trends:** Is revenue growing or shrinking?
    - **Find Outliers:** Point out the top-selling product, the biggest order, or an unusually slow month.
    - **Summarize:** What is the key story the data is telling?
    - **Suggest Next Steps:** Based on the insight, what could the user look into next? (e.g., "Sales for Product X are low, you might want to check its stock or marketing.")

**RESPONSE EXAMPLES:**
- **GOOD (Provides Insight):** "Here is a chart of your recent order values. It looks like you had a significant peak with order #17100, which was much larger than the others. Overall, your order values have been inconsistent, with a mix of high and low-value purchases."
- **BAD (Just States the Obvious):** "Here is a bar chart of your recent order values."
- **BAD (Repeats Raw Data):** "Here is your data: Order 17180 was 6264, Order 17159 was 13176..."

**CRITICAL RULE: SELF-CORRECTION**
- **If a tool call fails, DO NOT STOP.**
- **You MUST analyze the error message provided to you.**
- **Compare your failed tool call with the Tool Reference below, fix the parameters, and call the tool again.**
- **For example, if the error says "Invalid 'type'", you must check the allowed values for the 'type' parameter in the 'createChart' tool and correct it.**

---
**TOOL USAGE WORKFLOW & SCHEMAS**

**1. Data Fetching:**
- First, call a data-fetching tool like \`getOrders\` or \`getProducts\`.

**2. Data Visualization (CRITICAL):**
- **Immediately after** getting data, you MUST call a visualization tool (\`createTable\` or \`createChart\`) also you can trigger both for better details show chart and data.
- You MUST use the exact parameter names defined below.

**createTable({ title: string, columns: Array<{key: string, header: string}>, rows: object[] })**
- \`title\`: A descriptive title like "Recent Orders".
- \`columns\`: An array of column objects. Example: \`[{"key":"id", "header":"Product ID"}, {"key": "name", "header":"Product Name"}]\`.
- \`rows\`: The array of simplified data objects you received from the previous tool call.

**createChart({ title: string, type: 'bar' | 'line' | 'pie', chartData: object[], xAxisColumn: string, yAxisColumn: string })**
- \`title\`: A descriptive title like "Sales Over Time".
- \`type\`: The chart type. Must be one of: 'bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'.
- \`chartData\`: The raw array of data objects you just fetched (e.g., from \`getOrders\`).
- \`xAxisColumn\`: The property from the data objects to use for labels (e.g., "Date").
- \`yAxisColumn\`: The property from the data objects to use for values (e.g., "Total").

---
**WORKFLOW:**
1.  **User:** "Show me my recent orders."
2.  **You (silently):** Call \`getOrders()\`, then call \`createChart()\` or \`createTable()\`.
3.  **You (response to user):** "I've charted your recent order totals. There's a notable spike around order #17100. It might be worth investigating what made that particular sale so successful."

**INTERPRETER USAGE (Use Only When Simple Tools Can’t Do It):**
- **USE FOR:** All complex questions that require deep analysis, custom logic, or combining data from the entire store.
- **EXAMPLES:** "What are my top 10 most used coupons?", "Which product generated the most revenue ever?", "Find customers from California who bought a specific product."
- **BEHAVIOR:** This tool executes JavaScript code. Inside the code, you have one main helper function:
    - \`fetch(endpoint, params)\`: This function is extremely powerful.
        - \`endpoint\` can be 'products', 'orders', or 'coupons'.
        - It automatically retrieves **ALL pages of data**.
        - It returns the **full, raw data objects** with every field available.
- **RULE:** Your code inside the interpreter **MUST** end with a \`return\` statement.

---
**COMPLEX WORKFLOW EXAMPLES (Using the Interpreter):**
- **User:** "What is the average order value for completed orders this year?"
- **You (Reasoning):** Complex. I need all completed orders this year to calculate an average. I must use the \`codeInterpreter\`.
- **You (Tool Call):** \`codeInterpreter({ code: "const orders = await fetch('orders', { status: 'completed', after: 'YYYY-01-01T00:00:00' }); const total = orders.reduce((sum, order) => sum + parseFloat(order.total), 0); return total / orders.length;" })\`
- **You (Response):** "The average order value for completed orders this year is $XX.XX."
IMPORTANT NOTE ON \`fetch\`:** The \`fetch\` helper inside the interpreter returns the **FULL, RAW data object** from the API

${wooAPI ? "WooCommerce API is configured. START FETCHING DATA AND CREATING VISUALIZATIONS IMMEDIATELY." : "WooCommerce API is not configured. Briefly guide the user to the settings page."}`

        const result = streamText({
            model,
            system: systemPrompt,
            messages: transformedMessages,
            maxSteps: 25,
            maxRetries: 3,
            // experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: uuidv4,
            tools: createWooCommerceTools(wooAPI) as any,
            onFinish: async (result) => {
                console.log('--- STREAM FINISHED ---');
                console.log('Finish Reason:', result.finishReason);
                console.log('Usage:', result.usage);
                const extraUsage = {
                    promptTokens: 0,
                    completionTokens: 0
                }

                try {
                    if (isNewChat) {
                        let title = 'New Conversation';

                        if (!lastUserMessage.experimental_attachments && !Array.isArray(lastUserMessage.experimental_attachments)) {
                            const { title: titleCreate, usage: titleCreateUsage } = await generateTitleFromUserMessage({ model, message: lastUserMessage });
                            if (titleCreate) {
                                title = titleCreate
                                extraUsage.completionTokens += titleCreateUsage.completionTokens
                                extraUsage.promptTokens += titleCreateUsage.totalTokens
                            }
                        }

                        await saveChat({
                            id: chatId,
                            user_id: userInfo.user_id,
                            title: title,
                            chat_share_url: `/analyticassistant/${chatId}`,
                            settings: settings,
                            chat_group: 'ANALYTICASSISTAT'
                        });
                        console.log('✅ New chat record saved. title', title);
                    }

                    if ((existingChat && existingChat?.title === 'New Conversation')) {
                        console.log("mmm", messages.map((m: any) => ({
                            content: m.content,
                            // role: m.role
                        })))
                        const { title: titleUpdate, usage: titleUpdateUsage } = await generateTitleFromUserMessage({
                            model,
                            message: messages.map((m: any) => ({
                                content: m.content,
                                // role: m.role
                            }))
                        });
                        if (titleUpdate) {
                            await saveChat({
                                id: chatId,
                                user_id: userInfo.user_id,
                                title: titleUpdate,
                                chat_share_url: `/analyticassistant/${chatId}`,
                                settings: settings,
                                chat_group: 'ANALYTICASSISTAT'
                            });

                            extraUsage.completionTokens += titleUpdateUsage.completionTokens
                            extraUsage.promptTokens += titleUpdateUsage.totalTokens
                        }
                        console.log('✅ updated chat title:', titleUpdate);
                    }

                    if (isLastMessageFromUser) {
                        await saveMessages([{
                            chatId: chatId,
                            role: 'user',
                            content: lastUserMessage.content,
                            experimental_attachments: lastUserMessage.experimental_attachments ?? null,
                            parts: lastUserMessage.parts,
                            created_user_id: userInfo.user_id
                        }]);
                        console.log('✅ User message saved.');
                    }

                    console.log("extraUsage", extraUsage)

                    const aiCost = calculateAICost({
                        provider: settings.provider,
                        model: settings.model,
                        promptTokens: result.usage.promptTokens + extraUsage.promptTokens,
                        completionTokens: result.usage.completionTokens + extraUsage.completionTokens,
                    }) ?? 0;

                    const update_token_count = await supabaseServer.rpc('update_token_count', {
                        chat_id_param: chatId,
                        prompt_tokens_param: result.usage.promptTokens + extraUsage.promptTokens,
                        completion_tokens_param: result.usage.completionTokens + extraUsage.completionTokens,
                        cost_param: aiCost
                    });

                    await supabaseServer.rpc('log_token_usage', {
                        user_id_param: userInfo.user_id,
                        chat_id_param: chatId,
                        model_name_param: settings?.model || 'unknown',
                        prompt_tokens_param: result.usage.promptTokens + extraUsage.promptTokens,
                        completion_tokens_param: result.usage.completionTokens + extraUsage.completionTokens,
                        cost_param: aiCost,
                        business_number_param: (userInfo.business_number || userInfo.for_business_number),
                        source_param: "chat"
                    });
                    console.log('✅ Token usage updated.', update_token_count);
                } catch (error) {
                    console.error('🔴 Error inside onFinish callback:', error);
                }
            },
            // experimental_telemetry: {
            //     isEnabled: true,
            //     functionId: 'stream-text',
            // },
        });

        return result.toDataStreamResponse({
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'none',
            },
            getErrorMessage: (error: unknown) => {
                if (error == null) {
                    return 'unknown error';
                }

                if (typeof error === 'string') {
                    return error;
                }

                if (error instanceof Error) {
                    return error.message;
                }

                return JSON.stringify(error);
            }
        })
    } catch (error) {
        console.error("chat error", error)
        Response.json({ error: (error as any)?.message }, { status: 500 })
    }
}