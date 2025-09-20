import { create } from "zustand";
import { expoFetchWithAuth, generateAPIUrl } from "./utils";
import { Session } from "@supabase/supabase-js";

type ChatIdState = {
  id: string;
  from: "history" | "newChat";
} | null;

export type TokenUsage = {
  prompt: number;
  completion: number;
  total: number;
  cost: number;
} | null;

interface StoreState {
  scrollY: number;
  setScrollY: (value: number) => void;
  selectedImageUris: string[];
  addImageUri: (uri: string) => void;
  removeImageUri: (uri: string) => void;
  clearImageUris: () => void;
  setBottomChatHeightHandler: (value: boolean) => void;
  bottomChatHeightHandler: boolean;
  chatId: ChatIdState;
  setChatId: (value: { id: string; from: "history" | "newChat" }) => void;
  setFocusKeyboard: (value: boolean) => void;
  focusKeyboard: boolean;

  chats: any[]; // List of chats for the sidebar
  setChats: (chats: any[]) => void;
  addChat: (chat: any) => void; // To optimistically add new chats
  isChatsLoading: boolean;
  setIsChatsLoading: (isLoading: boolean) => void;

  getActiveChatTitle: () => string | null;
  fetchChats: (session: Session | null) => Promise<void>;
  removeChat: (chatId: string) => void;

  activeChatTokenUsage: TokenUsage;
  setActiveChatTokenUsage: (usage: TokenUsage) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  scrollY: 0,
  setScrollY: (value: number) => set({ scrollY: value }),
  selectedImageUris: [],
  addImageUri: (uri: string) =>
    set((state) => ({
      selectedImageUris: [...state.selectedImageUris, uri],
    })),
  removeImageUri: (uri: string) =>
    set((state) => ({
      selectedImageUris: state.selectedImageUris.filter(
        (imageUri) => imageUri !== uri,
      ),
    })),
  clearImageUris: () => set({ selectedImageUris: [] }),
  bottomChatHeightHandler: false,
  setBottomChatHeightHandler: (value: boolean) =>
    set({ bottomChatHeightHandler: value }),
  chatId: null,
  setChatId: (value) => set({ chatId: value }),
  focusKeyboard: false,
  setFocusKeyboard: (value: boolean) => set({ focusKeyboard: value }),

  chats: [],
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  isChatsLoading: false,
  setIsChatsLoading: (isLoading) => set({ isChatsLoading: isLoading }),

  getActiveChatTitle: () => {
    const { chatId, chats } = get();
    if (!chatId) return null;
    const chat = chats.find((c) => c.id === chatId.id);
    return chat?.title || null;
  },
  fetchChats: async (session: Session | null) => {
    console.log("hii")
    if (get().isChatsLoading) return; // Prevent multiple fetches
    set({ isChatsLoading: true });
    try {
      const res = await expoFetchWithAuth(session)(generateAPIUrl('/api/analyticassistant/chats'));
      const data = await res.json();
      if (res.ok) {
        set({ chats: data });
      } else {
        throw new Error('Failed to fetch chats');
      }
    } catch (e) {
      console.error("Failed to fetch chats from store", e);
      set({ chats: [] }); // Clear chats on error
    } finally {
      set({ isChatsLoading: false });
    }
  },
  removeChat: (chatId: string) =>
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
    })),

  activeChatTokenUsage: null,
  setActiveChatTokenUsage: (usage) => set({ activeChatTokenUsage: usage }),
}));