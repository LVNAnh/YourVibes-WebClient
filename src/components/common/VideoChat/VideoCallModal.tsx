"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Row, Col, Avatar, Typography, notification, Alert } from 'antd';
import { PhoneOutlined, AudioMutedOutlined, VideoCameraOutlined, DesktopOutlined } from '@ant-design/icons';
import { useVideoChat } from '@/context/videoChat/videoChatContext';
import { useAuth } from '@/context/auth/useAuth';

const { Text } = Typography;

const VideoCallModal: React.FC = () => {
  const { 
    currentCall, 
    localStream, 
    remoteStreams, 
    endCall, 
    initializeMediaStream // Thêm hàm này để debug
  } = useVideoChat();
  const { user } = useAuth();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Thêm hàm kiểm tra và yêu cầu quyền truy cập
  const requestMediaAccess = async () => {
    try {
      // Log chi tiết thiết bị
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.group('Media Device Check');
      console.log('Available Video Devices:', videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || 'Unknown Device'
      })));
      console.groupEnd();

      // Thử nghiệm khởi tạo luồng media
      const stream = await initializeMediaStream({ 
        video: true, 
        audio: true 
      });

      if (!stream) {
        notification.error({
          message: 'Lỗi Truy Cập Camera',
          description: 'Không thể khởi tạo luồng video. Vui lòng kiểm tra camera và quyền truy cập.',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Media Access Error:', error);
      
      notification.error({
        message: 'Lỗi Truy Cập Thiết Bị',
        description: 'Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra cài đặt.',
      });

      return false;
    }
  };

  // Kiểm tra và yêu cầu quyền khi bắt đầu cuộc gọi
  useEffect(() => {
    if (currentCall) {
      requestMediaAccess();
    }
  }, [currentCall]);
  
  // Thiết lập luồng video local
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      
      // Log chi tiết track
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      
      console.group('Local Stream Details');
      console.log('Video Tracks:', videoTracks.map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled
      })));
      console.log('Audio Tracks:', audioTracks.map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled
      })));
      console.groupEnd();
    }
  }, [localStream]);
  
  // Thiết lập luồng video remote
  useEffect(() => {
    if (remoteStreams.size > 0) {
      remoteStreams.forEach((stream, userId) => {
        if (remoteVideoRefs.current[userId] && stream) {
          remoteVideoRefs.current[userId]!.srcObject = stream;
          
          // Log chi tiết track remote
          console.group(`Remote Stream Details for ${userId}`);
          console.log('Video Tracks:', stream.getVideoTracks().map(track => ({
            id: track.id,
            label: track.label,
            enabled: track.enabled
          })));
          console.log('Audio Tracks:', stream.getAudioTracks().map(track => ({
            id: track.id,
            label: track.label,
            enabled: track.enabled
          })));
          console.groupEnd();
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

  useEffect(() => {
    console.group('Video Stream Debugging');
    console.log('Local Stream Status:', {
      exists: !!localStream,
      videoTracks: localStream?.getVideoTracks().map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        constraints: track.getConstraints()
      })),
      videoRef: {
        current: !!localVideoRef.current,
        srcObject: localVideoRef.current?.srcObject ? 'Set' : 'Not Set'
      }
    });
  
    console.log('Remote Streams:', 
      Array.from(remoteStreams.entries()).map(([userId, stream]) => ({
        userId,
        videoTracks: stream.getVideoTracks().map(track => ({
          id: track.id,
          label: track.label,
          enabled: track.enabled
        }))
      }))
    );
    console.groupEnd();
  }, [localStream, remoteStreams]);
  
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
        {/* Debug Video Rendering Area */}
        <div style={{ flex: 1, backgroundColor: '#000', position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
          {/* Local Video Rendering */}
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: '25%', 
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: localStream.getVideoTracks().length ? 'transparent' : 'red',
                border: '2px solid white'
              }}
            />
          ) : (
            <Alert 
              message="Không có luồng video local" 
              description="Vui lòng kiểm tra camera và quyền truy cập" 
              type="error" 
              showIcon 
              style={{ margin: 10 }}
            />
          )}

          {/* Remote Video Rendering */}
          {remoteStreams.size > 0 ? (
            Array.from(remoteStreams.entries()).map(([userId, stream]) => (
              <video
                key={userId}
                ref={el => {
                  if (el) {
                    el.srcObject = stream;
                    console.log(`Setting remote stream for ${userId}`, stream);
                    remoteVideoRefs.current[userId] = el;
                  }
                }}
                autoPlay
                playsInline
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: stream.getVideoTracks().length ? 'transparent' : 'yellow' 
                }}
              />
            ))
          ) : (
            <Alert 
              message="Không có luồng video remote" 
              description="Kiểm tra kết nối và trạng thái của người dùng khác" 
              type="warning" 
              showIcon 
              style={{ margin: 10 }}
            />
          )}
        </div>

        {/* Các nút điều khiển và phần còn lại giữ nguyên */}
        <Row gutter={16} style={{ marginTop: 20, textAlign: 'center' }}>
          {/* Giữ nguyên các nút điều khiển */}
        </Row>
      </div>
    </Modal>
  );
};

export default VideoCallModal;