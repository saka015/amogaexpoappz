import * as Crypto from 'expo-crypto';
import { Redirect, Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, type TextInput, View, ScrollView, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetch } from "expo/fetch";

import { ChatInterface } from "@/components/analyticassistant/chat-interface";
import { ChatInput } from "@/components/analyticassistant/chat-input";
// import { SuggestedActions } from "@/components/suggested-actions";
import type { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useStore } from "@/lib/globalAnalyticAssistantStore";
import { MessageCirclePlusIcon, Menu, RefreshCw } from "lucide-react-native";
import { Message } from "ai/react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/context/supabase-provider';
import { expoFetchWithAuth, generateAPIUrl } from '@/lib/utils';
import { Text } from '@/components/elements/Text';
import { useTheme } from '@/context/theme-context';
import { LottieLoader } from '@/components/lottie-loader';
import LucideIcon from '@/components/LucideIcon';
import { useDialogStore } from '@/store/dialogStore';
import { SuggestedActions } from '@/components/analyticassistant/suggested-actions';
import { useHeader } from '@/context/header-context';
import { HistoryList } from '@/components/analyticassistant/HistoryList';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/elements/popover';
import { MarkedMessageList } from '@/components/analyticassistant/MarkedMessageList';
import { TokenUsageDisplay } from '@/components/analyticassistant/TokenUsageDisplay';
import { Button } from '@/components/elements/Button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { PromptList } from '@/components/analyticassistant/PromptList';
import { useFocusEffect } from 'expo-router';

type DrawerParamList = {
  'analyticassistant/[id]': { id: string } | undefined;
};


type WeatherResult = {
  city: string;
  temperature: number;
  weatherCode: string;
  humidity: number;
  wind: number;
};

