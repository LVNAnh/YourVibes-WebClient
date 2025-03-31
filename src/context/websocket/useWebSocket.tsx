"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { ApiPath } from "@/api/ApiPath";
import { useAuth } from '../auth/useAuth';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { ConversationResponseModel } from '@/api/features/messages/models/ConversationModel';
import { WebSocketContextType } from './webSocketContextType';

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessages, setLastMessages] = useState<Record<string, MessageResponseModel[]>>({});
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityChangeHandled = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const connectWebSocket = () => {
      try {
        // Close existing connections
        if (wsRef.current) {
          wsRef.current.close();
        }

        const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}`;
        console.log("Connecting to WebSocket:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WebSocket connection established");
          setIsConnected(true);
          
          // Setup ping interval to keep connection alive
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "ping" }));
              } catch (err) {
                console.error("Error sending ping:", err);
              }
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            // Ignore pong messages
            if (event.data === "pong" || event.data.includes("pong")) {
              return;
            }
            
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);
            
            if (!data || !data.conversation_id) {
              console.warn("Invalid message format received");
              return;
            }
            
            // Process the message
            processIncomingMessage(data);
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };
        
        ws.onclose = (event) => {
          console.log("WebSocket connection closed", event.code, event.reason);
          setIsConnected(false);
          
          // Clear ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          // Attempt to reconnect if not closed cleanly
          if (event.code !== 1000) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("Attempting to reconnect...");
              connectWebSocket();
            }, 5000);
          }
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        setIsConnected(false);
      }
    };
    
    connectWebSocket();
    
    // Handle visibility change - reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.log("Tab visible, reconnecting WebSocket");
          connectWebSocket();
        }
      }
    };
    
    if (!visibilityChangeHandled.current) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityChangeHandled.current = true;
    }
    
    return () => {
      // Clean up on unmount
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (visibilityChangeHandled.current) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        visibilityChangeHandled.current = false;
      }
    };
  }, [user?.id]);

  // Process incoming messages
  const processIncomingMessage = (message: MessageResponseModel) => {
    if (!message.conversation_id) return;
    
    const conversationId = message.conversation_id;
    
    // Add message to conversation messages
    setLastMessages(prev => {
      const conversationMessages = prev[conversationId] || [];
      
      // Check if the message already exists to avoid duplicates
      const messageExists = conversationMessages.some(
        msg => msg.id === message.id || 
        (msg.content === message.content && 
         msg.user_id === message.user_id && 
         Math.abs(new Date(msg.created_at || "").getTime() - 
                  new Date(message.created_at || "").getTime()) < 5000)
      );
      
      if (messageExists) {
        return prev;
      }
      
      // Add the new message and sort by time
      const updatedMessages = [...conversationMessages, message].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      return {
        ...prev,
        [conversationId]: updatedMessages
      };
    });
    
    // Increment unread count if not viewing this conversation
    if (currentConversationId !== conversationId) {
      setUnreadMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1
      }));
      
      // Update conversation order
      updateConversationOrder(conversationId);
    }
  };

  // Update the order of conversations to move the one with new messages to the top
  const updateConversationOrder = (conversationId: string) => {
    setConversations(prev => {
      const conversationIndex = prev.findIndex(c => c.id === conversationId);
      if (conversationIndex < 0) return prev;
      
      const updatedConversations = [...prev];
      const conversation = { ...updatedConversations[conversationIndex] };
      
      // Update timestamp to current time
      conversation.updated_at = new Date().toISOString();
      
      // Remove from current position and add to the top
      updatedConversations.splice(conversationIndex, 1);
      updatedConversations.unshift(conversation);
      
      return updatedConversations;
    });
  };

  // Send a message through the WebSocket
  const sendMessage = (message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }
    
    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Mark all messages in a conversation as read
  const markMessagesAsRead = (conversationId: string) => {
    setUnreadMessages(prev => ({
      ...prev,
      [conversationId]: 0
    }));
  };

  // Reset unread counter for a conversation
  const resetUnreadCount = (conversationId: string) => {
    setUnreadMessages(prev => ({
      ...prev,
      [conversationId]: 0
    }));
  };

  // Update messages for a specific conversation
  const updateMessagesForConversation = (conversationId: string, messages: MessageResponseModel[]) => {
    setLastMessages(prev => ({
      ...prev,
      [conversationId]: messages.sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      )
    }));
  };

  // Get messages for a specific conversation
  const getMessagesForConversation = (conversationId: string): MessageResponseModel[] => {
    return lastMessages[conversationId] || [];
  };

  // Add a new message to a conversation
  const addNewMessage = (conversationId: string, message: MessageResponseModel) => {
    setLastMessages(prev => {
      const conversationMessages = prev[conversationId] || [];
      
      // Check for duplicates
      const messageExists = conversationMessages.some(
        msg => msg.id === message.id || 
        (msg.content === message.content && 
         msg.user_id === message.user_id && 
         Math.abs(new Date(msg.created_at || "").getTime() - 
                  new Date(message.created_at || "").getTime()) < 5000)
      );
      
      if (messageExists) {
        return prev;
      }
      
      // Add new message and sort
      const updatedMessages = [...conversationMessages, message].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      return {
        ...prev,
        [conversationId]: updatedMessages
      };
    });
    
    // Update conversation order
    updateConversationOrder(conversationId);
  };

  // Update conversations list
  const updateConversations = (newConversations: ConversationResponseModel[]) => {
    setConversations(newConversations);
  };

  // Get conversations list
  const getConversations = (): ConversationResponseModel[] => {
    return conversations;
  };

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      lastMessages,
      unreadMessages,
      sendMessage,
      currentConversationId,
      setCurrentConversationId,
      markMessagesAsRead,
      updateMessagesForConversation,
      getMessagesForConversation,
      resetUnreadCount,
      addNewMessage,
      updateConversations,
      getConversations,
      conversations
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};