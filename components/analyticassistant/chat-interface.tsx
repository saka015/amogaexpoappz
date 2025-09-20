import { View, ScrollView, ActivityIndicator } from "react-native";

// import Markdown from "react-native-markdown-display";
import { CustomMarkdown } from "@/components/elements/markdown";
import { useKeyboard } from "@react-native-community/hooks";
import { Text } from "@/components/ui/text";
import { WelcomeMessage } from "./welcome-message";
import React, { forwardRef, useCallback, useRef, useState } from "react";
import { cn, expoFetchWithAuth, generateAPIUrl } from "@/lib/utils";
import ChartDisplay from "./chart-display";
import { DataTable } from "./data-table";
import { AlertTriangle, CheckCircle2 } from "lucide-react-native";
import { Tabs, TabsList, TabsTrigger } from "../elements/Tabs";
import { Card } from "../elements/Card";
import { CardsMessage } from "./cards-message";
import { MessageItem } from "./message-item";
import { handleApiError } from "@/lib/toast-utils";
import { useAuth } from "@/context/supabase-provider";
// import { LottieLoader } from "@/components/lottie-loader";

type ToolInvocation = {
  toolName: string;
  toolCallId: string;
  state: string;
  result?: any;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "function" | "data" | "tool";
  content: string;
  toolInvocations?: ToolInvocation[];
};

type ChatInterfaceProps = {
  messages: Message[];
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void
  scrollViewRef: React.RefObject<ScrollView>;
  isLoading?: boolean;
  requestStatus: "error" | "submitted" | "streaming" | "ready";
  themeClass: string;
  onMessageLayout: (messageId: string, layout: any) => void;
};

interface ToolStatusIndicatorProps {
  toolName: string;
  state: "loading" | "result";
  result?: any;
}

export const ChatInterface = forwardRef<ScrollView, ChatInterfaceProps>(
  ({ messages, setMessages, onMessageLayout, scrollViewRef, isLoading, requestStatus, themeClass }, ref) => {
    const { session } = useAuth()
    const domHeightsRef = useRef<Record<string, number>>({});
    const { keyboardShown, keyboardHeight } = useKeyboard();

    const handleUpdateAction = useCallback(async (
      messageId: string,
      actionType: 'favorite' | 'bookmark',
      currentValue: boolean
    ) => {
      const newValue = !currentValue;

      setMessages(currentMessages =>
        currentMessages.map(msg => {
          if (msg.id === messageId) {
            console.log("{ ...msg, [actionType]: newValue }", { ...msg, [actionType]: newValue })
            return { ...msg, [actionType]: newValue }
          }
          return msg
        }
        )
      );

      try {
        const res = await expoFetchWithAuth(session)(generateAPIUrl('/api/analyticassistant/messages/update-action'), {
          method: 'PATCH',
          body: JSON.stringify({ messageId, actionType, value: newValue }),
        });

        if (!res.ok) {
          console.error(`Failed to update ${actionType}`);
          handleApiError(`Failed to update ${actionType}.`);
          setMessages(currentMessages =>
            currentMessages.map(msg =>
              msg.id === messageId ? { ...msg, [actionType]: currentValue } : msg
            )
          );
        }
      } catch (error) {
        console.error(`Error in handleUpdateAction for ${actionType}:`, error);
        setMessages(currentMessages =>
          currentMessages.map(msg =>
            msg.id === messageId ? { ...msg, [actionType]: currentValue } : msg
          )
        );
      }
    }, [session, setMessages]);

    return (
      <View className="flex-1">
        <ScrollView
          ref={ref}
          className="flex-1 space-y-4 p-4"
        >
          {(!messages.length && requestStatus !== "submitted" && requestStatus !== "streaming") && <WelcomeMessage />}
          {messages.length > 0
            ? messages.map((m, index) => {
              return <MessageItem
                key={m.id}
                message={m}
                themeClass={themeClass} onUpdateAction={handleUpdateAction}
                onLayout={(event) => onMessageLayout(m.id, event.nativeEvent.layout)}
              />
            })
            : null}
        </ScrollView>
      </View>
    );
  },
);

const friendlyToolNames: Record<string, string> = {
  getOrders: "Fetching Orders",
  getProducts: "Fetching Products",
  getCustomers: "Fetching Customers",
  getStoreOverview: "Analyzing Store Overview",
  getProductPerformance: "Analyzing Product Performance",
  getData: "Accessing API Data",
  createChart: "Generating Chart",
  createTable: "Generating Table",
};

const formatToolName = (camelCaseName: string): string => {
  if (!camelCaseName) return "Unnamed Tool";

  // 1. Add a space before each uppercase letter
  const withSpaces = camelCaseName.replace(/([A-Z])/g, ' $1');

  // 2. Capitalize the first letter and trim any leading space
  const titleCase = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);

  return titleCase.trim();
};

export function ToolStatusIndicator({ toolName, state, result }: ToolStatusIndicatorProps) {
  const displayName = friendlyToolNames[toolName] || `Running ${toolName}`;
  const isError = result && result.success === false;

  if (state === "loading") {
    return (
      <View className="flex-row items-center rounded-lg bg-muted/50 p-3 my-2 self-start ml-4">
        <ActivityIndicator size="small" color="#6b7280" />
        <Text className="text-sm font-medium text-gray-600 ml-3">{displayName}...</Text>
      </View>
    );
  }

  // Once we have a result, we can show a success or error state
  if (state === "result") {
    // We don't want to show anything for successful visualization tools, as the chart/table itself is the result.
    if ((toolName === 'createChart' || toolName === 'createTable') && !isError) {
      return null;
    }

    return (
      <View
        className={cn(
          "flex-row items-center rounded-lg p-3 mt-2 self-start ml-4",
          isError ? "bg-red-100" : "bg-card"
        )}
      >
        {isError ? (
          <AlertTriangle size={16} color="#dc2626" />
        ) : (
          <CheckCircle2 size={16} color="#16a34a" />
        )}
        <View className="ml-3">
          <Text
            className={cn(
              "text-sm font-semibold",
              isError ? "text-red-700" : "text-green-700"
            )}
          >
            {displayName} {isError ? "Failed" : "Complete"}
          </Text>
          {isError && result.error && (
            <Text className="text-xs text-red-600 mt-1 max-w-xs">{result.error}</Text>
          )}
        </View>
      </View>
    );
  }

  return null;
}
