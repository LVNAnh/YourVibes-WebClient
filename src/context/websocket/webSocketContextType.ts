import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";

export interface WebSocketContextType {
  isConnected: boolean;
  lastMessages: Record<string, MessageResponseModel[]>;
  unreadMessages: Record<string, number>;
  sendMessage: (message: any) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  markMessagesAsRead: (conversationId: string) => void;
  updateMessagesForConversation: (conversationId: string, messages: MessageResponseModel[]) => void;
  getMessagesForConversation: (conversationId: string) => MessageResponseModel[];
  resetUnreadCount: (conversationId: string) => void;
  addNewMessage: (conversationId: string, message: MessageResponseModel) => void;
  updateConversations: (conversations: ConversationResponseModel[]) => void;
  getConversations: () => ConversationResponseModel[];
  conversations: ConversationResponseModel[];
}