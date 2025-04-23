// src/context/socket/useSocket.tsx
"use client";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { SocketContextType } from "./socketContextType";
import { useAuth } from "../auth/useAuth";
import { MessageWebSocketResponseModel } from "@/api/features/messages/models/MessageModel";
import useTypeNotification from "@/hooks/useTypeNotification";
import { ApiPath } from "@/api/ApiPath";
import { notification } from "antd";

const WebSocketContext = createContext<SocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, localStrings } = useAuth();
    const [socketMessages, setSocketMessages] = useState<MessageWebSocketResponseModel[]>([]);
    const processedMessagesRef = useRef<Set<string>>(new Set());

    const MAX_CONNECTION_ATTEMPTS = 3;
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [connectionAttemptsNotification, setConnectionAttemptsNotification] = useState(0);

    // Sử dụng useRef để lưu trữ WebSocket
    const wsMessageRef = useRef<WebSocket | null>(null);
    const wsNotificationRef = useRef<WebSocket | null>(null);

    const notificationType = useTypeNotification();

    const mapNotifiCationContent = (type: string) => {
        switch (type) {
            case notificationType.LIKE_POST: return localStrings.Notification.Items.LikePost;
            case notificationType.NEW_SHARE: return localStrings.Notification.Items.SharePost;
            case notificationType.NEW_COMMENT: return localStrings.Notification.Items.CommentPost;
            case notificationType.FRIEND_REQUEST: return localStrings.Notification.Items.Friend;
            case notificationType.ACCEPT_FRIEND_REQUEST: return localStrings.Notification.Items.AcceptFriend;
            case notificationType.NEW_POST: return localStrings.Notification.Items.NewPost;
            case notificationType.LIKE_COMMENT: return localStrings.Notification.Items.LikeComment;
            case notificationType.NEW_POST_PERSONAL: return localStrings.Notification.Items.NewPostPersonal;
            case notificationType.BLOCK_CREATE_POST: return localStrings.Notification.Items.BlockCreatePost;
            case notificationType.DEACTIVATE_POST: return localStrings.Notification.Items.DeactivatePostContent;
            case notificationType.ACTIVACE_POST: return localStrings.Notification.Items.ActivacePostContent;
            case notificationType.DEACTIVATE_COMMENT: return localStrings.Notification.Items.DeactivateCommentContent;
            case notificationType.ACTIVACE_COMMENT: return localStrings.Notification.Items.ActivaceCommentContent;
            default: return localStrings.Notification.Notification;
        }
    };

    const isMessageProcessed = (message: MessageWebSocketResponseModel): boolean => {
        if (!message) return true;
        
        // Tạo ID duy nhất cho tin nhắn
        const messageId = message.id || '';
        const uniqueId = `${message.conversation_id}-${message.user_id}-${message.content}-${message.created_at}`;
        
        return processedMessagesRef.current.has(messageId) || 
               processedMessagesRef.current.has(uniqueId);
    };

    const markMessageAsProcessed = (message: MessageWebSocketResponseModel) => {
        if (!message) return;
        
        const messageId = message.id || '';
        const uniqueId = `${message.conversation_id}-${message.user_id}-${message.content}-${message.created_at}`;
        
        // Thêm vào set các message đã xử lý
        if (messageId) processedMessagesRef.current.add(messageId);
        processedMessagesRef.current.add(uniqueId);
        
        // Giữ kích thước set trong giới hạn để tránh memory leak
        if (processedMessagesRef.current.size > 500) {
            const oldestEntries = Array.from(processedMessagesRef.current).slice(0, 200);
            oldestEntries.forEach(entry => processedMessagesRef.current.delete(entry));
        }
    };

    const connectSocketMessage = () => {
        if (!user?.id || wsMessageRef.current) return; 

        const ws = new WebSocket(`${ApiPath.GET_WS_PATH_MESSAGE}${user.id}`);
        wsMessageRef.current = ws;

        ws.onopen = () => {
            console.log("🔗 WebSocket Message connected");
            setSocketMessages([]); 
            setConnectionAttempts(0); // Reset connection attempts on successful connection
        };

        ws.onmessage = (e) => {
            try {
                console.log("📩 WebSocket Message received:", e.data);
                const message = JSON.parse(e.data);
                
                // Kiểm tra tin nhắn đã xử lý chưa
                if (isMessageProcessed(message)) {
                    console.log("Duplicate message detected, ignoring:", message);
                    return;
                }
                
                // Đánh dấu đã xử lý
                markMessageAsProcessed(message);
                
                // Thêm tin nhắn vào state
                setSocketMessages(prev => {
                    // Kiểm tra lại một lần nữa để đảm bảo không có tin nhắn trùng lặp
                    const duplicate = prev.some(m => 
                        m.id === message.id || 
                        (m.content === message.content && 
                         m.user_id === message.user_id && 
                         m.conversation_id === message.conversation_id &&
                         Math.abs(new Date(m.created_at || "").getTime() - 
                               new Date(message.created_at || "").getTime()) < 5000)
                    );
                    
                    if (duplicate) {
                        console.log("Duplicate found in state, not adding:", message);
                        return prev;
                    }
                    
                    // Chỉ giữ tối đa 50 tin nhắn gần nhất trong state
                    return [message, ...prev.slice(0, 49)];
                });
                
                // Hiển thị notification nếu người gửi không phải là user hiện tại
                if (message?.user?.id !== user?.id) {
                    notification.open({
                        message: `${message?.user?.name} đã gửi cho bạn một tin nhắn`,
                        placement: "topRight",
                        duration: 5,
                    });
                }
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        ws.onclose = (e) => {
            console.log("❌ WebSocket Message disconnected:", e.reason, e.code);
            wsMessageRef.current = null;
            setConnectionAttempts(prevAttempts => {
                const newAttempts = prevAttempts + 1;
                if (newAttempts < MAX_CONNECTION_ATTEMPTS) {
                    setTimeout(() => connectSocketMessage(), 2000); // Thử lại sau 2 giây
                }
                return newAttempts;
            });
        };

        ws.onerror = (error) => {
            console.error("⚠️ WebSocket Message error:", error);
        };
    };

    const connectSocketNotification = () => {
        if (!user?.id || wsNotificationRef.current) return;

        const ws = new WebSocket(`${ApiPath.GET_WS_PATH_NOTIFICATION}${user.id}`);
        wsNotificationRef.current = ws;

        ws.onopen = () => {
            console.log("🔗 WebSocket Notification connected");
            setConnectionAttemptsNotification(0); // Reset connection attempts
        };

        ws.onmessage = (e) => {
            try {
                const notificationData = JSON.parse(e.data);
                const { from: userName, content, notification_type: type } = notificationData;
                const notificationContent = mapNotifiCationContent(type);

                const getDescription = (content: string) => {
                    if (content.includes("violence")) {
                        return localStrings.Notification.Items.violence;
                    }
                    if (content.includes("nsfw")) {
                        return localStrings.Notification.Items.nsfw;
                    }
                    if (content.includes("political")) {
                        return localStrings.Notification.Items.political;
                    }
                    return content;
                };
                
                const key = `notification-${Date.now()}`;
                notification.open({
                    message: `${userName} ${notificationContent}`,
                    description: getDescription(content),
                    placement: "topRight",
                    key,
                    duration: 5,
                });
            } catch (error) {
                console.error("Error processing notification:", error);
            }
        };

        ws.onclose = (e) => {
            console.log("❌ WebSocket Notification disconnected:", e.reason);
            wsNotificationRef.current = null;
            setConnectionAttemptsNotification(prevAttempts => {
                const newAttempts = prevAttempts + 1;
                if (newAttempts < MAX_CONNECTION_ATTEMPTS) {
                    setTimeout(() => connectSocketNotification(), 5000); // Thử lại sau 5 giây
                }
                return newAttempts;
            });
        };

        ws.onerror = (error) => {
            console.error("⚠️ WebSocket Notification error:", error);
        };
    };

    const sendSocketMessage = (message: MessageWebSocketResponseModel): boolean => {
        if (!wsMessageRef.current || wsMessageRef.current.readyState !== WebSocket.OPEN) {
            console.log("WebSocket not connected, cannot send message");
            return false;
        }
      
        try {
            wsMessageRef.current.send(JSON.stringify({
                type: "message",
                data: message
            }));
            return true;
        } catch (err) {
            console.error("Failed to send message via WebSocket:", err);
            return false;
        }
    };

    // Khởi tạo WebSocket khi user thay đổi
    useEffect(() => {
        if (user?.id) {
            connectSocketNotification();
            connectSocketMessage();
        }

        return () => {
            // Cleanup khi component unmount hoặc user thay đổi
            if (wsMessageRef.current) {
                wsMessageRef.current.close();
                wsMessageRef.current = null;
            }
            if (wsNotificationRef.current) {
                wsNotificationRef.current.close();
                wsNotificationRef.current = null;
            }
            // Reset các state và cache
            setSocketMessages([]);
            processedMessagesRef.current.clear();
        };
    }, [user?.id]);

    return (
        <WebSocketContext.Provider value={{ 
            socketMessages, 
            setSocketMessages, 
            connectSocketMessage, 
            connectSocketNotification, 
            sendSocketMessage 
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = (): SocketContextType => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
};