import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { CustomMarkdown } from '@/components/elements/markdown';
import { CardsMessage } from './cards-message'; // You already have this
import { ToolStatusIndicator } from './chat-interface'; // Import from its original file
import { Button } from '../elements/Button';
import LucideIcon from '../LucideIcon';
import * as Clipboard from 'expo-clipboard';
import { toast } from 'sonner-native';
import { useStore } from '@/lib/globalAnalyticAssistantStore';
import { expoFetchWithAuth, generateAPIUrl } from '@/lib/utils';
import { useAuth } from '@/context/supabase-provider';
import { AudioPlayer } from './AudioPlayer';

type Attachment = {
    name?: string;
    contentType: string;
    url: string; // "data:audio/wav;base64,...."
};

type Message = {
    id: string;
    role: "user" | "assistant" | "system" | "function" | "data" | "tool";
    content: string;
    toolInvocations?: any[];
    favorite?: boolean;
    bookmark?: boolean;
};

interface MessageItemProps {
    message: Message;
    themeClass: string;
    onUpdateAction: (messageId: string, actionType: 'favorite' | 'bookmark', currentValue: boolean) => void;
    onLayout: (event: any) => void;
}

const MessageItemComponent: React.FC<MessageItemProps> = ({ message, themeClass, onUpdateAction, onLayout }) => {
    const { session } = useAuth()

    const cleanMessageContent = (content: string, hasVisualization: boolean) => {
        if (!hasVisualization) return content

        // Remove common patterns that duplicate visualization data
        const cleanedContent = content
            .replace(/Here's.*?table.*?:/gi, "")
            .replace(/\|.*?\|.*?\|/g, "") // Remove table formatting
            .replace(/-{3,}/g, "") // Remove table separators
            .replace(/Product Name.*?Total Sales.*?\|/gi, "")
            .replace(/\|\s*\w+\s*\|\s*\d+\s*\|/g, "") // Remove table rows
            .replace(/Based on the data.*?here.*?:/gi, "")
            .replace(/The table shows.*?:/gi, "")
            .replace(/Here.*?chart.*?:/gi, "")
            .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up extra line breaks
            .trim()

        return content
    }

    const parseToolResults = (message: any) => {
        let chartConfig = null
        let tableData = null
        let hasVisualization = false

        if (message.toolInvocations) {
            for (const invocation of message.toolInvocations) {
                if (invocation.result) {
                    if (invocation.result.chartConfig) {
                        chartConfig = invocation.result.chartConfig
                        hasVisualization = true
                    }
                    if (invocation.result.tableData) {
                        tableData = invocation.result.tableData
                        hasVisualization = true
                    }
                }
            }
        }
        return { chartConfig, tableData, hasVisualization }
    }

    const { chartConfig, tableData, hasVisualization } = parseToolResults(message);
    const cleanedContent = cleanMessageContent(message.content, hasVisualization)

    const handleCopyMessage = async () => {
        await Clipboard.setStringAsync(message.content || '');
        toast.info("Message copied to clipboard");
    }

    return (
        <View onLayout={onLayout}>
            <View className={`${message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[95%] pl-0"}`}>
                {message.role !== "user" && (
                    <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                        <Text className="text-base">🤖</Text>
                    </View>
                )}
                {message.role === 'assistant' && message.toolInvocations?.map((tool) => (
                    <ToolStatusIndicator
                        key={tool.toolCallId}
                        toolName={tool.toolName}
                        state={tool.state ? tool.state === 'result' ? 'result' : 'loading' : 'result'}
                        result={tool.result}
                    />
                ))}
                <View className={`flex-1 rounded-lg  ${message.role === "user" ? "bg-muted/50 px-4" : " ml-4"}`}>
                    {((message as any)?.experimental_attachments || [])?.map((att: any, idx: any) =>
                        att.contentType.startsWith("audio/") ? (
                            <AudioPlayer key={idx} source={att.url} />
                        ) : null
                    )}

                    {(chartConfig || tableData) && (
                        <CardsMessage
                            m={message}
                            themeClass={themeClass}
                            chartConfig={chartConfig}
                            tableData={tableData}
                        />
                    )}

                    {message.content.length > 0 && (
                        <CustomMarkdown content={message.content} />
                    )}

                    {message.content.length > 0 && message.role !== "user" && <View className="flex flex-row items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={handleCopyMessage}
                            className="flex flex-row text-gray-500 hover:text-gray-700"
                        >
                            <LucideIcon name='Copy' className="w-4 h-4 mr-1 text-primary/60 text-sm" />
                            <Text className='text-primary/60 text-sm'>Copy</Text>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => { onUpdateAction(message.id, 'favorite', message.favorite || false) }}
                            className="group flex flex-row text-gray-500 hover:text-red-500"
                        >
                            <LucideIcon name='Heart' className={`w-4 h-4 mr-1 ${message.favorite || false ? 'text-red-500 fill-red-500' : 'text-primary/60'}`} />
                            <Text className={`${message.favorite || false ? 'text-red-500' : 'text-primary/60'} text-sm`}>Favorite</Text>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => { onUpdateAction(message.id, 'bookmark', message.bookmark || false) }}
                            className="flex flex-row text-gray-500 hover:text-blue-500"
                        >
                            <LucideIcon name="Bookmark" className={`w-4 h-4 mr-1 ${message.bookmark ? 'text-blue-500 fill-blue-500' : 'text-primary/60'}`} />
                            <Text className={`${message.bookmark ? 'text-blue-500' : 'text-primary/60'} text-sm`}>Bookmark</Text>
                        </Button>
                    </View>}
                </View>
            </View>
        </View>
    );
};

// Wrap the component in React.memo.
// We provide a custom comparison function that only checks the message ID and length of tool invocations.
// This prevents re-renders unless the message itself has fundamentally changed.
export const MessageItem = React.memo(MessageItemComponent, (prevProps, nextProps) => {
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.toolInvocations?.length === nextProps.message.toolInvocations?.length &&
        prevProps.message.favorite === nextProps.message.favorite &&
        prevProps.message.bookmark === nextProps.message.bookmark &&
        prevProps.themeClass === nextProps.themeClass
    );
});