"use client";

import React, { useEffect } from 'react';
import { Modal, Button, Avatar, Typography } from 'antd';
import { PhoneOutlined, CloseOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useVideoChat } from '@/context/videoChat/videoChatContext';
import { useAuth } from '@/context/auth/useAuth';

const { Title, Text } = Typography;

const IncomingCallModal: React.FC = () => {
  const { incomingCall, answerCall } = useVideoChat();
  const { isAuthenticated, user } = useAuth();
  
  // Play ringtone when receiving a call
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    
    if (incomingCall) {
      audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(err => console.error('Error playing ringtone:', err));
    }
    
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [incomingCall]);
  
  if (!incomingCall || !isAuthenticated || !user) return null;
  
  // Find caller info from incomingCall.from
  // This is simplified, you would need to fetch user details from your API or store
  const callerName = incomingCall.from; // Replace with actual name lookup logic
  
  return (
    <Modal
      open={!!incomingCall}
      footer={null}
      closable={false}
      centered
      maskClosable={false}
      className="incoming-call-modal"
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Avatar
          size={80}
          src={null} // Replace with caller avatar URL
          style={{ backgroundColor: '#1890ff', marginBottom: 16 }}
        >
          {callerName.charAt(0).toUpperCase()}
        </Avatar>
        
        <Title level={4}>{callerName}</Title>
        <Text type="secondary">
          {incomingCall.callType === 'video' ? 'Video Call' : 'Voice Call'}
        </Text>
        
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', gap: 20 }}>
          <Button
            danger
            size="large"
            shape="circle"
            icon={<CloseOutlined />}
            onClick={() => answerCall(false)}
            style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: 'white' }}
          />
          
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={incomingCall.callType === 'video' ? <VideoCameraOutlined /> : <PhoneOutlined />}
            onClick={() => answerCall(true)}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default IncomingCallModal;