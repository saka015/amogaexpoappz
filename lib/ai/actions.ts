import { CoreAssistantMessage, CoreMessage, CoreToolMessage, CoreUserMessage, generateText, Message, ToolInvocation } from "ai";
import { supabaseServer } from "../supabaseServer";

export async function generateTitleFromUserMessage({
    model,
    message,
}: {
    model: any;
    message: CoreUserMessage;
}) {
    const { text: title, usage } = await generateText({
        model,
        system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
        prompt: JSON.stringify(message),
    });

    return { title, usage };
}

function addToolMessageToChat({
    toolMessage,
    messages,
}: {
    toolMessage: CoreToolMessage;
    messages: Array<Message>;
}): Array<Message> {
    return messages.map((message) => {
        if (message.toolInvocations) {
            return {
                ...message,
                toolInvocations: message.toolInvocations.map((toolInvocation) => {
                    const toolResult = toolMessage.content.find(
                        (tool) => tool.toolCallId === toolInvocation.toolCallId,
                    );

                    if (toolResult) {
                        return {
                            ...toolInvocation,
                            state: 'result',
                            result: toolResult.result,
                        };
                    }

                    return toolInvocation;
                }),
            };
        }

        return message;
    });
}

type UIMessage = {
    id: string;
    role: 'assistant';
    content: string;
    toolInvocations: ToolInvocation[];
};

export function flattenResponseMessagesToUIMessage(messages: any[]): UIMessage | null {
    if (!messages || messages.length === 0) return null;

    let content = '';
    const toolInvocations: ToolInvocation[] = [];
    let messageId = '';
    let role: 'assistant' = 'assistant'; // this function focuses only on assistant messages

    for (const message of messages) {
        if (message.role !== 'assistant') continue;

        if (!messageId) messageId = message.id;

        for (const part of message.content) {
            if (part.type === 'text') {
                content += part.text;
            } else if (part.type === 'tool-call') {
                toolInvocations.push({
                    state: 'call',
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    args: part.args,
                });
            }
        }
    }

    if (!content && toolInvocations.length === 0) return null;

    return {
        id: messageId || 'assistant-msg',
        role,
        content,
        toolInvocations,
    };
}

export function convertToUIMessages(
    messages: Array<any>,
): Array<Message> {
    return messages.reduce((chatMessages: Array<Message>, message) => {
        if (message.role === 'tool') {
            return addToolMessageToChat({
                toolMessage: message as CoreToolMessage,
                messages: chatMessages,
            });
        }

        let textContent = '';
        const toolInvocations: Array<ToolInvocation> = [];

        if (typeof message.content === 'string') {
            textContent = message.content;
        } else if (Array.isArray(message.content)) {
            for (const content of message.content) {
                if (content.type === 'text') {
                    textContent += content.text;
                } else if (content.type === 'tool-call') {
                    toolInvocations.push({
                        state: 'call',
                        toolCallId: content.toolCallId,
                        toolName: content.toolName,
                        args: content.args,
                    });
                }
            }
        }

        chatMessages.push({
            id: message.id,
            role: message.role as Message['role'],
            content: textContent,
            toolInvocations,
        });

        return chatMessages;
    }, []);
}

export function sanitizeResponseMessages(
    messages: Array<CoreToolMessage | CoreAssistantMessage>
): Array<CoreToolMessage | CoreAssistantMessage> {
    const toolResultIds: string[] = [];

    // Step 1: Collect toolCallIds from all tool-result messages
    for (const message of messages) {
        if (message.role === 'tool' && Array.isArray(message.content)) {
            for (const part of message.content) {
                if (part.type === 'tool-result') {
                    toolResultIds.push(part.toolCallId);
                }
            }
        }
    }

    // Step 2: Sanitize assistant messages
    const sanitizedMessages = messages.map((message) => {
        if (message.role !== 'assistant') return message;

        if (!Array.isArray(message.content)) return message;

        const sanitizedContent = message.content.filter((part) => {
            if (part.type === 'tool-call') {
                return toolResultIds.includes(part.toolCallId);
            }
            if (part.type === 'text') {
                return part.text.trim().length > 0;
            }
            return true;
        });

        return {
            ...message,
            content: sanitizedContent,
        };
    });

    // Step 3: Filter out assistant messages with no valid content
    return sanitizedMessages.filter((msg) =>
        Array.isArray(msg.content) && msg.content.length > 0
    );
}

export async function getChat(id: string) {
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
        return { chat: null, messages: [] };
    }

    const { data: chat, error } = await supabaseServer
        .from('chat')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error || !chat) {
        return { chat: null, messages: [] };
    }

    const { data: messages } = await supabaseServer
        .from('message')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

    return { chat, messages: messages || [] };
}

export async function createChat({ userId, messages, settings }: {
    userId: string;
    messages: CoreMessage[];
    settings: any; // The settings object from your form
}) {
    const newChatId = crypto.randomUUID();
    const path = `/analyticassistant/${newChatId}`;

    // 1. Create the new chat entry
    const { data: chatData, error: chatError } = await supabaseServer
        .from('chat')
        .insert({
            id: newChatId,
            user_id: userId,
            chat_share_url: path,
            settings: settings,
            title: 'New Conversation' // Placeholder title
        })
        .select()
        .single();

    if (chatError) {
        console.error('Error creating chat:', chatError);
        return { error: 'Could not create chat.' };
    }

    // 2. Save the initial user message
    const { error: messageError } = await supabaseServer
        .from('message')
        .insert(
            messages.map(msg => ({
                chat_id: newChatId,
                user_id: userId,
                role: msg.role,
                content: msg.content as string
            }))
        );

    if (messageError) {
        console.error('Error saving initial message:', messageError);
        // You might want to delete the chat entry here for cleanup
        return { error: 'Could not save initial message.' };
    }

    // revalidatePath('/chat'); // Refresh the sidebar if you have one
    return { id: newChatId, path };
}

export async function getChatById(id: string) {
    const { data } = await supabaseServer.from('chat').select().eq('id', id).single();
    return data;
}

export async function getMessagesByChatId(chatId: string) {
    const { data, error } = await supabaseServer
        .from('message')
        .select('id, role, content, parts, toolInvocations, created_at, favorite, bookmark, experimental_attachments')
        .eq('chatId', chatId)
        .order('created_at', { ascending: true });
    if (error)
        console.error("getMessagesByChatId error", chatId, error)
    // return data || [];
    return data?.map(msg => ({
        ...msg,
        experimental_attachments: msg.experimental_attachments ?? [],
    })) ?? [];
}

export async function saveChat(chat: { id: string; user_id: string; title: string; chat_share_url: string; settings?: any; chat_group?: string }) {
    return supabaseServer.from('chat').upsert(chat, { onConflict: 'id' });
}

export async function saveMessages(messages: Array<any>) {
    return supabaseServer.from('message').insert(messages.map(msg => ({
        // Ensure you don't try to insert an id if it's not provided
        ...msg,
    })));
}