"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Row, Col, Avatar, Typography } from 'antd';
import { PhoneOutlined, AudioMutedOutlined, VideoCameraOutlined, DesktopOutlined } from '@ant-design/icons';
import { useVideoChat } from '@/context/videoChat/videoChatContext';
import { useAuth } from '@/context/auth/useAuth';

const { Text } = Typography;

const VideoCallModal: React.FC = () => {
  const { currentCall, localStream, remoteStreams, endCall } = useVideoChat();
  const { user } = useAuth();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Set up local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Set up remote video streams
  useEffect(() => {
    if (remoteStreams.size > 0) {
      remoteStreams.forEach((stream, userId) => {
        if (remoteVideoRefs.current[userId] && stream) {
          remoteVideoRefs.current[userId]!.srcObject = stream;
        }
      });
    }
  }, [remoteStreams]);
  
  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (currentCall && currentCall.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentCall]);
  
  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Toggle audio
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // Toggle screen sharing
  const toggleScreenSharing = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and revert to camera
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => track.stop());
        
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
          
          // Replace video tracks in peer connections
          const videoTrack = newStream.getVideoTracks()[0];
          Object.values(remoteVideoRefs.current).forEach(ref => {
            if (ref && ref.srcObject) {
              const stream = ref.srcObject as MediaStream;
              const peerConnection = (ref.srcObject as MediaStream).getVideoTracks()[0];
                if (peerConnection) {
                const sender = Object.values(peersRef.current).find(peer => 
                    peer && (peer as any)._pc && (peer as any)._pc.getSenders
                );
                if (sender) {
                    const videoSender = (sender as any)._pc.getSenders().find((s: RTCRtpSender) => 
                    s.track && s.track.kind === 'video'
                    );
                    if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                    }
                }
                }
            }
          });
          
          setIsScreenSharing(false);
        } catch (error) {
          console.error('Error reverting to camera:', error);
        }
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Replace video tracks in peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(remoteVideoRefs.current).forEach(ref => {
          if (ref && ref.srcObject) {
            const stream = ref.srcObject as MediaStream;
            const peerConnection = (ref.srcObject as MediaStream).getVideoTracks()[0];
                if (peerConnection) {
                const sender = Object.values(peersRef.current).find(peer => 
                    peer && (peer as any)._pc && (peer as any)._pc.getSenders
                );
                if (sender) {
                    const videoSender = (sender as any)._pc.getSenders().find((s: RTCRtpSender) => 
                    s.track && s.track.kind === 'video'
                    );
                    if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                    }
                }
                }
          }
        });
        
        // Listen for the end of screen sharing
        videoTrack.onended = () => {
          toggleScreenSharing();
        };
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    }
  };
  
  // Handle call ending
  const handleEndCall = () => {
    endCall();
    setCallDuration(0);
  };
  
  if (!currentCall) return null;
  
  // Simplified display for audio calls
  if (currentCall.type === 'audio') {
    return (
      <Modal
        open={!!currentCall}
        footer={null}
        closable={false}
        centered
        maskClosable={false}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Avatar
            size={100}
            src={null} // Replace with called/caller avatar
            style={{ backgroundColor: '#1890ff', marginBottom: 20 }}
          >
            {currentCall.with.charAt(0).toUpperCase()}
          </Avatar>
          
          <Typography.Title level={4}>
            {currentCall.with} {/* Replace with actual name */}
          </Typography.Title>
          
          <Text type="secondary">
            {currentCall.status === 'calling' ? 'Calling...' : formatDuration(callDuration)}
          </Text>
          
          <Row gutter={16} style={{ marginTop: 30 }}>
            <Col span={8} style={{ textAlign: 'center' }}>
              <Button
                type={isMuted ? 'primary' : 'default'}
                shape="circle"
                icon={<AudioMutedOutlined />}
                onClick={toggleMute}
                danger={isMuted}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Mute</Text>
              </div>
            </Col>
            
            <Col span={8} style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                shape="circle"
                icon={<PhoneOutlined />}
                onClick={handleEndCall}
                danger
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">End</Text>
              </div>
            </Col>
            
            <Col span={8} style={{ textAlign: 'center' }}>
              <Button
                type="default"
                shape="circle"
                icon={<DesktopOutlined />}
                onClick={toggleScreenSharing}
                disabled={isScreenSharing}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Share</Text>
              </div>
            </Col>
          </Row>
        </div>
      </Modal>
    );
  }
  
  // Video call layout
  return (
    <Modal
      open={!!currentCall}
      footer={null}
      closable={false}
      centered
      maskClosable={false}
      width="80%"
      style={{ maxWidth: 1000 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        {/* Remote video(s) - main area */}
        <div style={{ flex: 1, backgroundColor: '#000', position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
          {remoteStreams.size > 0 ? (
            Array.from(remoteStreams.entries()).map(([userId, _]) => (
              <video
                key={userId}
                ref={el => (remoteVideoRefs.current[userId] = el)}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            ))
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Avatar
                size={120}
                src={null} // Replace with called/caller avatar
                style={{ backgroundColor: '#1890ff' }}
              >
                {currentCall.with.charAt(0).toUpperCase()}
              </Avatar>
              <Typography.Title level={4} style={{ color: 'white', margin: '0 0 0 20px' }}>
                {currentCall.status === 'calling' ? 'Calling...' : 'Connected'}
              </Typography.Title>
            </div>
          )}
          
          {/* Call duration */}
          <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: 4 }}>
            <Text style={{ color: 'white' }}>
              {currentCall.status === 'calling' ? 'Calling...' : formatDuration(callDuration)}
            </Text>
          </div>
          
          {/* Local video (small) */}
          <div style={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            width: '25%', 
            maxWidth: 200,
            minWidth: 120,
            aspectRatio: '4/3',
            borderRadius: 8, 
            overflow: 'hidden',
            border: '2px solid #fff'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror effect
              }}
            />
            
            {isVideoOff && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: '#555', 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Avatar
                  size={40}
                  src={user?.avatar_url}
                  style={{ backgroundColor: '#1890ff' }}
                >
                  {user?.name?.charAt(0)}
                </Avatar>
              </div>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <Row gutter={16} style={{ marginTop: 20, textAlign: 'center' }}>
          <Col span={6}>
            <Button
              type={isMuted ? 'primary' : 'default'}
              shape="circle"
              icon={<AudioMutedOutlined />}
              onClick={toggleMute}
              danger={isMuted}
              size="large"
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Mute</Text>
            </div>
          </Col>
          
          <Col span={6}>
            <Button
              type={isVideoOff ? 'primary' : 'default'}
              shape="circle"
              icon={<VideoCameraOutlined />}
              onClick={toggleVideo}
              danger={isVideoOff}
              size="large"
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Video</Text>
            </div>
          </Col>
          
          <Col span={6}>
            <Button
              type={isScreenSharing ? 'primary' : 'default'}
              shape="circle"
              icon={<DesktopOutlined />}
              onClick={toggleScreenSharing}
              size="large"
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Share</Text>
            </div>
          </Col>
          
          <Col span={6}>
            <Button
              type="primary"
              shape="circle"
              icon={<PhoneOutlined />}
              onClick={handleEndCall}
              danger
              size="large"
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">End</Text>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default VideoCallModal;