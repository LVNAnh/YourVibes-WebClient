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
            console.log("Cleanup WebSocket và heartbeat interval");
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
            console.log("activeConversationId thay đổi:", activeConversationId);
            
            if (wsRef.current) {
                console.log("Đóng kết nối WebSocket hiện tại do conversationId thay đổi");
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
            console.log("Khởi tạo cuộc trò chuyện với ID:", conversationId);
            setActiveConversationId(conversationId);
        } catch (err) {
            console.error("Lỗi khi khởi tạo cuộc trò chuyện", err);
        }
    };
    
    const connectToWebSocket = useCallback((conversationId: string) => {
        if (!user?.id) {
            console.error("Không thể kết nối WebSocket: user.id không tồn tại");
            return;
        }
        
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            console.log("Đóng kết nối WebSocket hiện tại trước khi tạo mới");
            wsRef.current.close();
            wsRef.current = null;
        }
        
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        
        const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}?conversation_id=${conversationId}`;
        console.log("Đang kết nối tới WebSocket URL:", wsUrl);
        
        try {
            const ws = new WebSocket(wsUrl);
            let connectionTimeoutId: NodeJS.Timeout;
            
            connectionTimeoutId = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.log("Kết nối WebSocket hết thời gian chờ, đang thử lại...");
                    ws.close();
                    
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                        setTimeout(() => connectToWebSocket(conversationId), 2000);
                    } else {
                        console.error("Đã đạt đến số lần thử kết nối tối đa");
                    }
                }
            }, 5000);
            
            ws.onopen = () => {
                console.log("Kết nối WebSocket thành công");
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
                console.log("Đã nhận tin nhắn WebSocket:", event.data);
                try {
                    const messageData = JSON.parse(event.data);
                    
                    if (!messageData.content && !messageData.text) {
                        console.log("Tin nhắn không chứa nội dung, có thể là heartbeat");
                        return;
                    }
                    
                    const content = messageData.content || messageData.text;
                    const senderId = messageData.user_id || (messageData.user && messageData.user.id);
                    const timestamp = messageData.created_at || new Date().toISOString();
                    const messageId = messageData.id || `${senderId}_${timestamp}`;

                    console.log("Xử lý tin nhắn:", { 
                        messageId, 
                        senderId, 
                        content: content.substring(0, 20) + (content.length > 20 ? "..." : "") 
                    });
                    
                    const friendId = senderId === user?.id 
                        ? (activeFriend?.id || '') 
                        : senderId;
                    
                    const normalizedMessage: MessageResponseModel = {
                        id: messageId,
                        conversation_id: messageData.conversation_id || activeConversationId,
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
                        
                        if (!updatedMessages[friendId]) {
                            updatedMessages[friendId] = [];
                            console.log(`Tạo mới danh sách tin nhắn cho friend ${friendId}`);
                        }
                        
                        const existingMsgIndex = updatedMessages[friendId].findIndex(
                            msg => msg.id === messageId
                        );

                        if (existingMsgIndex !== -1) {
                            console.log("Tin nhắn đã tồn tại, cập nhật thông tin");
                            updatedMessages[friendId][existingMsgIndex] = {
                                ...updatedMessages[friendId][existingMsgIndex],
                                ...normalizedMessage,
                                isTemporary: false
                            };
                        } 
                        else if (senderId === user?.id) {
                            let foundTempMessage = false;
                            
                            for (let i = 0; i < updatedMessages[friendId].length; i++) {
                                const msg = updatedMessages[friendId][i];
                                if (msg.isTemporary && 
                                    (msg.text === content || msg.content === content ||
                                     sentMessagesRef.current.has(msg.id || '') && 
                                     sentMessagesRef.current.get(msg.id || '') === content)) {
                                    
                                    console.log("Đã tìm thấy và cập nhật tin nhắn tạm thời:", msg.id);
                                    
                                    updatedMessages[friendId][i] = {
                                        ...msg,
                                        ...normalizedMessage,
                                        id: messageId, 
                                        isTemporary: false
                                    };
                                    
                                    foundTempMessage = true;
                                    break;
                                }
                            }
                            
                            if (!foundTempMessage) {
                                console.log("Thêm tin nhắn mới của mình vào danh sách (không tìm thấy tạm thời)");
                                updatedMessages[friendId].push(normalizedMessage);
                            }
                        } else {
                            console.log("Thêm tin nhắn mới từ người khác vào danh sách");
                            updatedMessages[friendId].push(normalizedMessage);
                        }
                        
                        console.log(`Sau khi cập nhật, có ${updatedMessages[friendId].length} tin nhắn với friend ${friendId}`);
                        return updatedMessages;
                    });
                } catch (error) {
                    console.error("Lỗi khi xử lý tin nhắn WebSocket:", error);
                }
            };
            
            ws.onerror = (error) => {
                console.error("Lỗi WebSocket:", error);
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                
                reconnectAttemptsRef.current++;
                if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                    setTimeout(() => {
                        if (wsRef.current === ws) {
                            console.log("Đang kết nối lại sau lỗi WebSocket...");
                            connectToWebSocket(conversationId);
                        }
                    }, 3000);
                }
            };
            
            ws.onclose = (event) => {
                console.log("Kết nối WebSocket đã đóng", event.code, event.reason);
                clearTimeout(connectionTimeoutId);
                setIsConnected(false);
                
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }
                
                if (wsRef.current === ws) {
                    console.log("Kết nối đã đóng bất ngờ, đang kết nối lại...");
                    reconnectAttemptsRef.current++;
                    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
                        setTimeout(() => connectToWebSocket(conversationId), 3000);
                    }
                }
            };
            
            wsRef.current = ws;
        } catch (error) {
            console.error("Lỗi khi khởi tạo WebSocket:", error);
        }
    }, [user, activeFriend]);
    
    const sendMessage = useCallback((message: string, replyToMessage?: MessageResponseModel) => {
        if (!activeConversationId || !activeFriend || !message.trim()) {
            console.error("Không thể gửi tin nhắn: thiếu thông tin cần thiết");
            return false;
        }
        
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error("Không thể gửi tin nhắn qua WebSocket: kết nối không sẵn sàng");
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
            
            console.log("Gửi tin nhắn qua WebSocket:", messageObj);
            
            wsRef.current.send(JSON.stringify(messageObj));
            
            sentMessagesRef.current.set(tempId, message);
            
            return true;
        } catch (error) {
            console.error("Lỗi khi gửi tin nhắn qua WebSocket:", error);
            return false;
        }
    }, [activeConversationId, activeFriend, user, wsRef.current]);
    
    const updateTemporaryMessages = useCallback((friendId: string) => {
        setMessages(prevMessages => {
            if (!prevMessages[friendId]) return prevMessages;
            
            const updatedMessages = [...prevMessages[friendId]];
            let hasChanges = false;
            
            const now = new Date().getTime();
            for (let i = 0; i < updatedMessages.length; i++) {
              const msg = updatedMessages[i];
              if (msg.isTemporary) {
                  const createdAt = new Date(msg.created_at || now).getTime();
                  const elapsedSeconds = (now - createdAt) / 1000;
                  
                  if (elapsedSeconds > 0.2) {
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
                    [friendId]: updatedMessages
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