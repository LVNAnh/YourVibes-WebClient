import { useState, useEffect, useCallback, useRef } from "react";
import { message as antdMessage } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";

export type MessagesState = {
  [conversationId: string]: MessageResponseModel[];
};

export interface UserTyping {
  userId: string;
  username: string;
  timestamp: number;
}

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const [messages, setMessages] = useState<MessagesState>({});
  const [loadingMessages, setLoadingMessages] = useState<{[id: string]: boolean}>({});
  const [newMessage, setNewMessage] = useState<string>("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<MessageResponseModel | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<{[conversationId: string]: UserTyping[]}>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsEndpointRef = useRef<string>("");

  // Set up WebSocket connection
  const setupWebSocket = useCallback((userId: string) => {
    if (!userId) return;
    
    // Close existing connection if any
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    const wsUrl = process.env.NEXT_PUBLIC_API_ENDPOINT!.replace("http", "ws") + 
                 `/v1/2024/messages/ws/${userId}`;
                 
    wsEndpointRef.current = wsUrl;
    
    try {
      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          
          if (data.type === "message" && data.conversation_id) {
            handleIncomingMessage(data);
          } else if (data.type === "typing") {
            handleTypingIndicator(data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          setupWebSocket(userId);
        }, 5000);
      };
      
      webSocketRef.current = ws;
      
      // Set up ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          clearInterval(pingInterval);
        }
      }, 30000);
      
      return () => {
        clearInterval(pingInterval);
        if (ws) {
          ws.close();
        }
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        setupWebSocket(userId);
      }, 5000);
    }
  }, []);

  // Handle incoming message from WebSocket
  const handleIncomingMessage = useCallback((data: any) => {
    const { conversation_id, message } = data;
    
    if (!conversation_id || !message) return;
    
    setMessages(prevMessages => {
      const conversationMessages = prevMessages[conversation_id] || [];
      
      // Check if this message already exists to avoid duplicates
      const messageExists = conversationMessages.some(m => m.id === message.id);
      if (messageExists) return prevMessages;
      
      // Filter out temporary messages that match this one
      const filteredMessages = conversationMessages.filter(m => {
        if (m.isTemporary && m.user_id === message.user_id && m.content === message.content) {
          return false;
        }
        return true;
      });
      
      // Add the new message
      return {
        ...prevMessages,
        [conversation_id]: [...filteredMessages, message]
      };
    });
  }, []);

  // Handle typing indicator
  const handleTypingIndicator = useCallback((data: any) => {
    const { conversation_id, user_id, username } = data;
    
    if (!conversation_id || !user_id || user_id === user?.id) return;
    
    setTypingUsers(prev => {
      const conversationTypers = prev[conversation_id] || [];
      
      // Update or add typing user
      const updatedTypers = conversationTypers.filter(u => u.userId !== user_id);
      updatedTypers.push({
        userId: user_id,
        username: username || "Someone",
        timestamp: Date.now()
      });
      
      return {
        ...prev,
        [conversation_id]: updatedTypers
      };
    });
    
    // Remove typing indicator after 3 seconds
    setTimeout(() => {
      setTypingUsers(prev => {
        const conversationTypers = prev[conversation_id] || [];
        const updatedTypers = conversationTypers.filter(u => 
          u.userId !== user_id || Date.now() - u.timestamp < 3000
        );
        
        return {
          ...prev,
          [conversation_id]: updatedTypers
        };
      });
    }, 3000);
  }, [user?.id]);

  // Subscribe to a conversation
  const subscribeToConversation = useCallback((conversationId: string) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot subscribe to conversation");
      return false;
    }
    
    try {
      webSocketRef.current.send(JSON.stringify({
        type: "subscribe",
        conversation_id: conversationId
      }));
      return true;
    } catch (error) {
      console.error("Error subscribing to conversation:", error);
      return false;
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN || !user) {
      return false;
    }
    
    try {
      webSocketRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: conversationId,
        user_id: user.id,
        username: user.name
      }));
      return true;
    } catch (error) {
      console.error("Error sending typing indicator:", error);
      return false;
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.error("Cannot fetch messages: conversationId is missing");
      return Promise.reject("Missing conversation ID");
    }
    
    setLoadingMessages(prev => ({ ...prev, [conversationId]: true }));
    
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        limit: 100,
        page: 1,
      });
      
      if (response.data) {
        // Sort messages by creation time
        const messageArray = Array.isArray(response.data) ? response.data : [response.data];
        messageArray.sort((a, b) => {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });
        
        setMessages(prev => ({
          ...prev,
          [conversationId]: messageArray
        }));
        
        // Subscribe to this conversation for real-time updates
        subscribeToConversation(conversationId);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessageError("Failed to load messages");
      return Promise.reject(error);
    } finally {
      setLoadingMessages(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [subscribeToConversation]);

  // Send a message
  const handleSendMessage = useCallback((content: string, conversationId: string, replyToMessage?: MessageResponseModel) => {
    if (!user || !conversationId || !content.trim()) {
      setMessageError("Cannot send message: Missing required data");
      return false;
    }
    
    if (content.length > 500) {
      setMessageError(localStrings.Messages.MessageTooLong || "Message must not exceed 500 characters");
      return false;
    }
    
    try {
      // Create temporary message to display immediately
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempMessage: MessageResponseModel = {
        id: tempId,
        user_id: user.id,
        conversation_id: conversationId,
        content: content,
        text: content, // Adding for compatibility
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          family_name: user.family_name,
          avatar_url: user.avatar_url,
        },
        isTemporary: true,
        parent_id: replyToMessage?.id,
        reply_to: replyToMessage
      };
      
      // Add temporary message to state
      setMessages(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: [...conversationMessages, tempMessage]
        };
      });
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Send the message to the server
      defaultMessagesRepo.createMessage({
        content: content,
        conversation_id: conversationId,
        parent_id: replyToMessage?.id,
        parent_content: replyToMessage?.content || replyToMessage?.text,
        user: {
          id: user.id,
          name: user.name,
          family_name: user.family_name,
          avatar_url: user.avatar_url,
        }
      }).catch(error => {
        console.error("Error sending message:", error);
        
        // Remove temporary message on error
        setMessages(prev => {
          const conversationMessages = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: conversationMessages.filter(m => m.id !== tempId)
          };
        });
        
        setMessageError("Failed to send message");
      });
      
      return true;
    } catch (error) {
      console.error("Error preparing message:", error);
      setMessageError("Failed to prepare message");
      return false;
    }
  }, [user, localStrings.Messages.MessageTooLong]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    if (!messageId || !conversationId) return false;
    
    try {
      // Optimistic update - remove from UI first
      setMessages(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationMessages.filter(m => m.id !== messageId)
        };
      });
      
      // Actually delete from server
      await defaultMessagesRepo.deleteMessage({
        message_id: messageId,
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      
      // Fetch messages again to restore state
      fetchMessages(conversationId);
      
      return false;
    }
  }, [fetchMessages]);

  // Force update temporary messages (check for long-pending temp messages)
  const forceUpdateTempMessages = useCallback(() => {
    setMessages(prev => {
      let updated = false;
      const now = Date.now();
      
      // Check each conversation
      const newMessages = Object.keys(prev).reduce((acc, convId) => {
        const messages = prev[convId];
        
        // For each message, check if it's temporary and older than 30 seconds
        const updatedMessages = messages.map(msg => {
          if (msg.isTemporary && now - new Date(msg.created_at || 0).getTime() > 30000) {
            updated = true;
            return {
              ...msg,
              text: msg.text ? `${msg.text} (sending...)` : '(sending...)',
              content: msg.content ? `${msg.content} (sending...)` : '(sending...)'
            };
          }
          return msg;
        });
        
        acc[convId] = updatedMessages;
        return acc;
      }, {} as MessagesState);
      
      return updated ? newMessages : prev;
    });
  }, []);

  // Initialize WebSocket when user changes
  useEffect(() => {
    if (user?.id) {
      setupWebSocket(user.id);
    }
    
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id, setupWebSocket]);

  // Initial state setup and cleanup
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    messageError,
    setMessageError,
    newMessage,
    setNewMessage,
    messages,
    fetchMessages,
    replyTo,
    setReplyTo,
    messagesEndRef,
    setIsProfileModalOpen,
    isProfileModalOpen,
    handleSendMessage,
    deleteMessage,
    isConnected,
    typingUsers,
    sendTypingIndicator,
    isLoadingMessages: loadingMessages,
    forceUpdateTempMessages,
  };
};