const AnalyticAssistant = () => {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const { session, storeSettings, isFetchingStoreSettings } = useAuth()
  const { themeClass } = useTheme()
  const inputRef = useRef<TextInput>(null);

  const {
    clearImageUris,
    setBottomChatHeightHandler,
    setFocusKeyboard,
    chatId,
    setChatId,
    fetchChats,
    getActiveChatTitle,
    removeChat,
    setActiveChatTokenUsage,
    chats,
  } = useStore();
  const { setTitle, setShowBack, setShow } = useHeader();

  const showDialog = useDialogStore((s) => s.showDialog);

  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>()
  const [chatTitle, setChatTitle] = useState<string | null>("")
  const [settings, setSettings] = useState<any>()
  const [newChatId, setNewChatId] = useState("")
  const newChatIdRef = useRef("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  const router = useRouter()

  useEffect(() => {
    if (isFetchingStoreSettings) return
    if (!storeSettings?.ai?.provider && !storeSettings?.ai?.apiKey) {
      showDialog({
        title: 'Configure AI Settings',
        description: 'Please set up your AI provider and API key in the settings.',
        showCancel: false,
        actions: [
          {
            label: 'Go to Settings',
            variant: 'default',
            onPress: () => {
              router.push('/store-settings');
            },
          }
        ],
      })
    } else if (!storeSettings?.woocommerce?.url || !storeSettings?.woocommerce?.consumerKey || !storeSettings?.woocommerce?.consumerSecret) {
      showDialog({
        title: 'Configure WooCommerce Settings',
        description: 'Please set up your WooCommerce URL, Consumer Key, and Consumer Secret in the settings.',
        showCancel: false,
        actions: [
          {
            label: 'Go to Settings',
            variant: 'default',
            onPress: () => {
              router.push('/store-settings');
            },
          }
        ],
      })
    } else {
      setSettings(
        {
          provider: storeSettings?.ai?.provider || "google",
          model: storeSettings?.ai?.model || "gemini-2.5-flash",
          providerKey: storeSettings?.ai?.apiKey,
          wooCommerceUrl: storeSettings?.woocommerce?.url,
          consumerKey: storeSettings?.woocommerce?.consumerKey,
          consumerSecret: storeSettings?.woocommerce?.consumerSecret
        }
      )
    }

    if (routeId === "new") {
      setNewChatId(Crypto.randomUUID())
    }
  }, [storeSettings, isFetchingStoreSettings]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isAiLoading,
    status,
    setMessages,
    append,
    error,
    reload,
    stop
  } = useChat({
    body: {
      // chatId: chatId?.id,
      chatId: (newChatIdRef.current || chatId?.id || newChatId || routeId),
      settings
    },
    maxSteps: 25,
    key: chatId?.id,
    id: chatId?.id,
    api: generateAPIUrl('/api/analyticassistant/chat'),
    onFinish: async (message, { finishReason }) => {
      scrollViewRef.current?.scrollToEnd({ animated: true });

      console.log("message", message, finishReason)
      // const lastMessage = messages[messages.length - 1];
      // const shouldContinue =
      //   (lastMessage?.role === 'assistant' && lastMessage.toolInvocations && lastMessage.toolInvocations.length > 0) ||
      //   lastMessage?.role === 'tool';
      // console.log("lastMessage", lastMessage, "shouldContinue", shouldContinue)

      if (message && finishReason === "stop") {
        console.log("routeId", routeId, "chatId", chatId, "currentChatId", currentChatId, "newChatId", newChatId, "newChatIdRef", newChatIdRef.current)
        // if (routeId === "new" && (chatId?.id || currentChatId || newChatId)) {
        //   router.replace(`/analyticassistant/${(chatId?.id || currentChatId || newChatId)}`);
        // }
        const messagesToSave = [{
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          parts: message.parts,
          role: message.role,
          toolInvocations: message.toolInvocations,
          created_user_id: (session?.user as any).user_id,
          // chatId: (routeId && routeId !== "new" ? routeId : (chatId?.id || currentChatId || newChatId))
          // chatId:  (newChatIdRef.current || chatId?.id || routeId || newChatId)
          chatId: (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))
        }]
        console.log("messageToSave", messagesToSave)
        try {
          await expoFetchWithAuth(session)(generateAPIUrl('/api/analyticassistant/save-messages'), {
            method: 'POST',
            body: JSON.stringify({
              messagesToSave
            }),
          });
        } catch (e) {
          console.error("Failed to save assistant messages:", e);
        }

        generateSuggestions(messages).then(() => scrollViewRef.current?.scrollToEnd({ animated: true }))
        fetchChats(session)
      }

      setIsFirstMessage(false)
    },
    fetch: expoFetchWithAuth(session),
    onError(error) {
      console.log(">> error is", error.message);
    },
  });

  const [activePopover, setActivePopover] = useState<'history' | 'bookmarks' | 'favorites' | 'tokens' | 'prompts' | null>(null);
  const isPopoverOpen = activePopover !== null;

  useEffect(() => {
    const CID = (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))
    if (CID) {
      const currentChatData = chats.find(c => c.id === CID);
      if (currentChatData) {
        setActiveChatTokenUsage({
          prompt: currentChatData.prompt_tokens || 0,
          completion: currentChatData.completion_tokens || 0,
          total: currentChatData.total_tokens || 0,
          cost: currentChatData.token_cost || 0,
        });
      } else {
        setActiveChatTokenUsage(null);
      }
    } else {
      setActiveChatTokenUsage(null);
    }
  }, [chatId, chats, setActiveChatTokenUsage]);

  const bookmarkedMessages = useMemo(
    () => messages.filter(m => m.role === 'assistant' && (m as any).bookmark),
    [messages]
  );

  const favoritedMessages = useMemo(
    () => messages.filter(m => m.role === 'assistant' && (m as any).favorite),
    [messages]
  );

  const popoverTriggerRef = useRef<React.ElementRef<typeof PopoverTrigger>>(null); // <-- The ref for our trigger

  const handlePopoverOpen = (type: 'history' | 'bookmarks' | 'favorites' | 'tokens' | 'prompts') => {
    // 1. Set the state to determine WHAT content to show
    setActivePopover(type);
    // 2. Imperatively open the popover using the ref
    popoverTriggerRef.current?.open();
  };

  const handlePromptSelect = (promptText: string) => {
    // Use handleInputChange to update the text input's value
    // handleInputChange({ target: { value: promptText } } as any);
    handleTextSubmitLogic(promptText)
    // Close the popover
    popoverTriggerRef.current?.close();
  };

  useEffect(() => {
    fetchChats(session)
  }, [session])

  useEffect(() => {
    // If an ID comes from the URL, that is our source of truth.
    const CID = (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))
    if (CID && routeId !== "new") {
      if (routeId !== CID || messages.length < 1) {
        setChatId({ id: CID, from: 'history' });
        loadMessagesForChat(CID);
      }
      setIsFirstMessage(false);
    } else {
      // No ID from the URL means it's a new chat.
      setChatId(null as any); // Set to null
      // Manually set the welcome message for a new chat
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "🚀 Ready to analyze your WooCommerce data! ...",
        },
      ]);
      setIsFirstMessage(true);
    }
  }, [routeId]);

  useEffect(() => {
    setTitle("Analytic Assistant");
    setShowBack(false);
    setShow(false)
    return () => {
      setTitle("");
      setShowBack(false);
      setShow(true);
    };
    // eslint-disable-next-line
  }, [setTitle, setShowBack, router]);

  useFocusEffect(
    useCallback(() => {
      setTitle("Analytic Assistant");
      setShowBack(false);
    }, [setTitle, setShowBack])
  );

  useEffect(() => {
    setChatTitle(getActiveChatTitle())
  }, [getActiveChatTitle, chatId, chats])

  // Function to load messages for a specific chat
  const loadMessagesForChat = useCallback(async (id: string) => {
    setIsMessagesLoading(true);
    setMessages([]);
    try {
      const res = await expoFetchWithAuth(session)(generateAPIUrl(`/api/analyticassistant/messages?chatId=${id}`));
      const historicalMessages = await res.json();
      if (res.ok) {
        setMessages(historicalMessages);
      } else {
        throw new Error(historicalMessages.error || 'Failed to fetch messages');
      }
    } catch (e: any) {
      console.error("Failed to load messages:", e);
      // Show an error to the user
    } finally {
      setIsMessagesLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [session, setMessages]);

  const generateSuggestions = useCallback(async (conversationHistory: Message[]) => {
    setIsSuggestionsLoading(true);
    setSuggestions([]);
    try {
      const res = await expoFetchWithAuth(session)(generateAPIUrl('/api/analyticassistant/generate-suggestions'), {
        method: 'POST',
        body: JSON.stringify({
          messages: conversationHistory,
          settings: settings,
          chatId: (routeId && routeId !== "new" ? routeId : (chatId?.id || currentChatId || newChatId))
        }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [session, settings]);

  const handleSubmitLogic = () => {
    const CID = (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))
    const submissionChatId = (chatId?.id && chatId?.id !== "new") ? CID : newChatId;

    console.log("hii", CID, "submissionChatId", submissionChatId)
    if (!chatId && submissionChatId) {
      console.log("changeto submissionChatId", submissionChatId)
      router.replace(`/analyticassistant/${submissionChatId}`);
      setChatId({ id: submissionChatId, from: 'newChat' });
    }
    setCurrentChatId(submissionChatId)
    setSuggestions([])

    // The user message is already in the `messages` array via `useChat`
    // We just need to ensure the correct ID is sent.
    handleSubmit(undefined, {
      body: {
        chatId: submissionChatId || CID,
        settings
      }
    });
  };

  const handleNewChat = useCallback(() => {
    stop();
    setMessages([])
    setChatId(null as any)
    router.push('/analyticassistant/new');
  }, [clearImageUris, setBottomChatHeightHandler, setMessages, setChatId]);

  const handleTextChange = (text: string) => {
    handleInputChange({
      target: { value: text },
    } as any);
  };

  const handleRetry = useCallback(async () => {
    // The `reload` function from `useChat` is the easiest way to retry the last turn.
    // It automatically handles resending the last user message.
    console.log("reload")
    await reload();
  }, [reload]);

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestions([]); // Clear suggestions once one is clicked
    append({
      role: 'user',
      content: suggestion,
    });
    scrollViewRef.current?.scrollToEnd({ animated: true })
  };

  const { bottom } = useSafeAreaInsets();
  const scrollViewRef = useRef<GHScrollView>(null);

  const messageLayouts = useRef<Record<string, { y: number }>>({});

  // --- NEW: Handler to store the layout when a message renders ---
  const handleMessageLayout = useCallback((messageId: string, layout: { y: number }) => {
    messageLayouts.current[messageId] = layout;
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const layout = messageLayouts.current[messageId];

    if (layout && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: layout.y, animated: true });
      }, 100);
    } else {
      console.warn(`Layout for message ${messageId} not found. Cannot scroll.`);
    }
  }, []);

  useEffect(() => {
    if (chatId?.from === 'history' && routeId !== "new" && chatId.id && chatId.id !== newChatId) {
      loadMessagesForChat(chatId.id);
    } else {
      setMessages([]);
    }
  }, [chatId, loadMessagesForChat, setMessages]);

  const showLoadingOverlay = isMessagesLoading;
  const showAiThinking = (status === "streaming" || status === "submitted");

  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  const confirmDeleteChat = async (id: string) => {
    try {
      const res = await expoFetchWithAuth(session)(
        generateAPIUrl(`/api/analyticassistant/chats?id=${id}`),
        { method: 'DELETE' }
      );
      if (res.ok) {
        removeChat(id);
        if (chatId?.id === id) {
          router.push('/analyticassistant/new');
        }
      } else {
        const errorData = await res.json();
        console.warn("Delete error:", errorData);
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handelChatHistoryDelete = (id: string, title: string) => {
    showDialog({
      title: 'Delete Chat',
      description: `Are you sure you want to delete '${chatId?.id === id ? 'this chat' : title}' This action cannot be undone.`,
      showCancel: true,
      actions: [
        {
          label: 'Delete',
          variant: 'default',
          onPress: () => {
            confirmDeleteChat(id)
          },
        }
      ],
    })
  }

  // Handler to start a new chat with the first message of a selected chat
  const handleChatHistoryRefresh = async (id: string) => {
    try {
      const res = await expoFetchWithAuth(session)(generateAPIUrl(`/api/analyticassistant/messages?chatId=${id}`));
      const messages = await res.json();
      if (res.ok && Array.isArray(messages) && messages.length > 0) {
        const firstMessage = messages[0];
        const newId = Crypto.randomUUID();
        console.log("newId", newId)
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: "🚀 Ready to analyze your WooCommerce data! ...",
          }
        ]);
        setChatId({ id: newId, from: 'newChat' });
        setNewChatId(newId);
        newChatIdRef.current = newId;
        handlePopoverOpen(null as any)
        router.push(`/analyticassistant/${newId}`);

        setTimeout(() => {
          append({
            role: "user",
            content: firstMessage.content,
          }, {
            body: {
              chatId: newId,
              settings
            }
          });
          setChatId({ id: newId, from: 'newChat' });
          setNewChatId(newId);
          newChatIdRef.current = newId; // <-- update ref
        }, 300);
      }
    } catch (e) {
      console.error("Failed to refresh chat:", e);
    }
  };

  const handleUnmarkMessage = useCallback((messageId: string, type: 'bookmark' | 'favorite') => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, [type]: false } : msg
      )
    );
  }, [setMessages]);

  const handleScrollToMessageAndClosePopover = useCallback((messageId: string) => {
    handleScrollToMessage(messageId);
    setActivePopover(null);
  }, [handleScrollToMessage]);

  const handleItemSelectAndClose = (callback: () => void) => {
    callback();
    popoverTriggerRef.current?.close();
  };

  // Handler for clicking a favorite message: send its content as a new user message
  const handleFavoriteMessageClick = useCallback((id: string) => {
    const msg = messages.find(m => m.id === id);
    if (msg) {
      append({
        role: "user",
        content: msg.content,
      });
    }

    setActivePopover(null);
  }, [messages, append]);

  const handleAudioSubmit = (audioBase64: string, mimeType: string) => {
    const submissionChatId = (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))

    append({
      role: "user",
      content: input || "",
    },
      {
        experimental_attachments: [
          {
            name: "voice_prompt.wav",
            contentType: mimeType,
            url: `data:${mimeType};base64,${audioBase64}`,
          },
        ],
        body: {
          chatId: submissionChatId,
          settings
        }
      },
    );

    handleInputChange({
      target: { value: '' },
    } as any);

    if (!chatId) {
      router.replace(`/analyticassistant/${submissionChatId}`);
      setChatId({ id: submissionChatId, from: 'newChat' });
    }
    setCurrentChatId(submissionChatId)
  };

  const handleTextSubmitLogic = (message: string) => {
    const submissionChatId = (routeId && routeId !== "new" ? routeId : (newChatIdRef.current || chatId?.id || newChatId))
    setSuggestions([])
    append(
      {
        role: "user",
        content: message,
      }, {
      body: {
        chatId: submissionChatId,
        settings
      }
    });

    handleInputChange({
      target: { value: '' },
    } as any);

    if (!chatId) {
      router.replace(`/analyticassistant/${submissionChatId}`);
      setChatId({ id: submissionChatId, from: 'newChat' });
    }
    setCurrentChatId(submissionChatId)
  };

  const errorMessage = useMemo(() => {
    if (!error || !error.message) return ""
    if (error.message.includes("exceeded your current quota")) return "You exceeded your current quota"
    if (error.message.includes("overloaded")) return "The model is overloaded. Please try again later."

    return "I tried to get the response But there is issue on query to get result. try again."
  }, [error])

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      className="flex-1 bg-background"
      style={{ paddingBottom: bottom }}
    >
      <View className="flex-row w-full items-center justify-between p-2 py-4 border-b bg-background">
        <View className="flex-1 flex-row items-center mr-4">
          <Button size="sm" variant="ghost" onPress={() => {
            router.push("/")
            setShow(true);
          }}>
            <LucideIcon name="ArrowLeft" size={16} className="text-foreground" />
          </Button>
          <LucideIcon name="Bot" size={16} className="text-foreground" />
          <Text
            className="ml-2 text-base font-semibold text-foreground flex-shrink"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {chatTitle || 'Analytic Assistant'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Popover
          >
            <View className='flex flex-row items-center'>
              <Pressable onPress={() => handlePopoverOpen('tokens')} className="mr-3">
                <LucideIcon name="Coins" size={16} className="text-primary" />
              </Pressable>
              <Pressable onPress={() => handlePopoverOpen('history')} className="mr-3">
                <LucideIcon name="History" size={16} className="text-primary" />
              </Pressable>
              <PopoverTrigger ref={popoverTriggerRef} asChild>
                <View />
              </PopoverTrigger>
              <Pressable onPress={() => handlePopoverOpen('bookmarks')} className="mr-3">
                <LucideIcon name="Bookmark" size={16} className="text-primary" />
              </Pressable>
              <Pressable onPress={() => handlePopoverOpen('favorites')} className="mr-3">
                <LucideIcon name="Heart" size={16} className="text-primary" />
              </Pressable>
              <Pressable onPress={() => handlePopoverOpen('prompts')} className="mr-3">
                <LucideIcon name="Sparkles" size={16} className="text-primary" />
              </Pressable>
              <Pressable onPress={handleNewChat} className="mr-2">
                <LucideIcon name="MessageCirclePlus" size={16} className="text-primary" />
              </Pressable>
            </View>
            <PopoverContent
              side='bottom'
              insets={contentInsets}
              style={styles.popoverContent}
              className='p-0 flex flex-col'
            >
              {activePopover === 'tokens' && <TokenUsageDisplay />}
              {activePopover === 'history' && (
                <HistoryList
                  onItemPress={(chatId) => {
                    handleItemSelectAndClose(() => router.push(`/analyticassistant/${chatId}`))
                  }}
                  onItemDelete={handelChatHistoryDelete}
                  onItemRefresh={handleChatHistoryRefresh}
                />
              )}
              {activePopover === 'bookmarks' && (
                <MarkedMessageList
                  messages={bookmarkedMessages}
                  onMessagePress={(id) => handleItemSelectAndClose(() => handleScrollToMessageAndClosePopover(id))}
                  onMessageUnmark={(id) => handleUnmarkMessage(id, 'bookmark')}
                  emptyStateText="No bookmarked messages."
                />
              )}
              {activePopover === 'favorites' && (
                <MarkedMessageList
                  messages={favoritedMessages}
                  onMessagePress={handleFavoriteMessageClick}
                  onMessageUnmark={(id) => handleUnmarkMessage(id, 'favorite')}
                  emptyStateText="No favorited messages."
                />
              )}
              {activePopover === 'prompts' && (
                <PromptList onSelectPrompt={handlePromptSelect} />
              )}
            </PopoverContent>
          </Popover>
        </View>
      </View>
      <ScrollView
        className="container relative mx-auto flex-1 bg-background"
        ref={scrollViewRef}
      >
        {showLoadingOverlay ? (
          <View className="flex-1 justify-center items-center">
            <LottieLoader />
            <Text>Loading chat...</Text>
          </View>
        ) : (
          <ChatInterface
            messages={messages}
            setMessages={setMessages as any}
            scrollViewRef={scrollViewRef as any}
            isLoading={isAiLoading}
            requestStatus={status}
            themeClass={themeClass}
            onMessageLayout={handleMessageLayout}
          />
        )}

        {error && (
          <View className="flex-row items-center self-center justify-center space-x-3 rounded-lg bg-red-100 p-3 my-4 mx-4">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-red-700">Request Failed</Text>
              <Text className="text-xs text-red-600 mt-1">
                {/* A user-friendly message */}
                {/* There was an issue processing your request. {error.message && ` : ${error.message}`} */}
                {errorMessage}
              </Text>
            </View>
            <Pressable onPress={handleRetry} className="bg-red-600 p-2 rounded-full">
              <RefreshCw size={16} color="white" />
            </Pressable>
          </View>
        )}
        {showAiThinking &&
          <View className="flex-row px-4 items-center">
            <View
              className={
                "mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full bg-gray-200"
              }
            >
              <Text className="text-base">{"🤖"}</Text>
            </View>
            <View className="-ml-2">
              {/* <LottieLoader width={40} height={40} /> */}
              <Text className="text-base ml-2 ">Waiting for response</Text>
            </View>
          </View>
        }
        <SuggestedActions
          suggestions={suggestions}
          isLoading={isSuggestionsLoading}
          onSuggestionClick={handleSuggestionClick}
        />
      </ScrollView>

      {/* {messages.length === 0 && (
        <SuggestedActions hasInput={input.length > 0} append={append} />
      )} */}

      <ChatInput
        ref={inputRef}
        scrollViewRef={scrollViewRef as any}
        input={input}
        onChangeText={handleTextChange}
        focusOnMount={false}
        requestStatus={status}
        onSubmit={() => {
          if (!input) return;
          handleSubmitLogic();
        }}
        handleAudioSubmit={handleAudioSubmit}
        handleTextSubmitLogic={handleTextSubmitLogic}
        settings={settings}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  popoverContent: {
    borderRadius: 12,
    width: 320,
    maxHeight: 400,
    // flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        overflow: 'hidden',
      },
      android: {
        elevation: 8,
        overflow: 'hidden',
      },
      web: {
        overflow: 'visible'
      }
    }),
  },
});

export default AnalyticAssistant;