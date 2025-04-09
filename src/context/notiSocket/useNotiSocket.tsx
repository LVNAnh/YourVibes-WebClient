"use client"
import useTypeNotification from "@/hooks/useTypeNotification";
import { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import { ApiPath } from "@/api/ApiPath";
import { notification } from "antd";

export interface WebSocketNotiContextType {
    connectSocketNotification: () => void;
}

const WebSocketNotiContext = createContext<WebSocketNotiContextType | null>(null);

export const WebSocketNotiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, localStrings } = useAuth();
    const wsNotificationRef = useRef<WebSocket | null>(null);
    const { LIKE_POST, NEW_SHARE, NEW_COMMENT, FRIEND_REQUEST, ACCEPT_FRIEND_REQUEST, NEW_POST, LIKE_COMMENT } = useTypeNotification();

    const mapNotifiCationContent = (type: string) => {
        switch (type) {
            case LIKE_POST: return localStrings.Notification.Items.LikePost;
            case NEW_SHARE: return localStrings.Notification.Items.SharePost;
            case NEW_COMMENT: return localStrings.Notification.Items.CommentPost;
            case FRIEND_REQUEST: return localStrings.Notification.Items.Friend;
            case ACCEPT_FRIEND_REQUEST: return localStrings.Notification.Items.AcceptFriend;
            case NEW_POST: return localStrings.Notification.Items.NewPost;
            case LIKE_COMMENT: return localStrings.Notification.Items.LikeComment;
            default: return "notifications";
        }
    };
    const connectSocketNotification = () => {
        if (!user?.id || wsNotificationRef.current) return;

        const ws = new WebSocket(`${ApiPath.GET_WS_PATH_NOTIFICATION}${user.id}`);
        wsNotificationRef.current = ws;

        ws.onopen = () => console.log("🔗 WebSocket Notification connected");

        ws.onmessage = (e) => {
            const notificationData = JSON.parse(e.data);
            const { from: userName, content, notification_type: type } = notificationData;
            const notificationContent = mapNotifiCationContent(type);

            const key = `open${Date.now()}`;
            notification.open({
                message: `${userName} ${notificationContent}`,
                description: content,
                placement: "topRight",
                key,
                duration: 5,
            });
        };

        ws.onclose = (e) => {
            console.log("❌ WebSocket Notification disconnected:", e.reason);
            wsNotificationRef.current = null;
        };

        ws.onerror = (error) => {
            console.error("⚠️ WebSocket Notification error:", error);
            // Toast.show({
            //     type: "error",
            //     text1: "Lỗi WebSocket",
            //     text2: "Không thể kết nối WebSocket.",
            // });
        };
    };

    useEffect(() => {
        if (user?.id) {
            connectSocketNotification();
        } else {
            wsNotificationRef.current?.close();
            wsNotificationRef.current = null;
        }

        return () => {
            wsNotificationRef.current?.close();
            wsNotificationRef.current = null;
        };
    }, [user?.id]);

    return (
        <WebSocketNotiContext.Provider value={{ connectSocketNotification }}>
            {children}
        </WebSocketNotiContext.Provider>
    );
}

export const useWebSocketNoti = (): WebSocketNotiContextType => {
    const context = useContext(WebSocketNotiContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
};