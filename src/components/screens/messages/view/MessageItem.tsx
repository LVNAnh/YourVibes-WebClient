"use client";

import React, { useState } from "react";
import { Avatar, Dropdown, Menu, Popconfirm } from "antd";
import { EllipsisOutlined, DeleteOutlined, LikeOutlined } from "@ant-design/icons";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";

interface MessageItemProps {
  message: MessageResponseModel;
  onDelete: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete }) => {
  const { user, localStrings } = useAuth();
  const { brandPrimary, lightGray } = useColor();
  const [hovering, setHovering] = useState(false);
  
  const isMyMessage = message.user_id === user?.id;
  
  // Format timestamp to readable time
  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle message delete
  const handleDelete = () => {
    if (message.id) {
      onDelete(message.id);
    }
  };
  
  // Menu items for message options
  const menuItems = [
    {
      key: "delete",
      label: (
        <Popconfirm
          title={localStrings.Public.ConfirmDeleteMessage || "Delete this message?"}
          onConfirm={handleDelete}
          okText={localStrings.Public.Yes || "Yes"}
          cancelText={localStrings.Public.No || "No"}
        >
          <span>
            <DeleteOutlined style={{ marginRight: 8 }} />
            {localStrings.Public.Delete || "Delete"}
          </span>
        </Popconfirm>
      ),
      style: { padding: "8px 16px" }
    }
  ];
  
  return (
    <div 
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: "flex",
        justifyContent: isMyMessage ? "flex-end" : "flex-start",
        marginBottom: 16,
        position: "relative"
      }}
    >
      {!isMyMessage && (
        <Avatar 
          src={message.user?.avatar_url} 
          size={32}
          style={{ marginRight: 8, alignSelf: "flex-end" }}
        >
          {!message.user?.avatar_url && message.user?.name?.charAt(0)}
        </Avatar>
      )}
      <div 
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          borderRadius: 12,
          background: isMyMessage ? brandPrimary : lightGray,
          color: isMyMessage ? "#fff" : "inherit",
          position: "relative"
        }}
      >
        {!isMyMessage && (
          <div style={{ fontSize: 12, marginBottom: 2, fontWeight: "bold", color: isMyMessage ? "#fff" : "inherit" }}>
            {`${message.user?.family_name || ''} ${message.user?.name || ''}`}
          </div>
        )}
        
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: isMyMessage ? "#fff" : "inherit" }}>
          {message.content}
        </div>
        
        <div style={{ fontSize: 10, textAlign: "right", marginTop: 4, opacity: 0.7 }}>
          {message.isTemporary ? (
            <span>{localStrings.Public.Sending || "Sending..."}</span>
          ) : (
            formatMessageTime(message.created_at || '')
          )}
        </div>
      </div>
      
      {/* Message Options Dropdown (only for the user's own messages) */}
      {isMyMessage && hovering && !message.isTemporary && (
        <Dropdown 
          menu={{ items: menuItems }} 
          trigger={["click"]}
          placement="bottomRight"
        >
          <div
            style={{
              position: "absolute",
              right: "calc(100% - 8px)",
              top: 0,
              cursor: "pointer",
              padding: 4,
              borderRadius: "50%",
              background: "#f0f0f0",
              zIndex: 1
            }}
          >
            <EllipsisOutlined style={{ fontSize: 16 }} />
          </div>
        </Dropdown>
      )}
    </div>
  );
};

export default MessageItem;