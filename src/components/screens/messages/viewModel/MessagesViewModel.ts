// src/components/screens/messages/viewModel/MessagesViewModel.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

import { useMessageViewModel } from "./MessageViewModel";
import { useConversationViewModel } from "./ConversationViewModel";
import { useConversationDetailViewModel } from "./ConversationDetailViewModel";

import { useWebSocket } from "@/context/socket/useSocket";

export const useMessagesViewModel = () => {
  const messageViewModel = useMessageViewModel();
  const conversationViewModel = useConversationViewModel();
  const conversationDetailViewModel = useConversationDetailViewModel();
  const { socketMessages } = useWebSocket();
  
  // Ref để theo dõi tin nhắn đã xử lý từ websocket
  const processedSocketMessagesRef = useRef<Set<string>>(new Set());

  const { 
    messages, messagesLoading, messageText, setMessageText,
    isMessagesEnd, messageListRef, initialMessagesLoaded,
    currentConversationId,
    fetchMessages, sendMessage, deleteMessage, loadMoreMessages,
    handleScroll, getMessagesForConversation, addMessageListener,
    addNewMessage,
  } = messageViewModel;

  const {
    conversations, currentConversation, conversationsLoading, 
    searchText, setSearchText, setCurrentConversation,
    fetchConversations, createConversation, updateConversation, 
    deleteConversation, addNewConversation, updateConversationOrder,
    unreadMessageCounts, incrementUnreadCount, resetUnreadCount
  } = conversationViewModel;

  const {
    existingMembersLoading, markConversationAsRead,
    addConversationMembers, leaveConversation, fetchConversationMembers
  } = conversationDetailViewModel;

  const [existingMembers, setExistingMembers] = useState<FriendResponseModel[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);

  // Xử lý khi chọn conversation
  useEffect(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id, 1, false);
    }
  }, [currentConversation?.id, fetchMessages]);

  // Đăng ký message listener
  useEffect(() => {
    const unsubscribe = addMessageListener((conversationId, updatedMessages) => {
      // Xử lý khi có cập nhật từ message view model
      if (currentConversation?.id === conversationId) {
        // Có thể thêm xử lý đặc biệt ở đây nếu cần
      }
    });
    
    return unsubscribe;
  }, [currentConversation?.id, addMessageListener]);

  // Xử lý tin nhắn từ websocket
  useEffect(() => {
    if (!socketMessages.length) return;
  
    const latestMessage = socketMessages[0];
    if (!latestMessage || !latestMessage.conversation_id) return;
    
    // Tạo ID duy nhất cho tin nhắn
    const messageUniqueId = `${latestMessage.conversation_id}-${latestMessage.user_id}-${latestMessage.content}-${latestMessage.created_at}`;
    
    // Kiểm tra nếu đã xử lý
    if (processedSocketMessagesRef.current.has(messageUniqueId)) {
      console.log("Duplicate websocket message ignored", latestMessage);
      return;
    }
    
    // Đánh dấu đã xử lý
    processedSocketMessagesRef.current.add(messageUniqueId);
    
    // Giới hạn kích thước cache
    if (processedSocketMessagesRef.current.size > 300) {
      const oldestEntries = Array.from(processedSocketMessagesRef.current).slice(0, 100);
      oldestEntries.forEach(id => processedSocketMessagesRef.current.delete(id));
    }
    
    // Kiểm tra trùng lặp trong messages hiện tại  
    const isDuplicate = messages.some(m => 
      (m.id && m.id === latestMessage.id) || 
      (m.content === latestMessage.content && 
       m.user_id === latestMessage.user_id && 
       Math.abs(new Date(m.created_at || "").getTime() - 
             new Date(latestMessage.created_at || "").getTime()) < 5000)
    );
    
    if (isDuplicate) {
      console.log("Duplicate message detected in current messages", latestMessage);
      return;
    }
  
    const messageModel: MessageResponseModel = {
      ...latestMessage,
      id: latestMessage.id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fromServer: true
    };
  
    // Thêm vào conversation
    addNewMessage(latestMessage.conversation_id, messageModel);
    
    // Cập nhật thứ tự conversation
    updateConversationOrder(latestMessage.conversation_id);
  
    // Xử lý theo trạng thái hiện tại
    if (currentConversation?.id === latestMessage.conversation_id) {
      setTimeout(() => {
        messageViewModel.scrollToBottom();
        markConversationAsRead(latestMessage.conversation_id);
      }, 100);
    } else {
      incrementUnreadCount(latestMessage.conversation_id);
    }
  }, [socketMessages, currentConversation?.id, messages, markConversationAsRead, addNewMessage, updateConversationOrder, incrementUnreadCount, messageViewModel.scrollToBottom]);

  // Lắng nghe sự kiện conversation mới
  useEffect(() => {
    const handleNewConversation = (event: CustomEvent) => {
      if (event.detail) {
        addNewConversation(event.detail);
      }
    };
    
    window.addEventListener('new_conversation', handleNewConversation as EventListener);
    
    return () => {
      window.removeEventListener('new_conversation', handleNewConversation as EventListener);
    };
  }, [addNewConversation]);

  // Đánh dấu conversation đã đọc khi chuyển đến
  useEffect(() => {
    if (currentConversation?.id) {
      markConversationAsRead(currentConversation.id);
      resetUnreadCount(currentConversation.id);
    }
  }, [currentConversation?.id, markConversationAsRead, resetUnreadCount]);

  // Fetch thành viên của conversation
  const fetchExistingMembers = useCallback(async (conversationId: string) => {
    const members = await fetchConversationMembers(conversationId);
    const memberIds = members.map(member => member.id || '');
    
    setExistingMembers(members);
    setExistingMemberIds(memberIds);
    
    return { members, memberIds };
  }, [fetchConversationMembers]);

  // Xử lý khi chọn conversation
  const handleSelectConversation = useCallback((conversation: ConversationResponseModel) => {
    if (currentConversation?.id === conversation.id) {
      return;
    }
  
    setCurrentConversation(conversation);
  
    if (conversation.id) {
      markConversationAsRead(conversation.id);
      resetUnreadCount(conversation.id);
      
      fetchMessages(conversation.id);
    }
  }, [currentConversation?.id, setCurrentConversation, markConversationAsRead, resetUnreadCount, fetchMessages]);

  // Gửi tin nhắn
  const handleSendMessage = useCallback(() => {
    if (!currentConversation?.id) return;
    return sendMessage();
  }, [currentConversation?.id, sendMessage]);

