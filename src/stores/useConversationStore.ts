import { create } from 'zustand';

interface ConversationState {
  chatMessages: any[];
  isAssistantLoading: boolean;
  addConversationItem: (message: any) => void;
  addChatMessage: (item: any) => void;
  setAssistantLoading: (loading: boolean) => void;
}

const useConversationStore = create<ConversationState>((set) => ({
  chatMessages: [],
  isAssistantLoading: false,
  addConversationItem: (message) => 
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  addChatMessage: (item) => 
    set((state) => ({ chatMessages: [...state.chatMessages, item] })),
  setAssistantLoading: (loading) => 
    set(() => ({ isAssistantLoading: loading })),
}));

export default useConversationStore;