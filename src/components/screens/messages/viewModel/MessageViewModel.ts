import { useState, useRef, useEffect, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";
import { useWebSocket } from "@/context/socket/useSocket";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { MessageResponseModel, MessageWebSocketResponseModel } from "@/api/features/messages/models/MessageModel";

interface ExtendedMessageResponseModel extends MessageResponseModel {
  isDateSeparator?: boolean;
}

type MessageWithDate = ExtendedMessageResponseModel;

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>("");
  const [isMessagesEnd, setIsMessagesEnd] = useState<boolean>(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, MessageResponseModel[]>>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { sendSocketMessage } = useWebSocket();
  
  const pageSize = 20;
  const messageListRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const messageListenersRef = useRef<Set<(conversationId: string, messages: MessageResponseModel[]) => void>>(new Set());

  const isDuplicateMessage = useCallback((
    conversationId: string, 
    message: MessageResponseModel, 
    existingMessages: MessageResponseModel[]
  ): boolean => {
    if (message.id) {
      const isDuplicateById = existingMessages.some(msg => msg.id === message.id);
      if (isDuplicateById) return true;
      
      const messageUniqueId = `${conversationId}-${message.id}`;
      if (processedMessagesRef.current.has(messageUniqueId)) return true;
    }
    
    const contentBasedId = `${conversationId}-${message.user_id}-${message.content}-${message.created_at}`;
    if (processedMessagesRef.current.has(contentBasedId)) return true;
    
    const isDuplicateByContent = existingMessages.some(msg => 
      msg.user_id === message.user_id && 
      msg.content === message.content && 
      Math.abs(new Date(msg.created_at || "").getTime() - 
            new Date(message.created_at || "").getTime()) < 5000
    );
    
    return isDuplicateByContent;
  }, []);

  const markMessageAsProcessed = useCallback((conversationId: string, message: MessageResponseModel) => {
    if (!message) return;
    
    if (message.id) {
      const messageUniqueId = `${conversationId}-${message.id}`;
      processedMessagesRef.current.add(messageUniqueId);
    }
    
    const contentBasedId = `${conversationId}-${message.user_id}-${message.content}-${message.created_at}`;
    processedMessagesRef.current.add(contentBasedId);
    
    if (processedMessagesRef.current.size > 1000) {
      const oldestEntries = Array.from(processedMessagesRef.current).slice(0, 300);
      oldestEntries.forEach(id => processedMessagesRef.current.delete(id));
    }
  }, []);

  const addMessageListener = useCallback((callback: (conversationId: string, messages: MessageResponseModel[]) => void) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  const notifyMessageListeners = useCallback((conversationId: string, messages: MessageResponseModel[]) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, messages);
      } catch (error) {
        console.error("Error in message listener callback:", error);
      }
    });
  }, []);

  const addNewMessage = useCallback((conversationId: string, message: MessageResponseModel) => {
    if (!conversationId || !message) {
        return;
    }
    
    const currentMessages = messagesByConversation[conversationId] || [];
    
    if (isDuplicateMessage(conversationId, message, currentMessages)) {
        return;
    }
    
    markMessageAsProcessed(conversationId, message);
    
    setMessagesByConversation(prev => {
        const conversationMessages = prev[conversationId] || [];
        
        const formattedMessage = {
            ...message,
            isTemporary: false,
            fromServer: true
        };
        
        const updatedMessages = [...conversationMessages, formattedMessage].sort(
            (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
        );
        
        notifyMessageListeners(conversationId, updatedMessages);
        
        if (conversationId === currentConversationId) {
            setMessages(processMessagesWithDateSeparators(updatedMessages));
        }
        
        return {
            ...prev,
            [conversationId]: updatedMessages
        };
    });
  }, [messagesByConversation, currentConversationId, isDuplicateMessage, markMessageAsProcessed, notifyMessageListeners]);

  const getMessagesForConversation = useCallback((conversationId: string): MessageResponseModel[] => {
    return messagesByConversation[conversationId] || [];
  }, [messagesByConversation]);

  const updateMessagesForConversation = useCallback((conversationId: string, newMessages: MessageResponseModel[]) => {
    if (!conversationId || !newMessages || newMessages.length === 0) return;
    
    const formattedMessages = newMessages.map(msg => ({
      ...msg,
      isTemporary: false,
      fromServer: true
    }));
    
    setMessagesByConversation(prev => {
      const existingMessages = prev[conversationId] || [];
      
      const messageMap = new Map<string, MessageResponseModel>();
      
      existingMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else {
          const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
          messageMap.set(key, msg);
        }
      });
      
      formattedMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else {
          const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
          if (!messageMap.has(key)) {
            messageMap.set(key, msg);
          }
        }
      });
      
      const uniqueMessages = Array.from(messageMap.values()).sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      notifyMessageListeners(conversationId, uniqueMessages);
      
      return {
        ...prev,
        [conversationId]: uniqueMessages
      };
    });
  }, [notifyMessageListeners]);

  const formatDateForDisplay = useCallback((date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
  
    if (messageDay.getTime() === today.getTime()) {
      return "Hôm nay";
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return "Hôm qua";
    } else {
      const day = messageDate.getDate().toString().padStart(2, '0');
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
      const year = messageDate.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
  }, []);
  
  const processMessagesWithDateSeparators = useCallback((messages: MessageResponseModel[]): MessageWithDate[] => {
    if (!messages || messages.length === 0) return [];
  
    const sortedMessages = [...messages].sort((a, b) => {
      const dateA = new Date(a.created_at || "");
      const dateB = new Date(b.created_at || "");
      return dateA.getTime() - dateB.getTime();
    });
  
    const dateMap = new Map<string, boolean>();
    
    const messagesWithoutSeparators = sortedMessages.filter(msg => !msg.isDateSeparator);
    
    const processedMessages: MessageWithDate[] = [];
    let currentDate: string | null = null;
  
    messagesWithoutSeparators.forEach((message) => {
      if (message.created_at) {
        const messageDate = new Date(message.created_at);
        const messageDateStr = messageDate.toISOString().split('T')[0];
  
        if (messageDateStr !== currentDate && !dateMap.has(messageDateStr)) {
          currentDate = messageDateStr;
          dateMap.set(messageDateStr, true);
          
          const formattedDate = formatDateForDisplay(messageDate);
          
          const dateSeparator: MessageWithDate = {
            id: `date-separator-${messageDateStr}`,
            content: formattedDate,
            isDateSeparator: true,
            created_at: message.created_at,
          };
          
          processedMessages.push(dateSeparator);
        }
      }
      
      processedMessages.push(message as MessageWithDate);
    });
  
    return processedMessages;
  }, [formatDateForDisplay]);

  const fetchMessages = useCallback(async (conversationId: string, page: number = 1, shouldAppend: boolean = false) => {
    if (!user?.id || !conversationId) return;
    
    setCurrentConversationId(conversationId);
    setMessagesLoading(true);
    
    if (!shouldAppend && !isFirstLoad.current) {
      setMessages([]);
    }
    
    if (shouldAppend && messageListRef.current) {
      scrollPositionRef.current = messageListRef.current.scrollHeight - messageListRef.current.scrollTop;
    }
    
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        sort_by: "created_at",
        is_descending: true,
        limit: pageSize,
        page: page
      });
      
      if (response.data) {
        const messageList = Array.isArray(response.data) ? response.data : [response.data];
        
        setIsMessagesEnd(messageList.length < pageSize);
        
        const formattedMessages = messageList.map(msg => ({
          ...msg,
          fromServer: true,
          isTemporary: false
        }));
        
        const sortedApiMessages = [...formattedMessages].sort((a, b) => {
          const dateA = new Date(a.created_at || "");
          const dateB = new Date(b.created_at || "");
          return dateA.getTime() - dateB.getTime();
        });
        
        if (shouldAppend) {
          setMessagesByConversation(prev => {
            const existingMessages = prev[conversationId] || [];
            
            const messageMap = new Map<string, MessageResponseModel>();
            
            existingMessages.forEach(msg => {
              if (msg.id) {
                messageMap.set(msg.id, msg);
              } else {
                const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
                messageMap.set(key, msg);
              }
            });
            
            sortedApiMessages.forEach(msg => {
              if (msg.id) {
                messageMap.set(msg.id, msg);
              } else {
                const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
                messageMap.set(key, msg);
              }
            });
            
            const combinedMessages = Array.from(messageMap.values()).sort(
              (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
            );
            
            const messagesWithDateSeparators = processMessagesWithDateSeparators(combinedMessages);
            setMessages(messagesWithDateSeparators);
            
            sortedApiMessages.forEach(msg => {
              if (msg.id) markMessageAsProcessed(conversationId, msg);
            });
            
            setTimeout(() => {
              if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight - scrollPositionRef.current;
              }
            }, 50);
            
            return {
              ...prev,
              [conversationId]: combinedMessages
            };
          });
        } else {
          const messagesWithDateSeparators = processMessagesWithDateSeparators(sortedApiMessages);
          setMessages(messagesWithDateSeparators);
          
          sortedApiMessages.forEach(msg => {
            if (msg.id) markMessageAsProcessed(conversationId, msg);
          });
          
          setMessagesByConversation(prev => ({
            ...prev,
            [conversationId]: sortedApiMessages
          }));
          
          setInitialMessagesLoaded(true);
          isFirstLoad.current = false;
          
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user?.id, pageSize, processMessagesWithDateSeparators, markMessageAsProcessed]);

  const loadMoreMessages = useCallback(async () => {
    if (currentConversationId && !messagesLoading && !isMessagesEnd) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await fetchMessages(currentConversationId, nextPage, true);
    }
  }, [currentConversationId, messagesLoading, isMessagesEnd, currentPage, fetchMessages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!currentConversationId) return;
    
    const { scrollTop } = e.currentTarget;
    
    if (scrollTop < 100 && !messagesLoading && !isMessagesEnd) {
      loadMoreMessages();
    }
  }, [currentConversationId, messagesLoading, isMessagesEnd, loadMoreMessages]);

  const sendMessage = useCallback(async () => {
    if (!user?.id || !currentConversationId || !messageText.trim()) {
        return;
    }
    
    if (messageText.length > 500) {
        message.error(localStrings.Messages.MessageTooLong);
        return;
    }
    
    const messageContent = messageText.trim();
    setMessageText("");
    
    const currentMessages = messagesByConversation[currentConversationId] || [];
    const hasDuplicateContent = currentMessages.some(msg => 
        msg.user_id === user.id && 
        msg.content === messageContent &&
        Math.abs(Date.now() - new Date(msg.created_at || "").getTime()) < 10000
    );
    
    if (hasDuplicateContent) {
        return;
    }
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const tempMessage: MessageResponseModel = {
        id: tempId,
        user_id: user.id,
        user: {
            id: user.id,
            name: user.name,
            family_name: user.family_name,
            avatar_url: user.avatar_url
        },
        conversation_id: currentConversationId,
        content: messageContent,
        created_at: new Date().toISOString(),
        isTemporary: true
    };
    
    // addNewMessage(currentConversationId, tempMessage);
    
    scrollToBottom();
    
    const messageData = {
        content: messageContent,
        conversation_id: currentConversationId,
        user_id: user.id,
        user: {
            id: user.id,
            name: user.name,
            family_name: user.family_name,
            avatar_url: user.avatar_url
        },
        created_at: new Date().toISOString()
    };
    
    try {
        const createMessageData = {
            content: messageContent,
            conversation_id: currentConversationId,
            user: {
                id: user.id,
                name: user.name,
                family_name: user.family_name,
                avatar_url: user.avatar_url
            }
        };
        
        const response = await defaultMessagesRepo.createMessage(createMessageData);
        
        if (response.data) {
            const serverMessage = { 
                ...response.data, 
                fromServer: true, 
                isTemporary: false 
            };
            
            markMessageAsProcessed(currentConversationId, serverMessage);
            
            setMessagesByConversation(prev => {
                const conversationMessages = prev[currentConversationId] || [];
                
                const filteredMessages = conversationMessages.filter(msg => 
                    !(msg.isTemporary && msg.content === messageContent && msg.user_id === user.id)
                );
                
                const updatedMessages = [...filteredMessages, serverMessage].sort(
                    (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
                );
                
                if (currentConversationId === currentConversationId) {
                    const processedMessages = processMessagesWithDateSeparators(updatedMessages);
                    setMessages(processedMessages);
                }
                
                notifyMessageListeners(currentConversationId, updatedMessages);
                
                return {
                    ...prev,
                    [currentConversationId]: updatedMessages
                };
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.Error);
    }
}, [
    user, currentConversationId, messageText, messagesByConversation,
    markMessageAsProcessed, processMessagesWithDateSeparators, notifyMessageListeners
]);

const deleteMessage = useCallback(async (messageId: string) => {
    if (!user?.id || !currentConversationId) return;
    
    try {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        setMessagesByConversation(prev => {
            if (!prev[currentConversationId]) return prev;
            
            const updatedMessages = prev[currentConversationId].filter(msg => msg.id !== messageId);
            
            return {
                ...prev,
                [currentConversationId]: updatedMessages
            };
        });
        
        await defaultMessagesRepo.deleteMessage({ message_id: messageId });
    } catch (error) {
        console.error("Error deleting message:", error);
        message.error(localStrings.Public.Error);
        
        if (currentConversationId) {
            fetchMessages(currentConversationId);
        }
    }
}, [user?.id, currentConversationId, fetchMessages]);

const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
}, []);

useEffect(() => {
    return () => {
        processedMessagesRef.current.clear();
        messageListenersRef.current.clear();
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
    currentConversationId,
    
    // Setters
    setMessageText,
    setMessages,
    setCurrentConversationId,
    
    // Actions
    fetchMessages,
    sendMessage,
    deleteMessage,
    loadMoreMessages,
    handleScroll,
    scrollToBottom,
    getMessagesForConversation,
    addMessageListener,
    updateMessagesForConversation,
    addNewMessage,
};
};