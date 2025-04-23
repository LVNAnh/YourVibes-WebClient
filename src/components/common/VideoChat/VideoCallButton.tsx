"use client";

import React from 'react';
import { useVideoChat } from '@/context/videoChat/videoChatContext';
import { Button, Tooltip } from 'antd';
import { VideoCameraOutlined, PhoneOutlined } from '@ant-design/icons';

interface VideoCallButtonProps {
  userId: string;
  buttonType?: 'video' | 'audio';
  conversationId?: string;
  style?: React.CSSProperties;
}

const VideoCallButton: React.FC<VideoCallButtonProps> = ({
  userId,
  buttonType = 'video',
  conversationId,
  style
}) => {
  const { callUser, createRoom, onlineUsers, isConnected, connectToServer } = useVideoChat();

  const handleCall = () => {
    if (!isConnected) {
      connectToServer();
    }
    
    if (conversationId) {
      // For group calls in a conversation
      createRoom(conversationId);
    } else {
      // For 1-on-1 calls with a specific user
      callUser(userId, buttonType);
    }
  };

  const isUserOnline = onlineUsers.includes(userId);
  
  return (
    <Tooltip title={buttonType === 'video' ? 'Video Call' : 'Voice Call'}>
      <Button
        type="primary"
        shape="circle"
        icon={buttonType === 'video' ? <VideoCameraOutlined /> : <PhoneOutlined />}
        onClick={handleCall}
        disabled={!isUserOnline && !conversationId}
        style={{
          backgroundColor: buttonType === 'video' ? '#1890ff' : '#52c41a',
          ...style
        }}
      />
    </Tooltip>
  );
};

export default VideoCallButton;