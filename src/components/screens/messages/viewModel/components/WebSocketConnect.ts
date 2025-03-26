import { ApiPath } from "@/api/ApiPath";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { useAuth } from "@/context/auth/useAuth";
import { useRef, useEffect, useState, useCallback } from "react";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";

export const useWebSocketConnect = () => {
    const [messages, setMessages] = useState<Record<string, MessageResponseModel[]>>({});
    const { user } = useAuth();
    const [activeFriend, setActiveFriend] = useState<FriendResponseModel | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const sentMessagesRef = useRef<Map<string, string>>(new Map()); 
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    
    useEffect(() => {
        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
          
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);
    
    useEffect(() => {
        if (activeConversationId && user?.id) {
            
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            
            reconnectAttemptsRef.current = 0;
            setIsConnected(false);
            
            connectToWebSocket(activeConversationId);
        }
    }, [activeConversationId, user?.id]);
    
    const initializeConversation = async (conversationId: string) => {
        if (!user?.id) return;
        
        try {
          console.log("Initializing conversation:", conversationId);
          setActiveConversationId(conversationId);
          
          // Disconnect from any existing WebSocket connection
          if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            console.log("Closing existing WebSocket connection");
            wsRef.current.close();
            wsRef.current = null;
          }
          
          // Establish a new WebSocket connection for this conversation
          connectToWebSocket(conversationId);
        } catch (err) {
          console.error("Error initializing conversation:", err);
        }
      };
      
    
    const connectToWebSocket = useCallback((conversationId: string) => {
        if (!user?.id) {
            return;
        }
        
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close();
            wsRef.current = null;
        }
        
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        
        const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}?conversation_id=${conversationId}`;
        
        try {
            const ws = new WebSocket(wsUrl);
            let connectionTimeoutId: NodeJS.Timeout;
            
            connectionTimeoutId = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    ws.close();
                    
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                        setTimeout(() => connectToWebSocket(conversationId), 2000);
                    }
                }
            }, 5000);
            
            ws.onopen = () => {
                clearTimeout(connectionTimeoutId);
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
                
                heartbeatIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "heartbeat" }));
                    } else {
                        if (heartbeatIntervalRef.current) {
                            clearInterval(heartbeatIntervalRef.current);
                            heartbeatIntervalRef.current = null;
                        }
                    }
                }, 30000);
            };
            
            ws.onmessage = (event) => {
                try {
                  console.log("WebSocket message received:", event.data);
                  const messageData = JSON.parse(event.data);
                  
                  if (!messageData.content && !messageData.text) {
                    console.log("Skipping message with no content");
                    return;
                  }
                  
                  const content = messageData.content || messageData.text;
                  const senderId = messageData.user_id || (messageData.user && messageData.user.id);
                  const timestamp = messageData.created_at || new Date().toISOString();
                  const messageId = messageData.id || `${senderId}_${timestamp}`;
                  const conversationId = messageData.conversation_id || activeConversationId;
              
                  if (!conversationId) {
                    console.error("No conversation ID for incoming message");
                    return;
                  }
              
                  console.log("Processing message for conversation:", conversationId);
                  
                  const normalizedMessage: MessageResponseModel = {
                    id: messageId,
                    conversation_id: conversationId,
                    user_id: senderId,
                    content: content,
                    text: content,
                    created_at: timestamp,
                    updated_at: messageData.updated_at || timestamp,
                    user: messageData.user || {
                      id: senderId,
                      name: messageData.sender_name || "Unknown",
                      avatar_url: messageData.sender_avatar || ""
                    },
                    parent_id: messageData.parent_id || messageData.reply_to_id,
                    reply_to: messageData.reply_to,
                    isTemporary: false 
                  };
                  
                  setMessages(prevMessages => {
                    // Make sure we have an array for this conversation
                    const currentMessages = prevMessages[conversationId] || [];
                    
                    // Check if message already exists to avoid duplicates
                    const existingIndex = currentMessages.findIndex(m => m.id === messageId);
                    
                    if (existingIndex >= 0) {
                      // Update existing message
                      const updatedMessages = [...currentMessages];
                      updatedMessages[existingIndex] = {
                        ...updatedMessages[existingIndex],
                        ...normalizedMessage
                      };
                      
                      return {
                        ...prevMessages,
                        [conversationId]: updatedMessages
                      };
                    } else {
                      // Add new message
                      return {
                        ...prevMessages,
                        [conversationId]: [...currentMessages, normalizedMessage]
                      };
                    }
                  });
                } catch (error) {
                  console.error("Error processing WebSocket message:", error);
                }
              };
            
            ws.onerror = (error) => {
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                
                reconnectAttemptsRef.current++;
                if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                    setTimeout(() => {
                        if (wsRef.current === ws) {
                            connectToWebSocket(conversationId);
                        }
                    }, 3000);
                }
            };
            
            ws.onclose = (event) => {
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }
                
                if (wsRef.current === ws) {
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                        setTimeout(() => connectToWebSocket(conversationId), 3000);
                    }
                }
            };
            
            wsRef.current = ws;
        } catch (error) {
        }
    }, [user, activeFriend]);
    
    const sendMessage = useCallback((message: string, replyToMessage?: MessageResponseModel) => {
        if (!activeConversationId || !activeFriend || !message.trim()) {
            return false;
        }
        
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            const tempId = `temp-${Date.now()}`;
            
            const messageObj = {
                type: "message",
                id: tempId,
                conversation_id: activeConversationId,
                content: message,
                user_id: user?.id,
                user: {
                    id: user?.id,
                    name: user?.name || "",
                    family_name: user?.family_name || "",
                    avatar_url: user?.avatar_url || ""
                }
            };
            
            if (replyToMessage) {
                Object.assign(messageObj, {
                    parent_id: replyToMessage.id,
                    parent_content: replyToMessage.text || replyToMessage.content
                });
            }
            
            wsRef.current.send(JSON.stringify(messageObj));
            
            sentMessagesRef.current.set(tempId, message);
            
            return true;
        } catch (error) {
            return false;
        }
    }, [activeConversationId, activeFriend, user, wsRef.current]);
    
    const updateTemporaryMessages = useCallback((conversationId: string) => {
        setMessages(prevMessages => {
          if (!prevMessages[conversationId]) return prevMessages;
          
          const updatedMessages = [...prevMessages[conversationId]];
          let hasChanges = false;
          
          const now = new Date().getTime();
          for (let i = 0; i < updatedMessages.length; i++) {
            const msg = updatedMessages[i];
            if (msg.isTemporary) {
              const createdAt = new Date(msg.created_at || now).getTime();
              const elapsedSeconds = (now - createdAt) / 1000;
              
              if (elapsedSeconds > 5) {
                updatedMessages[i] = {
                  ...msg,
                  isTemporary: false
                };
                hasChanges = true;
              }
            }
          }
          
          if (hasChanges) {
            return {
              ...prevMessages,
              [conversationId]: updatedMessages
            };
          }
          
          return prevMessages;
        });
    }, []);
    
    useEffect(() => {
        if (activeFriend?.id) {
            const intervalId = setInterval(() => {
                updateTemporaryMessages(activeFriend.id || '');
            }, 5000);
            
            return () => clearInterval(intervalId);
        }
    }, [activeFriend, updateTemporaryMessages]);
    
    return {
        messages,
        setMessages,
        activeFriend,
        setActiveFriend,
        wsRef,
        activeConversationId,
        setActiveConversationId,
        connectToWebSocket,
        initializeConversation,
        sendMessage,
        isConnected,
        updateTemporaryMessages
    };
};