// Load thêm tin nhắn
const handleLoadMoreMessages = useCallback(() => {
  if (!currentConversation?.id) return;
  return loadMoreMessages();
}, [currentConversation?.id, loadMoreMessages]);

// Xử lý scroll
const handleScrollMessages = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  if (!currentConversation?.id) return;
  
  handleScroll(e);
  
  if (!messagesLoading) {
    markConversationAsRead(currentConversation.id);
  }
}, [currentConversation?.id, handleScroll, messagesLoading, markConversationAsRead]);

// Cleanup khi component unmount
useEffect(() => {
  return () => {
    // Reset các cache và state để tránh memory leak
    processedSocketMessagesRef.current.clear();
    setExistingMembers([]);
    setExistingMemberIds([]);
  };
}, []);

return {
  // State
  messages,
  messagesLoading,
  messageText,
  isMessagesEnd,
  messageListRef,
  initialMessagesLoaded,
  conversations,
  currentConversation,
  conversationsLoading,
  searchText,
  existingMembers,
  existingMemberIds,
  
  // Setters
  setSearchText,
  setMessageText,
  setCurrentConversation,

  // Actions
  fetchConversations,
  fetchMessages,
  sendMessage: handleSendMessage,
  deleteMessage,
  createConversation,
  updateConversation,
  deleteConversation,
  markConversationAsRead,
  loadMoreMessages: handleLoadMoreMessages,
  handleScroll: handleScrollMessages,
  addConversationMembers,
  leaveConversation,
  fetchExistingMembers,
  getMessagesForConversation,
  handleSelectConversation,
  unreadMessageCounts,
  resetUnreadCount,
};
};