import { useState, useCallback, useEffect, useRef } from "react";
import { message } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { ApiPath } from "@/api/ApiPath";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";

/**
 * Custom hook to manage messaging feature logic
 * Optimized to prevent frequent requests and use stable function references
 */
export const useMessagesViewModel = () => {
  const { user, localStrings } = useAuth();
  
  // Conversations state
  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationPage, setConversationPage] = useState(1);
  const [isConversationsEnd, setIsConversationsEnd] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [isMessagesEnd, setIsMessagesEnd] = useState(false);
  
  // UI and input states
  const [currentConversation, setCurrentConversation] = useState<ConversationResponseModel | null>(null);
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  
  // Friends state for new conversation
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  
  // WebSocket and API management refs
  const socketRef = useRef<WebSocket | null>(null);
  const conversationsLoadedRef = useRef(false);
  const isApiCallingRef = useRef(false);

  // Stable actions container
  const stableActions = useRef({
    // Fetch friends list
    fetchFriends: async () => {
      if (!user?.id) return;
      
      setFriendsLoading(true);
      try {
        const response = await defaultProfileRepo.getListFriends({
          user_id: user.id,
          limit: 50,
          page: 1
        });
        
        if (response.data) {
          setFriends(response.data as FriendResponseModel[]);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
        message.error(localStrings.Public.ErrorFetchingFriends);
      } finally {
        setFriendsLoading(false);
      }
    },

    // Fetch conversations with advanced logic
    fetchConversations: async (page = 1, limit = 50) => {
      if (!user?.id || isApiCallingRef.current || 
          (page === 1 && conversationsLoadedRef.current)) return;
      
      isApiCallingRef.current = true;
      setConversationsLoading(true);
      
      try {
        const conversationDetailsResponse = await defaultMessagesRepo.getConversationDetailByUserID({
          user_id: user.id,
          limit, 
          page
        });
        
        if (conversationDetailsResponse.data && Array.isArray(conversationDetailsResponse.data)) {
          // Extract and process conversations
          const conversationDetails = conversationDetailsResponse.data as any[];
          
          const validConversations = conversationDetails
            .filter(detail => detail.conversation && detail.conversation.id)
            .map(detail => ({
              id: detail.conversation.id,
              name: detail.conversation.name,
              image: detail.conversation.image,
              created_at: detail.conversation.created_at,
              updated_at: detail.conversation.updated_at
            }));
          
          // Remove duplicates and sort
          const uniqueConversations = Array.from(
            new Map(validConversations.map(item => [item.id, item])).values()
          ) as ConversationResponseModel[];
          
          const sortedConversations = [...uniqueConversations].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || "").getTime();
            const dateB = new Date(b.updated_at || b.created_at || "").getTime();
            return dateB - dateA;
          });
          
          if (page === 1) {
            setConversations(sortedConversations);
            conversationsLoadedRef.current = true;
          } else {
            setConversations(prev => [...prev, ...sortedConversations]);
          }
          
          setIsConversationsEnd(sortedConversations.length < limit);
          setConversationPage(page);
        } else {
          setConversations([]);
          setIsConversationsEnd(true);
          conversationsLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        message.error(localStrings.Public.ErrorFetchingConversations);
      } finally {
        setConversationsLoading(false);
        setTimeout(() => {
          isApiCallingRef.current = false;
        }, 2000);
      }
    },

    // Enhanced messages fetching
    fetchMessages: async (conversationId: string, page = 1, limit = 50) => {
      if (!conversationId || messagesLoading) return;
      
      setMessagesLoading(true);
      
      try {
        const response = await defaultMessagesRepo.getMessagesByConversationId({
          conversation_id: conversationId,
          page,
          limit
        });
        
        if (response.data) {
          let fetchedMessages = Array.isArray(response.data) 
            ? response.data as MessageResponseModel[]
            : [response.data] as MessageResponseModel[];
          
          // Sort messages chronologically
          fetchedMessages = fetchedMessages.sort((a, b) => 
            new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
          );
          
          // Advanced message merging
          setMessages(prev => {
            const existingIds = new Set(prev.map(msg => msg.id));
            
            const newMessages = fetchedMessages
              .filter(msg => !existingIds.has(msg.id))
              .map(msg => ({
                ...msg,
                fromServer: true
              }));
            
            // Combine messages based on page
            const mergedMessages = page === 1 
              ? [...newMessages, ...prev]  
              : [...prev, ...newMessages];
            
            // Sort, remove duplicates, keep latest
            return mergedMessages
              .sort((a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime())
              .filter((msg, index, self) => 
                index === self.findLastIndex(m => m.id === msg.id)
              );
          });
          
          // Pagination handling
          if (fetchedMessages.length < limit) {
            setIsMessagesEnd(true);
          } else {
            setIsMessagesEnd(false);
          }
          
          setMessagePage(page);
        } else {
          // No messages scenario
          if (page === 1) {
            setMessages([]);
          }
          setIsMessagesEnd(true);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        message.error(localStrings.Public.ErrorFetchingMessages);
      } finally {
        setMessagesLoading(false);
      }
    },

    // Send message with optimistic UI update
    sendMessage: async (content: string, conversationId: string) => {
      if (!conversationId || !content.trim() || !user) return;
      
      // Temporary message ID for tracking
      const tempId = `temp_${Date.now()}`;
      
      // Optimistic UI update
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
      
      // Add temporary message
      setMessages(prev => [...prev, tempMessage]);
      
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
          const realMessage = response.data as MessageResponseModel;
          
          // Replace temporary message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId 
                ? { ...realMessage, fromServer: true, isTemporary: false } 
                : msg
            )
          );
          
          // Update conversation order
          setConversations(prev => {
            const conversationIndex = prev.findIndex(c => c.id === conversationId);
            if (conversationIndex < 0) return prev;
            
            const updatedConversations = [...prev];
            const conversation = { ...updatedConversations[conversationIndex] };
            
            conversation.updated_at = new Date().toISOString();
            
            updatedConversations.splice(conversationIndex, 1);
            updatedConversations.unshift(conversation);
            
            return updatedConversations;
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.ErrorSendingMessage);
        
        // Remove temporary message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
    },

    // Create new conversation
    createConversation: async (name: string, selectedFriendIds: string[], image?: string) => {
      if (!user?.id) {
        message.error(localStrings.Public.LoginRequired);
        return null;
      }
      
      try {
        // Create conversation
        const response = await defaultMessagesRepo.createConversation({
          name: name || selectedFriendIds
            .map(id => {
              const friend = friends.find(f => f.id === id);
              return friend ? `${friend.family_name || ''} ${friend.name || ''}`.trim() : '';
            })
            .filter(Boolean)
            .join(", "),
          image
        });
        
        if (response.data) {
          const newConversation = response.data as ConversationResponseModel;
          
          // Add current user to conversation
          await defaultMessagesRepo.createConversationDetail({
            conversation_id: newConversation.id,
            user_id: user.id
          });
          
          // Add selected friends
          for (const friendId of selectedFriendIds) {
            await defaultMessagesRepo.createConversationDetail({
              conversation_id: newConversation.id,
              user_id: friendId
            });
          }
          
          // Update conversations list
          setConversations(prev => [newConversation, ...prev]);
          setCurrentConversation(newConversation);
          
          return newConversation;
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        message.error(localStrings.Public.ErrorCreatingConversation);
        return null;
      }
    },

    // Delete message
    deleteMessage: async (messageId: string) => {
      try {
        await defaultMessagesRepo.deleteMessage({
          message_id: messageId
        });
        
        // Remove message from list
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        message.success(localStrings.Public.MessageDeleted);
      } catch (error) {
        console.error("Error deleting message:", error);
        message.error(localStrings.Public.ErrorDeletingMessage);
      }
    },

    // WebSocket connection management
    connectWebSocket: (userId: string) => {
      const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${userId}`;
      const ws = new WebSocket(wsUrl);
      
      let pingInterval: ReturnType<typeof setInterval> | null = null;
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch (err) {
              console.error("Ping error:", err);
            }
          }
        }, 30000);
      };
      
      ws.onmessage = (event) => {
        try {
          if (event.data === "pong" || event.data.includes("pong")) return;
          
          const newMessage = JSON.parse(event.data);
          
          if (!newMessage?.conversation_id) {
            console.warn("Invalid WebSocket message");
            return;
          }
          
          // Update messages for current conversation
          setMessages(prev => {
            const messageExists = prev.some(msg => 
              msg.id === newMessage.id || 
              (msg.content === newMessage.content && 
               msg.user_id === newMessage.user_id && 
               Math.abs(new Date(msg.created_at || "").getTime() - 
                        new Date(newMessage.created_at || "").getTime()) < 5000)
            );
            
            if (messageExists) return prev;
            
            const updatedMessages = [...prev, newMessage]
              .sort((a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime());
            
            return updatedMessages;
          });
          
          // Update conversation list order
          setConversations(prev => {
            const conversationIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
            
            if (conversationIndex >= 0) {
              const updatedConversations = [...prev];
              const conversation = { ...updatedConversations[conversationIndex] };
              
              conversation.updated_at = new Date().toISOString();
              updatedConversations.splice(conversationIndex, 1);
              updatedConversations.unshift(conversation);
              
              return updatedConversations;
            }
            
            return prev;
          });
        } catch (error) {
          console.error("WebSocket message processing error:", error);
        }
      };
      
      ws.onclose = (event) => {
        if (pingInterval) clearInterval(pingInterval);
        
        // Automatic reconnection
        if (event.code !== 1000) {
          setTimeout(() => {
            if (user?.id) {
              stableActions.current.connectWebSocket(user.id);
            }
          }, 5000);
        }
      };
      
      return ws;
    }
  });

  // WebSocket connection effect
  useEffect(() => {
    if (!user?.id) return;
    
    const ws = stableActions.current.connectWebSocket(user.id);
    
    return () => {
      ws.close(1000, "Component unmounting");
    };
  }, [user?.id]);

  // Auto-sync messages for active conversation
  useEffect(() => {
    if (!currentConversation?.id) return;
    
    // Initial load and periodic sync
    const initialLoad = setTimeout(() => {
      stableActions.current.fetchMessages(currentConversation.id, 1, 50);
    }, 300);
    
    const syncInterval = setInterval(() => {
      if (currentConversation?.id && document.visibilityState === 'visible') {
        stableActions.current.fetchMessages(currentConversation.id, 1, 50);
      }
    }, 15000);
    
    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversation?.id) {
        stableActions.current.fetchMessages(currentConversation.id, 1, 50);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(initialLoad);
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentConversation?.id]);

  // Memoized callback methods to prevent unnecessary re-renders
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
  
  const createConversation = useCallback((name: string, selectedFriendIds: string[], image?: string) => {
    return stableActions.current.createConversation(name, selectedFriendIds, image);
  }, [friends]);
  
  const deleteMessage = useCallback((messageId: string) => {
    stableActions.current.deleteMessage(messageId);
  }, []);

  // Load more messages (older messages)
  const loadMoreMessages = useCallback(() => {
    if (currentConversation?.id) {
      stableActions.current.fetchMessages(currentConversation.id, messagePage + 1);
    }
  }, [currentConversation?.id, messagePage]);

  // Fetch friends when needed
  const loadFriends = useCallback(() => {
    stableActions.current.fetchFriends();
  }, []);

  // Reset loaded flags on unmount
  useEffect(() => {
    return () => {
      conversationsLoadedRef.current = false;
      isApiCallingRef.current = false;
    };
  }, []);

  // Return all state and methods
  return {
    // Conversations state
    conversations,
    conversationsLoading,
    isConversationsEnd,
    
    // Messages state
    messages,
    messagesLoading,
    isMessagesEnd,
    
    // Current conversation and input states
    currentConversation,
    searchText,
    messageText,
    
    // Friends state
    friends,
    friendsLoading,
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation,
    
    // Actions
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    deleteMessage,
    loadMoreMessages,
    loadFriends
  };
};