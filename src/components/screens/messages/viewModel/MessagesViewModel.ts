import { useState, useEffect, useRef, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";
import { useWebSocket } from "@/context/websocket/useWebSocket";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel, UpdateConversationRequestModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

interface ExtendedMessageResponseModel extends MessageResponseModel {
  isDateSeparator?: boolean;
}

type MessageWithDate = ExtendedMessageResponseModel;

export const useMessagesViewModel = () => {
  const { user, localStrings } = useAuth();
  const {
    isConnected: isWebSocketConnected,
    sendMessage: wsSendMessage,
    currentConversationId,
    setCurrentConversationId,
    getMessagesForConversation,
    updateMessagesForConversation,
    conversations: wsConversations,
    updateConversations,
    addMessageListener,
    unreadMessages,
    resetUnreadCount 
  } = useWebSocket();

  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationResponseModel | null>(null);
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [conversationsLoading, setConversationsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [isMessagesEnd, setIsMessagesEnd] = useState<boolean>(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const isFirstLoad = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id]);

  useEffect(() => {
    if (wsConversations && wsConversations.length > 0) {
      setConversations(wsConversations);
    }
  }, [wsConversations]);

  useEffect(() => {
    const unsubscribe = addMessageListener((conversationId, updatedMessages) => {
      if (conversationId === currentConversation?.id) {
        setMessages(updatedMessages);
        
        if (updatedMessages.length > 0 && messages.length > 0) {
          const lastOldMessageId = messages[messages.length - 1]?.id;
          const lastNewMessageId = updatedMessages[updatedMessages.length - 1]?.id;
          
          if (lastOldMessageId !== lastNewMessageId) {
            setTimeout(scrollToBottom, 100);
          }
        }
      }
    });
    
    return unsubscribe;
  }, [addMessageListener, currentConversation?.id, messages]);

  useEffect(() => {
    if (currentConversation?.id) {
      setMessages([]);
      setInitialMessagesLoaded(false);
      isFirstLoad.current = true;
      
      setCurrentConversationId(currentConversation.id);
      
      setCurrentPage(1);
      setIsMessagesEnd(false);
      
      fetchMessages(currentConversation.id, 1, false);
    }
  }, [currentConversation?.id]);

  useEffect(() => {
    if (initialMessagesLoaded && messages.length > 0 && isFirstLoad.current) {
      setTimeout(scrollToBottom, 100);
      isFirstLoad.current = false;
    }
  }, [initialMessagesLoaded, messages]);

  const formatDateForDisplay = (date: Date): string => {
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
  };
  
  const processMessagesWithDateSeparators = (messages: MessageResponseModel[]): MessageWithDate[] => {
    if (!messages || messages.length === 0) return [];
  
    
    const processedMessages: MessageWithDate[] = [];
    let currentDate: string | null = null;
  
    const sortedMessages = [...messages].sort((a, b) => {
      const dateA = new Date(a.created_at || "");
      const dateB = new Date(b.created_at || "");
      return dateA.getTime() - dateB.getTime();
    });
  
    sortedMessages.forEach((message) => {
      if (message.created_at) {
        const messageDate = new Date(message.created_at);
        
        const messageDateStr = messageDate.toISOString().split('T')[0];
  
        if (messageDateStr !== currentDate) {
          currentDate = messageDateStr;
          
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
  };

const fetchConversations = async () => {
  if (!user?.id) return;
  
  setConversationsLoading(true);
  try {
    const response = await defaultMessagesRepo.getConversations({
      limit: 50,
      page: 1
    });
    
    if (response.data) {
      const conversationsList = Array.isArray(response.data) 
        ? response.data 
        : [response.data];
      setConversations(conversationsList);
      
      updateConversations(conversationsList);
      
      const fetchMessagesPromises = conversationsList.map(async (conversation) => {
        if (conversation.id) {
          try {
            const messageResponse = await defaultMessagesRepo.getMessagesByConversationId({
              conversation_id: conversation.id,
              sort_by: "created_at",
              is_descending: true,
              limit: 1,
              page: 1
            });
            
            if (messageResponse.data) {
              const messageList = Array.isArray(messageResponse.data) 
                ? messageResponse.data 
                : [messageResponse.data];
              
              if (messageList.length > 0) {
                const formattedMessages = messageList.map(msg => ({
                  ...msg,
                  fromServer: true,
                  isTemporary: false
                }));
                
                updateMessagesForConversation(conversation.id, formattedMessages);
              }
            }
          } catch (error) {
          }
        }
      });
      
      await Promise.all(fetchMessagesPromises);
    }
  } catch (error) {
    message.error(localStrings.Messages?.ErrorFetchingConversations || "Error fetching conversations");
  } finally {
    setConversationsLoading(false);
  }
};

  const fetchMessages = async (conversationId: string, page: number = 1, shouldAppend: boolean = false) => {
    if (!user?.id || !conversationId) return;
    
    setMessagesLoading(true);
    
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
        
        let existingMessages = shouldAppend ? [...messages] : [];
        
        if (shouldAppend) {
          const existingMessageMap = new Map();
          existingMessages.forEach(msg => {
            if (msg.id) {
              existingMessageMap.set(msg.id, true);
            }
          });
          
          const uniqueNewMessages = sortedApiMessages.filter(msg => 
            !msg.id || !existingMessageMap.has(msg.id)
          );
          
          const firstApiMsgTime = new Date(sortedApiMessages[0]?.created_at || Date.now()).getTime();
          const firstExistingMsgTime = new Date(existingMessages[0]?.created_at || Date.now()).getTime();
          
          let updatedMessages = [];
          if (firstApiMsgTime < firstExistingMsgTime) {
            updatedMessages = [...uniqueNewMessages, ...existingMessages];
          } else {
            updatedMessages = [...existingMessages, ...uniqueNewMessages];
          }
          
          const sortedMessages = updatedMessages.sort((a, b) => {
            const dateA = new Date(a.created_at || "");
            const dateB = new Date(b.created_at || "");
            return dateA.getTime() - dateB.getTime();
          });
          
          const messagesWithDateSeparators = processMessagesWithDateSeparators(sortedMessages);

          setMessages(messagesWithDateSeparators);

          updateMessagesForConversation(conversationId, sortedMessages);
          
          setTimeout(() => {
            if (messageListRef.current) {
              messageListRef.current.scrollTop = 
                messageListRef.current.scrollHeight - scrollPositionRef.current;
            }
          }, 50);
        } else {
          const messagesWithDateSeparators = processMessagesWithDateSeparators(sortedApiMessages);
          
          const separators = messagesWithDateSeparators.filter(msg => msg.isDateSeparator);
          
          setMessages(messagesWithDateSeparators);
          
          updateMessagesForConversation(conversationId, sortedApiMessages);
          
          setInitialMessagesLoaded(true);
          
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (currentConversation?.id && !messagesLoading && !isMessagesEnd) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await fetchMessages(currentConversation.id, nextPage, true);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    if (scrollTop < 100 && !messagesLoading && !isMessagesEnd && currentConversation?.id) {
      loadMoreMessages();
    }
  };

  const createConversation = async (name: string, image?: File | string, userIds?: string[]) => {
    if (!user?.id) return null;
    
    try {
      const createResponse = await defaultMessagesRepo.createConversation({
        name: name,
        image: image,
        user_ids: userIds && userIds.length > 0 ? userIds : [user.id]
      });
      
      if (createResponse.data) {
        const newConversation = createResponse.data;
        await fetchConversations();
        return newConversation;
      }
      return null;
    } catch (error) {
      message.error(localStrings.Messages?.GroupCreationFailed || "Failed to create conversation");
      return null;
    }
  };

  const sendMessage = async () => {
    if (!user?.id || !currentConversation?.id || !messageText.trim() || !isWebSocketConnected) {
      return;
    }
    
    if (messageText.length > 500) {
      message.error(localStrings.Messages?.MessageTooLong || "Message too long");
      return;
    }
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const messageContent = messageText.trim();
    
    const tempMessage: MessageResponseModel = {
      id: tempId,
      user_id: user.id,
      user: {
        id: user.id,
        name: user.name,
        family_name: user.family_name,
        avatar_url: user.avatar_url
      },
      conversation_id: currentConversation.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      isTemporary: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    setMessageText("");
    
    scrollToBottom();
    
    try {
      const createMessageData = {
        content: messageContent,
        conversation_id: currentConversation.id,
        user: {
          id: user.id,
          name: user.name,
          family_name: user.family_name,
          avatar_url: user.avatar_url
        }
      };
      
      const response = await defaultMessagesRepo.createMessage(createMessageData);
      
      if (response.data) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...response.data, fromServer: true, isTemporary: false } : msg
          )
        );
        
        wsSendMessage({
          type: "message",
          data: response.data
        });
      }
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, sendFailed: true } : msg
        )
      );
      
      message.error(localStrings.Public.Error || "Failed to send message");
    }
  };
  const deleteMessage = async (messageId: string) => {
    if (!user?.id || !currentConversation?.id) return;
    
    try {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      await defaultMessagesRepo.deleteMessage({ message_id: messageId });
    } catch (error) {
      message.error(localStrings.Public.Error || "Error deleting message");
      
      if (currentConversation.id) {
        fetchMessages(currentConversation.id);
      }
    }
  };

  const updateConversation = async (conversationId: string, name?: string, image?: string) => {
    if (!conversationId) return null;
    
    try {
      const updateData: UpdateConversationRequestModel = {
        conversation_id: conversationId
      };
      
      if (name) updateData.name = name;
      if (image) updateData.image = image;
      
      const response = await defaultMessagesRepo.updateConversation(updateData);
      
      if (response.data) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, name: name || conv.name, image: image || conv.image }
              : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => 
            prev ? { 
              ...prev, 
              name: name || prev.name, 
              image: image || prev.image 
            } : prev
          );
        }
        
        return response.data;
      }
      return null;
    } catch (error) {
      message.error(localStrings.Public.Error || "Error updating conversation");
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user?.id) return;
    
    try {
      await defaultMessagesRepo.deleteConversation({ conversation_id: conversationId });
      
      await fetchConversations();
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (error) {
      message.error(localStrings.Public.Error || "Error deleting conversation");
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    try {
      await defaultMessagesRepo.updateConversationDetail({
        conversation_id: conversationId,
        user_id: user.id
      });
      
      resetUnreadCount(conversationId);
      
    } catch (error) {
    }
  };

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  return {
    // State
    conversations,
    currentConversation,
    messages,
    messagesLoading,
    conversationsLoading,
    searchText,
    messageText,
    isMessagesEnd,
    isWebSocketConnected,
    messageListRef,
    initialMessagesLoaded,
    unreadMessages, 
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation: (conversation: ConversationResponseModel | null) => {
      setCurrentConversation(conversation);
      
      // Mark conversation as read when selected
      if (conversation?.id) {
        markConversationAsRead(conversation.id);
      }
    },
  
    getMessagesForConversation: (conversationId: string) => {
      return getMessagesForConversation(conversationId);
    },
    
    // Actions
    fetchConversations,
    fetchMessages,
    sendMessage,
    deleteMessage,
    createConversation,
    updateConversation,
    deleteConversation,
    markConversationAsRead, 
    loadMoreMessages,
    handleScroll,
  };
};