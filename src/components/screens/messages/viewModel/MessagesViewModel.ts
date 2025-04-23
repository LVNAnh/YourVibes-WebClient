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

  useEffect(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id, 1, false);
    }
  }, [currentConversation?.id, fetchMessages]);

  useEffect(() => {
    const unsubscribe = addMessageListener((conversationId, updatedMessages) => {
      if (currentConversation?.id === conversationId) {
      }
    });
    
    return unsubscribe;
  }, [currentConversation?.id, addMessageListener]);

  useEffect(() => {
    if (!socketMessages.length) return;
  
    const latestMessage = socketMessages[0];
    if (!latestMessage || !latestMessage.conversation_id) return;
    
    const messageUniqueId = `${latestMessage.conversation_id}-${latestMessage.user_id}-${latestMessage.content}-${latestMessage.created_at}`;
    
    if (processedSocketMessagesRef.current.has(messageUniqueId)) {
      return;
    }
    
    processedSocketMessagesRef.current.add(messageUniqueId);
    
    if (processedSocketMessagesRef.current.size > 300) {
      const oldestEntries = Array.from(processedSocketMessagesRef.current).slice(0, 100);
      oldestEntries.forEach(id => processedSocketMessagesRef.current.delete(id));
    }
    
    const isDuplicate = messages.some(m => 
      (m.id && m.id === latestMessage.id) || 
      (m.content === latestMessage.content && 
       m.user_id === latestMessage.user_id && 
       Math.abs(new Date(m.created_at || "").getTime() - 
             new Date(latestMessage.created_at || "").getTime()) < 5000)
    );
    
    if (isDuplicate) {
      return;
    }
  
    const messageModel: MessageResponseModel = {
      ...latestMessage,
      id: latestMessage.id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fromServer: true
    };
  
    addNewMessage(latestMessage.conversation_id, messageModel);
    
    updateConversationOrder(latestMessage.conversation_id);
  
    if (currentConversation?.id === latestMessage.conversation_id) {
      setTimeout(() => {
        messageViewModel.scrollToBottom();
        markConversationAsRead(latestMessage.conversation_id);
      }, 100);
    } else {
      incrementUnreadCount(latestMessage.conversation_id);
    }
  }, [socketMessages, currentConversation?.id, messages, markConversationAsRead, addNewMessage, updateConversationOrder, incrementUnreadCount, messageViewModel.scrollToBottom]);

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

  useEffect(() => {
    if (currentConversation?.id) {
      markConversationAsRead(currentConversation.id);
      resetUnreadCount(currentConversation.id);
    }
  }, [currentConversation?.id, markConversationAsRead, resetUnreadCount]);

  const fetchExistingMembers = useCallback(async (conversationId: string) => {
    const members = await fetchConversationMembers(conversationId);
    const memberIds = members.map(member => member.id || '');
    
    setExistingMembers(members);
    setExistingMemberIds(memberIds);
    
    return { members, memberIds };
  }, [fetchConversationMembers]);

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

  const handleSendMessage = useCallback(() => {
    if (!currentConversation?.id) return;
    return sendMessage();
  }, [currentConversation?.id, sendMessage]);

const handleLoadMoreMessages = useCallback(() => {
  if (!currentConversation?.id) return;
  return loadMoreMessages();
}, [currentConversation?.id, loadMoreMessages]);

const handleScrollMessages = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  if (!currentConversation?.id) return;
  
  handleScroll(e);
  
  if (!messagesLoading) {
    markConversationAsRead(currentConversation.id);
  }
}, [currentConversation?.id, handleScroll, messagesLoading, markConversationAsRead]);

useEffect(() => {
  return () => {
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