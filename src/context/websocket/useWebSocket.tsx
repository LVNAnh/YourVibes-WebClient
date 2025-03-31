"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { ApiPath } from "@/api/ApiPath";
import { useAuth } from '../auth/useAuth';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { ConversationResponseModel } from '@/api/features/messages/models/ConversationModel';
import { WebSocketContextType } from './webSocketContextType';

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
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
  const messageListenersRef = useRef<((conversationId: string, messages: MessageResponseModel[]) => void)[]>([]);

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
            if (event.data === "pong" || (typeof event.data === "string" && event.data.includes("pong"))) {
              return;
            }
            
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);
            
            if (!data) {
              console.warn("Invalid message format received");
              return;
            }
            
            // Process different message types
            if (data.type === "message") {
              // It's a chat message
              const message = data.data;
              if (message.conversation_id) {
                addNewMessage(message.conversation_id, message);
              }
            } else {
              // It's a direct message object (most likely case)
              if (data.conversation_id) {
                // Format the message to ensure consistent structure
                const formattedMessage = {
                  ...data,
                  isTemporary: false,
                  fromServer: true
                };
                addNewMessage(data.conversation_id, formattedMessage);
              }
            }
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

  // Add a message listener
  const addMessageListener = (callback: (conversationId: string, messages: MessageResponseModel[]) => void) => {
    messageListenersRef.current.push(callback);
    return () => {
      messageListenersRef.current = messageListenersRef.current.filter(cb => cb !== callback);
    };
  };

  // Notify all message listeners
  const notifyMessageListeners = (conversationId: string, messages: MessageResponseModel[]) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, messages);
      } catch (error) {
        console.error("Error in message listener:", error);
      }
    });
  };

  // Add a new message to a conversation - enhanced version
  const addNewMessage = (conversationId: string, message: MessageResponseModel) => {
    if (!conversationId || !message) {
      console.warn("Invalid message or conversation ID", conversationId, message);
      return;
    }
    
    console.log("Adding new message to conversation", conversationId, message);
    
    setLastMessages(prev => {
      const conversationMessages = prev[conversationId] || [];
      
      // Debug để xem các tin nhắn hiện tại trong cuộc trò chuyện
      console.log(`Current messages in conversation ${conversationId}:`, 
        conversationMessages.map(msg => ({ 
          id: msg.id, 
          content: msg.content,
          user_id: msg.user_id,
          time: msg.created_at
        }))
      );
      
      // Debug message being checked
      console.log("New message to check:", {
        id: message.id,
        content: message.content,
        user_id: message.user_id,
        time: message.created_at
      });
      
      // Cải thiện logic kiểm tra trùng lặp - chỉ kiểm tra ID nếu có
      const messageExists = message.id 
        ? conversationMessages.some(msg => msg.id === message.id)
        : conversationMessages.some(
            msg => msg.content === message.content && 
                  msg.user_id === message.user_id &&
                  // Chỉ kiểm tra tin nhắn được tạo trong vòng 2 giây
                  Math.abs(new Date(msg.created_at || "").getTime() - 
                          new Date(message.created_at || "").getTime()) < 2000
          );
      
      console.log(`Message duplicate check result: ${messageExists}`);
      
      if (messageExists) {
        console.log("Message already exists, not adding duplicate");
        return prev;
      }
      
      // Add new message, ensure it's properly formatted
      const formattedMessage = {
        ...message,
        isTemporary: false,
        fromServer: true
      };
      
      // Add new message and sort
      const updatedMessages = [...conversationMessages, formattedMessage].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      console.log("Updated messages for conversation:", 
        updatedMessages.map(msg => ({ id: msg.id, content: msg.content, user_id: msg.user_id }))
      );
      
      // Notify listeners about new message
      notifyMessageListeners(conversationId, updatedMessages);
      
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
    }
    
    // Update conversation order
    updateConversationOrder(conversationId);
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
      return false;
    }
    
    try {
      console.log("Sending WebSocket message:", message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
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
    if (!conversationId || !messages) return;
    
    // Format incoming messages to ensure consistent structure
    const formattedMessages = messages.map(msg => ({
      ...msg,
      isTemporary: false,
      fromServer: true
    }));
    
    setLastMessages(prev => {
      // Get existing messages
      const existingMessages = prev[conversationId] || [];
      
      // Merge existing and new messages
      const allMessages = [...existingMessages, ...formattedMessages];
      
      // Remove duplicates based on ID uniqueness
      const uniqueMessages = Array.from(
        new Map(allMessages.map(item => [item.id, item])).values()
      );
      
      // Sort by timestamp
      const sortedMessages = uniqueMessages.sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      // Notify listeners about updated messages
      notifyMessageListeners(conversationId, sortedMessages);
      
      return {
        ...prev,
        [conversationId]: sortedMessages
      };
    });
  };

  // Get messages for a specific conversation
  const getMessagesForConversation = (conversationId: string): MessageResponseModel[] => {
    return lastMessages[conversationId] || [];
  };

  // Update conversations list
  const updateConversations = (newConversations: ConversationResponseModel[]) => {
    setConversations(newConversations);
  };

  // Get conversations list
  const getConversations = (): ConversationResponseModel[] => {
    return conversations;
  };

  // Create the context value
  const contextValue: WebSocketContextType = {
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
    conversations,
    addMessageListener
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
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