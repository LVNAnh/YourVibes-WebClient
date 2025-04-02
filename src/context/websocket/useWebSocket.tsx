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

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const connectWebSocket = () => {
      try {
        if (wsRef.current) {
          wsRef.current.close();
        }

        const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "ping" }));
              } catch (err) {
              }
            }
          }, 30000);
        };
        
        ws.onmessage = (event) => {
          try {
            if (event.data === "pong" || (typeof event.data === "string" && event.data.includes("pong"))) {
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (!data) {
              return;
            }
            
            if (data.type === "message") {
              const message = data.data;
              if (message.conversation_id) {
                addNewMessage(message.conversation_id, message);
              }
            } else {
              if (data.conversation_id) {
                const formattedMessage = {
                  ...data,
                  isTemporary: false,
                  fromServer: true
                };
                addNewMessage(data.conversation_id, formattedMessage);
              }
            }
          } catch (error) {
          }
        };
        
        ws.onerror = (error) => {
          setIsConnected(false);
        };
        
        ws.onclose = (event) => {
          setIsConnected(false);
          
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          if (event.code !== 1000) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, 5000);
          }
        };
        
        wsRef.current = ws;
      } catch (error) {
        setIsConnected(false);
      }
    };
    
    connectWebSocket();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
      }
    };
    
    if (!visibilityChangeHandled.current) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityChangeHandled.current = true;
    }
    
    return () => {
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

  const addMessageListener = (callback: (conversationId: string, messages: MessageResponseModel[]) => void) => {
    messageListenersRef.current.push(callback);
    return () => {
      messageListenersRef.current = messageListenersRef.current.filter(cb => cb !== callback);
    };
  };

  const notifyMessageListeners = (conversationId: string, messages: MessageResponseModel[]) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, messages);
      } catch (error) {
      }
    });
  };

  const addNewMessage = (conversationId: string, message: MessageResponseModel) => {
    if (!conversationId || !message) {
      return;
    }
    
    setLastMessages(prev => {
      const conversationMessages = prev[conversationId] || [];
      
      const isDuplicate = message.id 
        ? conversationMessages.some(msg => msg.id === message.id)
        : conversationMessages.some(
            msg => 
              msg.content === message.content && 
              msg.user_id === message.user_id &&
              Math.abs(new Date(msg.created_at || "").getTime() - 
                      new Date(message.created_at || "").getTime()) < 2000
          );
      
      if (isDuplicate) {
        return prev;
      }
      
      const formattedMessage = {
        ...message,
        isTemporary: false,
        fromServer: true
      };
      
      const updatedMessages = [...conversationMessages, formattedMessage].sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      notifyMessageListeners(conversationId, updatedMessages);
      
      return {
        ...prev,
        [conversationId]: updatedMessages
      };
    });
    
    if (currentConversationId !== conversationId && message.user_id !== user?.id) {
      setUnreadMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1
      }));
    }
    
    updateConversationOrder(conversationId);
  };

  const updateConversationOrder = (conversationId: string) => {
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
  };

  const sendMessage = (message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  };

  const markMessagesAsRead = (conversationId: string) => {
    setUnreadMessages(prev => ({
      ...prev,
      [conversationId]: 0
    }));
  };

  const resetUnreadCount = (conversationId: string) => {
    setUnreadMessages(prev => ({
      ...prev,
      [conversationId]: 0
    }));
  };

  const updateMessagesForConversation = (conversationId: string, messages: MessageResponseModel[]) => {
    if (!conversationId || !messages || messages.length === 0) return;
    
    const formattedMessages = messages.map(msg => ({
      ...msg,
      isTemporary: false,
      fromServer: true
    }));
    
    setLastMessages(prev => {
      const existingMessages = prev[conversationId] || [];
      
      const messageMap = new Map();
      
      existingMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        }
      });
      
      formattedMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else {
          existingMessages.push(msg);
        }
      });
    
      const uniqueMessages = Array.from(messageMap.values());
      
      const allMessages = [...uniqueMessages, ...existingMessages.filter(msg => !msg.id)];
      
      const finalMessages = allMessages.filter((msg, index, self) => {
        if (!msg.id) {
          return index === self.findIndex(m => 
            m.content === msg.content && 
            m.user_id === msg.user_id &&
            Math.abs(new Date(m.created_at || "").getTime() - 
                    new Date(msg.created_at || "").getTime()) < 2000
          );
        }
        return true; 
      });
      
      const sortedMessages = finalMessages.sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      notifyMessageListeners(conversationId, sortedMessages);
      
      return {
        ...prev,
        [conversationId]: sortedMessages
      };
    });
  };

  const getMessagesForConversation = (conversationId: string): MessageResponseModel[] => {
    return lastMessages[conversationId] || [];
  };

  const updateConversations = (newConversations: ConversationResponseModel[]) => {
    setConversations(newConversations);
  };

  const getConversations = (): ConversationResponseModel[] => {
    return conversations;
  };

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