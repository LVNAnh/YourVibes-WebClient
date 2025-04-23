"use client";

import React from 'react';
import { Button, Tooltip } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useVideoChat } from '@/context/videoChat/videoChatContext';

interface GroupCallButtonProps {
  conversationId: string;
  style?: React.CSSProperties;
}

const GroupCallButton: React.FC<GroupCallButtonProps> = ({ conversationId, style }) => {
  const { createRoom, isConnected, connectToServer } = useVideoChat();

  const handleGroupCall = () => {
    if (!isConnected) {
      connectToServer();
    }
    createRoom(conversationId);
  };

  return (
    <Tooltip title="Group Video Call">
      <Button
        type="primary"
        shape="circle"
        icon={<TeamOutlined />}
        onClick={handleGroupCall}
        style={{
          backgroundColor: '#722ed1',
          ...style
        }}
      />
    </Tooltip>
  );
};

export default GroupCallButton;