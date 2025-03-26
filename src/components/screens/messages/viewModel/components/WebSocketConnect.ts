import { ApiPath } from "@/api/ApiPath";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { ConversationWithMembers } from "./ConversationViewModel";
import { useAuth } from "@/context/auth/useAuth";
import { useRef, useEffect, useState, useCallback } from "react";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";

export const useWebSocketConnect = () => {
    // The messages state object - key is conversation ID, value is array of messages
    const [messages, setMessages] = useState<Record<string, MessageResponseModel[]>>({});
    const { user } = useAuth();
    
    // Refs to maintain stable connections
    const activeConvIdRef = useRef<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeConversation, setActiveConversation] = useState<ConversationWithMembers | null>(null);
    
    // Connection state tracking
    const wsRef = useRef<WebSocket | null>(null);
    const sentMessagesRef = useRef<Map<string, string>>(new Map());
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    
    // Critical connection stability flags
    const isConnectingRef = useRef(false);
    const lastMessageFetchRef = useRef<Record<string, number>>({});
    const minimumFetchInterval = 5000; // 5 seconds minimum between fetches
    
    // Keep active conversation ID ref in sync with state
    useEffect(() => {
        activeConvIdRef.current = activeConversationId;
    }, [activeConversationId]);
    
    // Cleanup when component unmounts
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
    
    // Initialize conversation
    const initializeConversation = useCallback((conversationId: string) => {
        // Skip if no change
        if (activeConvIdRef.current === conversationId) return;
        
        console.log("Initializing conversation:", conversationId);
        activeConvIdRef.current = conversationId;
        setActiveConversationId(conversationId);
        
        // Connect to WebSocket with a small delay to prevent race conditions
        setTimeout(() => {
            connectToWebSocket(conversationId);
        }, 50);
    }, []);
    
    // Connect to WebSocket for a specific conversation
    const connectToWebSocket = useCallback((conversationId: string) => {
        if (!user?.id || !conversationId) return;
        
        // Critical: prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log("Connection attempt already in progress, skipping");
            return;
        }
        
        // Skip reconnection if already connected to this conversation
        if (wsRef.current && 
            wsRef.current.readyState === WebSocket.OPEN && 
            activeConvIdRef.current === conversationId) {
            console.log("Already connected to this conversation");
            return;
        }
        
        console.log("Connecting to WebSocket for conversation:", conversationId);
        isConnectingRef.current = true;
        
        // Close existing connection if any
        if (wsRef.current) {
            console.log("Closing existing WebSocket connection");
            wsRef.current.close();
            wsRef.current = null;
        }
        
        // Clear existing heartbeat
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        
        // Save the active conversation ID
        activeConvIdRef.current = conversationId;
        
        const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}?conversation_id=${conversationId}`;
        console.log("WebSocket URL:", wsUrl);
        
        try {
            const ws = new WebSocket(wsUrl);
            let connectionTimeoutId: NodeJS.Timeout;
            
            // Set connection timeout
            connectionTimeoutId = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.log("Connection timeout, closing socket");
                    ws.close();
                    isConnectingRef.current = false;
                    
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts && 
                        activeConvIdRef.current === conversationId) {
                        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                        console.log(`Reconnection attempt ${reconnectAttemptsRef.current} in ${backoffTime}ms`);
                        setTimeout(() => connectToWebSocket(conversationId), backoffTime);
                    }
                }
            }, 5000);
            
            ws.onopen = () => {
                console.log("WebSocket connection opened successfully");
                clearTimeout(connectionTimeoutId);
                setIsConnected(true);
                isConnectingRef.current = false;
                reconnectAttemptsRef.current = 0;
                
                // Set up heartbeat
                heartbeatIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        try {
                            ws.send(JSON.stringify({ type: "heartbeat" }));
                        } catch (e) {
                            console.error("Error sending heartbeat:", e);
                        }
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
                    const messageData = JSON.parse(event.data);
                    
                    // Ignore heartbeat responses
                    if (messageData.type === "heartbeat_response") {
                        return;
                    }
                    
                    // Ignore messages without content
                    if (!messageData.content && !messageData.text) {
                        return;
                    }
                    
                    // Process regular messages
                    const content = messageData.content || messageData.text;
                    const senderId = messageData.user_id || (messageData.user && messageData.user.id);
                    const timestamp = messageData.created_at || new Date().toISOString();
                    const messageId = messageData.id || `${senderId}_${timestamp}`;
                    const conversationId = messageData.conversation_id || activeConvIdRef.current;
                    
                    if (!conversationId) return;
                    
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
                        const updatedMessages = { ...prevMessages };
                        
                        if (!updatedMessages[conversationId]) {
                            updatedMessages[conversationId] = [];
                        }
                        
                        const existingMsgIndex = updatedMessages[conversationId].findIndex(
                            msg => msg.id === messageId
                        );

                        if (existingMsgIndex !== -1) {
                            const newMessagesArray = [...updatedMessages[conversationId]];
                            newMessagesArray[existingMsgIndex] = {
                                ...newMessagesArray[existingMsgIndex],
                                ...normalizedMessage,
                                isTemporary: false
                            };
                            updatedMessages[conversationId] = newMessagesArray;
                        } 
                        else if (senderId === user?.id) {
                            let foundTempMessage = false;
                            const newMessagesArray = [...updatedMessages[conversationId]];
                            
                            for (let i = 0; i < newMessagesArray.length; i++) {
                                const msg = newMessagesArray[i];
                                if (msg.isTemporary && 
                                    (msg.text === content || msg.content === content ||
                                     sentMessagesRef.current.has(msg.id || '') && 
                                     sentMessagesRef.current.get(msg.id || '') === content)) {
                                    
                                    newMessagesArray[i] = {
                                        ...msg,
                                        ...normalizedMessage,
                                        id: messageId, 
                                        isTemporary: false
                                    };
                                    
                                    foundTempMessage = true;
                                    break;
                                }
                            }
                            
                            if (foundTempMessage) {
                                updatedMessages[conversationId] = newMessagesArray;
                            } else {
                                updatedMessages[conversationId] = [...newMessagesArray, normalizedMessage];
                            }
                        } else {
                            updatedMessages[conversationId] = [...updatedMessages[conversationId], normalizedMessage];
                        }
                        
                        return updatedMessages;
                    });
                } catch (error) {
                    console.error("Error processing WebSocket message:", error);
                }
            };
            
            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                isConnectingRef.current = false;
                
                if (wsRef.current === ws) {
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts && 
                        activeConvIdRef.current === conversationId) {
                        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                        console.log(`Reconnection attempt ${reconnectAttemptsRef.current} in ${backoffTime}ms`);
                        setTimeout(() => connectToWebSocket(conversationId), backoffTime);
                    }
                }
            };
            
            ws.onclose = (event) => {
                console.log(`WebSocket closed with code ${event.code} and reason ${event.reason}`);
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                isConnectingRef.current = false;
                
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }
                
                // Only reconnect if this was the active connection and for the current conversation
                if (wsRef.current === ws && activeConvIdRef.current === conversationId) {
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                        console.log(`Reconnection attempt ${reconnectAttemptsRef.current} in ${backoffTime}ms`);
                        setTimeout(() => connectToWebSocket(conversationId), backoffTime);
                    }
                }
            };
            
            wsRef.current = ws;
        } catch (error) {
            console.error("Error creating WebSocket connection:", error);
            isConnectingRef.current = false;
        }
    }, [user]);
    
    // Fetch messages with throttling to prevent excessive API calls
    const fetchMessages = useCallback(async (conversationId: string) => {
        if (!conversationId) return null;
        
        // Check if we've fetched this conversation recently
        const now = Date.now();
        const lastFetch = lastMessageFetchRef.current[conversationId] || 0;
        
        if (now - lastFetch < minimumFetchInterval) {
            console.log(`Throttling message fetch for conversation ${conversationId}. Last fetch was ${now - lastFetch}ms ago`);
            return Promise.resolve(messages[conversationId] || []);
        }
        
        // Update last fetch time
        lastMessageFetchRef.current[conversationId] = now;
        console.log(`Fetching messages for conversation ${conversationId}`);
        
        try {
            const response = await defaultMessagesRepo.getMessagesByConversationId({
                conversation_id: conversationId,
                page: 1,
                limit: 100,
            });
            
            if (response.data) {
                const fetchedMessages = Array.isArray(response.data) 
                    ? response.data as MessageResponseModel[] 
                    : [response.data as MessageResponseModel];
                
                console.log(`Received ${fetchedMessages.length} messages for conversation ${conversationId}`);
                
                const normalizedMessages = fetchedMessages.map(msg => ({
                    ...msg,
                    text: msg.content || msg.text,
                    content: msg.content || msg.text,
                    isTemporary: false 
                }));
                
                const sortedMessages = normalizedMessages.sort(
                    (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
                );
                
                // Check if this is still the active conversation
                if (activeConvIdRef.current === conversationId) {
                    setMessages(prevMessages => {
                        const newMessages = { ...prevMessages };
                        newMessages[conversationId] = sortedMessages;
                        return newMessages;
                    });
                }
                
                return sortedMessages;
            }
        } catch (err) {
            console.error(`Error fetching messages for conversation ${conversationId}:`, err);
        }
        
        return messages[conversationId] || [];
    }, [messages]);
    
    // Send a message through WebSocket
    const sendMessage = useCallback((message: string, conversationId: string, replyToMessage?: MessageResponseModel) => {
        if (!conversationId || !message.trim()) {
            return false;
        }
        
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.log("WebSocket not connected, cannot send message");
            return false;
        }
        
        try {
            const tempId = `temp-${Date.now()}`;
            
            const messageObj = {
                type: "message",
                id: tempId,
                conversation_id: conversationId,
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
            console.error("Error sending message via WebSocket:", error);
            return false;
        }
    }, [user]);
    
    // Update temporary messages (mark as sent)
    const updateTemporaryMessages = useCallback((conversationId: string) => {
        if (!conversationId) return;
        
        setMessages(prevMessages => {
            const messagesForConversation = prevMessages[conversationId];
            if (!messagesForConversation) return prevMessages;
            
            // Check if there are any temporary messages
            const hasTemporaryMessages = messagesForConversation.some(msg => msg.isTemporary);
            if (!hasTemporaryMessages) return prevMessages;
            
            // Update temporary messages
            const updatedMessages = messagesForConversation.map(msg => {
                if (msg.isTemporary) {
                    const createdAt = new Date(msg.created_at || new Date()).getTime();
                    const now = new Date().getTime();
                    const elapsedSeconds = (now - createdAt) / 1000;
                    
                    if (elapsedSeconds > 5) {
                        return {
                            ...msg,
                            isTemporary: false
                        };
                    }
                }
                return msg;
            });
            
            return {
                ...prevMessages,
                [conversationId]: updatedMessages
            };
        });
    }, []);
    
    return {
        messages,
        setMessages,
        activeConversation,
        setActiveConversation,
        wsRef,
        activeConversationId,
        setActiveConversationId,
        connectToWebSocket,
        initializeConversation,
        sendMessage,
        isConnected,
        updateTemporaryMessages,
        fetchMessages
    };
};