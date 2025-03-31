import { useState, useCallback, useEffect, useRef } from "react";
import { message } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { useWebSocket } from "@/context/websocket/useWebSocket";

/**
 * Custom hook for managing messages feature logic
 * Optimized to avoid repeated requests and using refs for stable functions
 */
export const useMessagesViewModel = () => {
  const { user, localStrings } = useAuth();
  const {
    isConnected,
    lastMessages,
    updateMessagesForConversation,
    getMessagesForConversation,
    updateConversations,
    getConversations,
    conversations: wsConversations,
    currentConversationId: wsCurrentConversationId,
    setCurrentConversationId: setWsCurrentConversationId,
    resetUnreadCount,
    addNewMessage
  } = useWebSocket();
  
  // State for conversations
  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationPage, setConversationPage] = useState(1);
  const [isConversationsEnd, setIsConversationsEnd] = useState(false);
  
  // State for messages
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [isMessagesEnd, setIsMessagesEnd] = useState(false);
  
  // State for UI
  const [currentConversation, setCurrentConversation] = useState<ConversationResponseModel | null>(null);
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  
  // Variables to track loading state to avoid multiple calls
  const conversationsLoadedRef = useRef(false);
  const isApiCallingRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const firstLoadRef = useRef(true);
  const autoScrollRef = useRef(true);
  const fetchingMoreRef = useRef(false);
  
  // Initialize messages from WebSocket context when available
  useEffect(() => {
    if (wsConversations.length > 0) {
      setConversations(wsConversations);
    }
  }, [wsConversations]);
  
  // Sync current conversation between WebSocket context and local state
  useEffect(() => {
    if (currentConversation?.id) {
      setWsCurrentConversationId(currentConversation.id);
      resetUnreadCount(currentConversation.id);
    } else {
      setWsCurrentConversationId(null);
    }
  }, [currentConversation?.id, setWsCurrentConversationId, resetUnreadCount]);
  
  // Sync messages with WebSocket context
  useEffect(() => {
    if (currentConversation?.id) {
      const contextMessages = getMessagesForConversation(currentConversation.id);
      if (contextMessages.length > 0) {
        setMessages(contextMessages);
      }
    }
  }, [currentConversation?.id, getMessagesForConversation]);

  // Use stable ref for API functions
  const stableActions = useRef({
    fetchConversations: async (page = 1, limit = 20) => {
      // Skip if already loading, or data already loaded and on first page
      if (!user?.id || isApiCallingRef.current || 
          (page === 1 && conversationsLoadedRef.current)) return;
      
      isApiCallingRef.current = true;
      setConversationsLoading(true);
      
      try {
        // Get conversation details for the user
        const conversationDetailsResponse = await defaultMessagesRepo.getConversationDetailByUserID({
          user_id: user.id,
          limit: 100, // Get more to avoid refetching
          page: 1
        });
        
        if (conversationDetailsResponse.data && Array.isArray(conversationDetailsResponse.data)) {
          // Extract conversations from conversation details
          const conversationDetails = conversationDetailsResponse.data as any[];
          
          // Filter valid conversations with complete information
          const validConversations = conversationDetails
            .filter(detail => detail.conversation && detail.conversation.id)
            .map(detail => ({
              id: detail.conversation.id,
              name: detail.conversation.name,
              image: detail.conversation.image,
              created_at: detail.conversation.created_at,
              updated_at: detail.conversation.updated_at
            }));
          
          // Remove duplicates
          const uniqueConversations = Array.from(
            new Map(validConversations.map(item => [item.id, item])).values()
          ) as ConversationResponseModel[];
          
          // Sort by most recent activity
          const sortedConversations = [...uniqueConversations].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || "").getTime();
            const dateB = new Date(b.updated_at || b.created_at || "").getTime();
            return dateB - dateA; // Most recent first
          });
          
          if (page === 1) {
            setConversations(sortedConversations);
            // Mark as loaded to avoid reloading
            conversationsLoadedRef.current = true;
            // Update WebSocket context
            updateConversations(sortedConversations);
          } else {
            setConversations(prev => [...prev, ...sortedConversations]);
          }
          
          // All conversations fetched at once 
          setIsConversationsEnd(true);
          setConversationPage(page);
        } else {
          // No conversations found
          setConversations([]);
          setIsConversationsEnd(true);
          conversationsLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        message.error(localStrings.Messages.ErrorFetchingConversations || "Error fetching conversations");
      } finally {
        setConversationsLoading(false);
        // Allow API calls again after a delay
        setTimeout(() => {
          isApiCallingRef.current = false;
        }, 2000);
      }
    },
    
    fetchMessages: async (conversationId: string, page = 1, limit = 20, forceRefresh = false) => {
      if (!conversationId || (messagesLoading && !forceRefresh)) return;
      
      // Reset pagination when changing conversations
      if (page === 1) {
        if (!forceRefresh && getMessagesForConversation(conversationId).length > 0) {
          // Use cached messages from WebSocket context first
          setMessages(getMessagesForConversation(conversationId));
          // Still fetch in background to ensure up-to-date data
          fetchingMoreRef.current = true;
        } else {
          setMessages([]);
        }
      }
      
      setMessagesLoading(true);
      
      try {
        // Fetch messages from API
        const response = await defaultMessagesRepo.getMessagesByConversationId({
          conversation_id: conversationId,
          page,
          limit: 50 // Increased limit to fetch more messages at once
        });
        
        if (response.data) {
          let fetchedMessages = Array.isArray(response.data) 
            ? response.data as MessageResponseModel[]
            : [response.data] as MessageResponseModel[];
          
          // Sort messages by created_at
          fetchedMessages = fetchedMessages.sort((a, b) => {
            return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
          });
          
          // Add fromServer flag to identify messages
          const markedMessages = fetchedMessages.map(msg => ({
            ...msg,
            fromServer: true
          }));
          
          if (page === 1) {
            setMessages(markedMessages);
            // Update WebSocket context
            updateMessagesForConversation(conversationId, markedMessages);
            
            // Auto-scroll to bottom on initial load
            setTimeout(() => {
              if (messageListRef.current && autoScrollRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
              }
            }, 200);
          } else {
            // Merge with existing messages, avoiding duplicates
            setMessages(prev => {
              // Get existing message IDs
              const existingIds = new Set(prev.map(msg => msg.id));
              
              // Filter new messages
              const newMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id))
                .map(msg => ({
                  ...msg,
                  fromServer: true
                }));
              
              // Combine new and existing messages
              const mergedMessages = [...newMessages, ...prev];
              
              // Sort by time
              return mergedMessages.sort((a, b) => {
                return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
              });
            });
            
            // Also update in WebSocket context
            if (newMessages && newMessages.length > 0) {
              const updatedContextMessages = [...getMessagesForConversation(conversationId), ...newMessages];
              updateMessagesForConversation(conversationId, updatedContextMessages);
            }
          }
          
          // Check if we've reached the end of messages
          setIsMessagesEnd(fetchedMessages.length < limit);
          setMessagePage(page);
        } else {
          // No messages found
          if (page === 1) {
            setMessages([]);
            updateMessagesForConversation(conversationId, []);
          }
          setIsMessagesEnd(true);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        message.error(localStrings.Public.ErrorFetchingMessages || "Error fetching messages");
      } finally {
        setMessagesLoading(false);
        fetchingMoreRef.current = false;
      }
    },
    
    sendMessage: async (content: string, conversationId: string) => {
      if (!conversationId || !content.trim() || !user) return;
      
      // Generate temporary ID for optimistic update
      const tempId = `temp_${Date.now()}`;
      
      // Create temporary message for immediate display
      const tempMessage: MessageResponseModel = {
        id: tempId,
        user_id: user.id,
        user: {
          id: user.id,
          family_name: user.family_name,
          name: user.name,
          avatar_url: user.avatar_url
        },
        conversation_id: conversationId,
        content,
        created_at: new Date().toISOString(),
        isTemporary: true
      };
      
      // Add temporary message to UI
      setMessages(prev => [...prev, tempMessage]);
      addNewMessage(conversationId, tempMessage);
      
      // Enable auto-scroll when sending a message
      autoScrollRef.current = true;
      
      // Scroll to bottom to show the sent message
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      }, 50);
      
      try {
        // Send message to server
        const response = await defaultMessagesRepo.createMessage({
          content,
          conversation_id: conversationId,
          user: {
            id: user.id,
            family_name: user.family_name,
            name: user.name,
            avatar_url: user.avatar_url
          }
        });
        
        if (response.data) {
          // Create reference to real message from API
          const realMessage = response.data as MessageResponseModel;
          
          // Add fromServer attribute
          const serverMessage = {
            ...realMessage,
            fromServer: true,
            isTemporary: false
          };
          
          // Replace temporary message with real one
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? serverMessage : msg
            )
          );
          
          // Update in WebSocket context too
          updateMessagesForConversation(
            conversationId,
            getMessagesForConversation(conversationId).map(msg => 
              msg.id === tempId ? serverMessage : msg
            )
          );
          
          console.log("Message sent successfully:", serverMessage);
          
          // Update conversation order
          setConversations(prev => {
            const conversationIndex = prev.findIndex(c => c.id === conversationId);
            if (conversationIndex < 0) return prev;
            
            const updatedConversations = [...prev];
            const conversation = { ...updatedConversations[conversationIndex] };
            
            // Update timestamp
            conversation.updated_at = new Date().toISOString();
            
            // Remove from old position
            updatedConversations.splice(conversationIndex, 1);
            
            // Add to top
            updatedConversations.unshift(conversation);
            
            return updatedConversations;
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.ErrorSendingMessage || "Error sending message");
        
        // Remove temporary message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        
        // Try to resend after 2 seconds if online
        setTimeout(() => {
          if (navigator.onLine) {
            console.log("Retrying to send message...");
            stableActions.current.sendMessage(content, conversationId);
          }
        }, 2000);
      }
    },
    
    createConversation: async (name: string, image?: string) => {
      if (!user?.id) {
        message.error(localStrings.Public.LoginRequired || "You need to be logged in");
        return;
      }
      
      try {
        const response = await defaultMessagesRepo.createConversation({
          name,
          image
        });
        
        if (response.data) {
          const newConversation = response.data as ConversationResponseModel;
          
          // Add current user to conversation
          try {
            await defaultMessagesRepo.createConversationDetail({
              conversation_id: newConversation.id,
              user_id: user.id
            });
            
            // Add to conversation list
            setConversations(prev => [newConversation, ...prev]);
            updateConversations([newConversation, ...getConversations()]);
            
            // Set as current conversation
            setCurrentConversation(newConversation);
            
            return newConversation;
          } catch (error) {
            console.error("Error adding current user to conversation:", error);
            message.error(localStrings.Public.ErrorCreatingConversation || "Error creating conversation");
          }
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        message.error(localStrings.Public.ErrorCreatingConversation || "Error creating conversation");
      }
    },
    
    deleteMessage: async (messageId: string) => {
      try {
        await defaultMessagesRepo.deleteMessage({
          message_id: messageId
        });
        
        // Remove from UI and context
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Also update in WebSocket context
        if (currentConversation?.id) {
          updateMessagesForConversation(
            currentConversation.id,
            getMessagesForConversation(currentConversation.id).filter(msg => msg.id !== messageId)
          );
        }
        
        message.success(localStrings.Public.MessageDeleted || "Message deleted");
      } catch (error) {
        console.error("Error deleting message:", error);
        message.error(localStrings.Public.ErrorDeletingMessage || "Error deleting message");
      }
    },
    
    deleteConversation: async (conversationId: string) => {
      try {
        await defaultMessagesRepo.deleteConversation({
          conversation_id: conversationId
        });
        
        // Remove from list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        updateConversations(getConversations().filter(conv => conv.id !== conversationId));
        
        // Clear if current conversation
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
        
        message.success(localStrings.Public.ConversationDeleted || "Conversation deleted");
      } catch (error) {
        console.error("Error deleting conversation:", error);
        message.error(localStrings.Public.ErrorDeletingConversation || "Error deleting conversation");
      }
    }
  });

  // Initial conversations load
  useEffect(() => {
    if (user?.id) {
      // Use requestIdleCallback for optimization
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
          stableActions.current.fetchConversations();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        const timer = setTimeout(() => {
          stableActions.current.fetchConversations();
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user?.id]);

  // Auto-refresh mechanism for messages
  useEffect(() => {
    if (!currentConversation?.id) return;
    
    // Initial fetch when conversation changes
    if (firstLoadRef.current && currentConversation?.id) {
      stableActions.current.fetchMessages(currentConversation.id, 1, 50);
      firstLoadRef.current = false;
    }
    
    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      if (currentConversation?.id && document.visibilityState === 'visible' && !fetchingMoreRef.current) {
        console.log("Auto-refreshing messages for conversation:", currentConversation.id);
        stableActions.current.fetchMessages(currentConversation.id, 1, 50, true);
      }
    }, 30000); // Every 30 seconds
    
    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversation?.id) {
        console.log("Tab became visible, refreshing messages");
        stableActions.current.fetchMessages(currentConversation.id, 1, 50, true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentConversation?.id]);

  // Handle scroll events to detect when user scrolls away from bottom
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
      
      // If user is near bottom, enable auto-scroll for new messages
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 80;
      autoScrollRef.current = isNearBottom;
    }
  }, []);

  // Set message list ref
  const setMessageListElement = useCallback((element: HTMLDivElement | null) => {
    messageListRef.current = element;
    
    // Auto-scroll to bottom on initial load
    if (element && currentConversation?.id && messages.length > 0) {
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      }, 200);
    }
  }, [currentConversation?.id, messages.length]);

  // Create memoized functions to prevent unnecessary re-renders
  const fetchConversations = useCallback((page = 1) => {
    stableActions.current.fetchConversations(page);
  }, []);
  
  const fetchMessages = useCallback((conversationId: string, page = 1) => {
    stableActions.current.fetchMessages(conversationId, page);
  }, []);
  
  const sendMessage = useCallback(() => {
    if (currentConversation?.id && messageText.trim()) {
      const messageToSend = messageText.trim();
      stableActions.current.sendMessage(messageToSend, currentConversation.id);
      setMessageText("");
    }
  }, [currentConversation?.id, messageText]);
  
  const createConversation = useCallback((name: string, image?: string) => {
    return stableActions.current.createConversation(name, image);
  }, []);
  
  const deleteMessage = useCallback((messageId: string) => {
    stableActions.current.deleteMessage(messageId);
  }, []);
  
  const deleteConversation = useCallback((conversationId: string) => {
    stableActions.current.deleteConversation(conversationId);
  }, []);
  
  // Load more (older) messages
  const loadMoreMessages = useCallback(() => {
    if (currentConversation?.id && !fetchingMoreRef.current) {
      fetchingMoreRef.current = true;
      stableActions.current.fetchMessages(currentConversation.id, messagePage + 1);
    }
  }, [currentConversation?.id, messagePage]);

  // Reset loaded flag on unmount
  useEffect(() => {
    return () => {
      conversationsLoadedRef.current = false;
      isApiCallingRef.current = false;
      firstLoadRef.current = true;
    };
  }, []);

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
    isConversationsEnd,
    isWebSocketConnected: isConnected,
    
    // Refs
    messageListRef: setMessageListElement,
    handleScroll,
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation,
    
    // Actions
    sendMessage,
    fetchConversations,
    loadMoreMessages,
    fetchMessages,
    createConversation,
    deleteMessage,
    deleteConversation
  };
};