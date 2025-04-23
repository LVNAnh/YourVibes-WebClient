"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { useAuth } from '@/context/auth/useAuth';
import { Modal } from 'antd';

interface VideoChatContextType {
  // Connection states
  isConnected: boolean;
  onlineUsers: string[];
  
  // Call states
  incomingCall: any | null;
  currentCall: any | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  
  // Room states
  currentRoom: string | null;
  roomParticipants: string[];
  
  // Methods
  connectToServer: () => void;
  disconnectFromServer: () => void;
  callUser: (userId: string, callType: 'video' | 'audio') => void;
  answerCall: (accept: boolean, reason?: string) => void;
  endCall: () => void;
  createRoom: (conversationId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  initializeMediaStream: (constraints: MediaStreamConstraints) => Promise<MediaStream | null>;
}

const VideoChatContext = createContext<VideoChatContextType | undefined>(undefined);

const SERVER_URL = process.env.NEXT_PUBLIC_VIDEO_CHAT_SERVER || 'http://localhost:5000';

export const VideoChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Socket and connection refs
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  // Call states
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // Room states
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<string[]>([]);
  
  // Connect to the signaling server
  const connectToServer = () => {
    if (!userId) return;
    
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL);
      
      socketRef.current.on('connect', () => {
        console.log('Connected to video chat server');
        setIsConnected(true);
        socketRef.current?.emit('register', userId);
      });
      
      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from video chat server');
        setIsConnected(false);
        cleanup();
      });
      
      socketRef.current.on('active-users', (users) => {
        setOnlineUsers(users);
      });
      
      socketRef.current.on('user-online', (user) => {
        setOnlineUsers((prev: string[]) => [...prev, user]);
      });
      
      socketRef.current.on('user-offline', (user) => {
        setOnlineUsers(prev => prev.filter(u => u !== user));
      });
      
      // Handle incoming calls
      socketRef.current.on('call-incoming', async ({ from, signalData, callType }) => {
        console.log(`Incoming ${callType} call from ${from}`);
        setIncomingCall({
          from,
          signalData,
          callType
        });
      });
      
      // Handle accepted calls
      socketRef.current.on('call-accepted', ({ from, signalData }) => {
        console.log(`Call accepted by ${from}`);
        
        if (peersRef.current[from]) {
          peersRef.current[from].signal(signalData);
          setCurrentCall(prev => ({
            ...prev,
            status: 'connected'
          }));
        }
      });
      
      // Handle declined calls
      socketRef.current.on('call-declined', ({ from, reason }) => {
        console.log(`Call declined by ${from}: ${reason}`);
        
        if (peersRef.current[from]) {
          peersRef.current[from].destroy();
          delete peersRef.current[from];
        }
        
        setCurrentCall(null);
      });
      
      // Handle ended calls
      socketRef.current.on('call-ended', ({ from }) => {
        console.log(`Call ended by ${from}`);
        
        if (peersRef.current[from]) {
          peersRef.current[from].destroy();
          delete peersRef.current[from];
        }
        
        setCurrentCall(null);
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(from);
          return newStreams;
        });
      });
      
      // Room events
      socketRef.current.on('room-participants', ({ roomId, participants }) => {
        console.log(`Room ${roomId} has participants:`, participants);
        setRoomParticipants(participants);
      });
      
      socketRef.current.on('user-joined', ({ userId, roomId }) => {
        console.group('User Joined Room Debug');
        console.log('Participant Details:', {
          currentUserId: userId,
          loggedInUserId: user?.id,
          roomId,
          localStreamStatus: localStream ? {
            videoTrackId: localStream.getVideoTracks()[0]?.id,
            audioTrackId: localStream.getAudioTracks()[0]?.id,
            videoTrackEnabled: localStream.getVideoTracks()[0]?.enabled,
            videoTrackConstraints: localStream.getVideoTracks()[0]?.getConstraints()
          } : 'No Local Stream'
        });
      
        // Chỉ tạo peer nếu userId khác với user hiện tại
        if (localStream && userId !== user?.id) {
          try {
            const peer = createPeer(userId, socketRef.current!.id, localStream, roomId);
            
            console.log('Peer Creation Details:', {
              targetUserId: userId,
              peerInitiator: peer.initiator,
              peerConnected: peer.connected
            });
      
            peersRef.current[userId] = peer;
          } catch (error) {
            console.error('Peer Creation Error:', error);
          }
        }
        console.groupEnd();
      });
      
      socketRef.current.on('user-left', ({ userId, roomId }) => {
        console.log(`User ${userId} left room ${roomId}`);
        setRoomParticipants(prev => prev.filter(id => id !== userId));
        
        if (peersRef.current[userId]) {
          peersRef.current[userId].destroy();
          delete peersRef.current[userId];
        }
        
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(userId);
          return newStreams;
        });
      });
      
      // WebRTC signaling for group calls
      socketRef.current.on('user-signal', ({ from, signalData, roomId }) => {
        console.log(`Received signal from ${from} in room ${roomId}`);
        
        // If peer doesn't exist, create one as a receiver
        if (!peersRef.current[from] && localStream) {
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: localStream
          });
          
          peer.on('signal', (signal) => {
            socketRef.current?.emit('return-signal', {
              to: from,
              from: userId,
              roomId,
              signalData: signal
            });
          });
          
          peer.on('stream', (stream) => {
            setRemoteStreams(prev => {
              const newStreams = new Map(prev);
              newStreams.set(from, stream);
              return newStreams;
            });
          });
          
          peer.signal(signalData);
          peersRef.current[from] = peer;
        } else if (peersRef.current[from]) {
          peersRef.current[from].signal(signalData);
        }
      });
      
      socketRef.current.on('receiving-returned-signal', ({ from, signalData }) => {
        console.log(`Received returned signal from ${from}`);
        if (peersRef.current[from]) {
          peersRef.current[from].signal(signalData);
        }
      });
    }
  };
  
  // Disconnect from the server
  const disconnectFromServer = () => {
    cleanup();
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  };
  
  // Create a peer connection as initiator
  const createPeer = (
    to: string, 
    from: string, 
    stream: MediaStream, 
    roomId?: string
  ): Peer.Instance => {
    console.group('Create Peer Connection');
    console.log('Peer Details:', { to, from, roomId });
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    // Chi tiết hóa các sự kiện peer
    peer.on('signal', (signal) => {
      console.log('Peer Signal Generated:', {
        to,
        signalType: signal.type,
        signalLength: JSON.stringify(signal).length
      });

      if (roomId) {
        socketRef.current?.emit('send-signal', {
          to,
          from: userId,
          roomId,
          signalData: signal
        });
      } else {
        socketRef.current?.emit('call-user', {
          to,
          from: userId,
          signalData: signal,
          callType: 'video'
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('Remote Stream Received:', {
        userId: to,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });

      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(to, remoteStream);
        return newStreams;
      });
    });

    peer.on('connect', () => {
      console.log('Peer Connection Established:', to);
    });

    peer.on('error', (err) => {
      console.error('Peer Connection Error:', {
        to,
        errorMessage: err.message
      });

      Modal.error({
        title: 'Lỗi Kết Nối Video',
        content: `Không thể thiết lập kết nối video với ${to}. ${err.message}`
      });
    });

    console.groupEnd();
    return peer;
  };
  
  // Initialize media stream
  const initializeMediaStream = async (constraints: MediaStreamConstraints) => {
    try {
      // Kiểm tra và liệt kê thiết bị
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.group('Media Device Check');
      console.log('Available Video Devices:', videoDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || 'Unknown Device'
      })));
      console.groupEnd();

      // Nếu không có camera, hiển thị thông báo
      if (videoDevices.length === 0) {
        Modal.error({
          title: 'Không Tìm Thấy Camera',
          content: 'Vui lòng kết nối camera hoặc kiểm tra cài đặt thiết bị.',
        });
        return null;
      }

      // Thử nghiệm với từng camera
      const streamConstraints: MediaStreamConstraints = {
        video: videoDevices.length > 0 ? { 
          deviceId: videoDevices[0].deviceId 
        } : false,
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
      
      console.group('Media Stream Details');
      console.log('Stream Initialized:', {
        videoTracks: stream.getVideoTracks().map(track => ({
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          constraints: track.getConstraints()
        })),
        audioTracks: stream.getAudioTracks().map(track => ({
          id: track.id,
          label: track.label,
          enabled: track.enabled
        }))
      });
      console.groupEnd();

      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Media Stream Initialization Error:', error);
      
      // Xử lý chi tiết các loại lỗi
      if (error instanceof DOMException) {
        let errorMessage = 'Lỗi không xác định khi truy cập camera.';
        
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Vui lòng cấp quyền truy cập camera và microphone trong trình duyệt.';
            break;
          case 'NotFoundError':
            errorMessage = 'Không tìm thấy camera. Vui lòng kiểm tra kết nối thiết bị.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Không thể sử dụng cấu hình camera hiện tại.';
            break;
        }

        Modal.error({
          title: 'Lỗi Truy Cập Camera',
          content: errorMessage,
          onOk: () => {
            // Hướng dẫn người dùng mở cài đặt quyền
            window.open('chrome://settings/content/camera', '_blank');
          }
        });
      }
      
      return null;
    }
  };
  
  // Call another user
  const callUser = async (targetUserId: string, callType: 'video' | 'audio') => {
    if (!userId || !socketRef.current || !socketRef.current.connected) {
      console.error('Not connected to server');
      return;
    }
    
    try {
      const constraints = {
        video: callType === 'video',
        audio: true
      };
      
      const stream = await initializeMediaStream(constraints);
      
      if (!stream) {
        console.error('Failed to get local media stream');
        return;
      }
      
      const peer = createPeer(targetUserId, socketRef.current.id, stream);
      peersRef.current[targetUserId] = peer;
      
      setCurrentCall({
        with: targetUserId,
        type: callType,
        status: 'calling'
      });
    } catch (error) {
      console.error('Error calling user:', error);
    }
  };
  
  // Answer an incoming call
  const answerCall = async (accept: boolean, reason?: string) => {
    if (!incomingCall) return;
    
    const { from, callType } = incomingCall;
    
    if (accept) {
      try {
        const constraints = {
          video: callType === 'video',
          audio: true
        };
        
        const stream = await initializeMediaStream(constraints);
        
        if (!stream) {
          console.error('Failed to get local media stream');
          socketRef.current?.emit('call-declined', {
            to: from,
            from: userId,
            reason: 'Failed to access media devices'
          });
          setIncomingCall(null);
          return;
        }
        
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream
        });
        
        peer.on('signal', (signal) => {
          socketRef.current?.emit('call-accepted', {
            to: from,
            from: userId,
            signalData: signal
          });
        });
        
        peer.on('stream', (remoteStream) => {
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(from, remoteStream);
            return newStreams;
          });
        });
        
        peer.signal(incomingCall.signalData);
        peersRef.current[from] = peer;
        
        setCurrentCall({
          with: from,
          type: callType,
          status: 'connected'
        });
        
        setIncomingCall(null);
      } catch (error) {
        console.error('Error answering call:', error);
        socketRef.current?.emit('call-declined', {
          to: from,
          from: userId,
          reason: 'Technical error'
        });
        setIncomingCall(null);
      }
    } else {
      socketRef.current?.emit('call-declined', {
        to: from,
        from: userId,
        reason: reason || 'Call declined'
      });
      setIncomingCall(null);
    }
  };
  
  // End the current call
  const endCall = () => {
    if (!currentCall) return;
    
    // Notify the other user
    socketRef.current?.emit('end-call', {
      to: currentCall.with,
      from: userId
    });
    
    // Destroy peer connection
    if (peersRef.current[currentCall.with]) {
      peersRef.current[currentCall.with].destroy();
      delete peersRef.current[currentCall.with];
    }
    
    // Update states
    setCurrentCall(null);
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(currentCall.with);
      return newStreams;
    });
    
    // Keep local stream for potential future calls
  };
  
  // Create and join a new room
  const createRoom = async (conversationId: string) => {
    if (!userId || !socketRef.current || !socketRef.current.connected) {
      console.error('Not connected to server');
      return;
    }
    
    try {
      const roomId = `room_${conversationId}`;
      
      // Get local stream with video and audio
      const stream = await initializeMediaStream({ video: true, audio: true });
      
      if (!stream) {
        console.error('Failed to get local media stream');
        return;
      }
      
      socketRef.current.emit('join-room', {
        roomId,
        userId
      });
      
      setCurrentRoom(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };
  
  // Join an existing room
  const joinRoom = async (roomId: string) => {
    if (!userId || !socketRef.current || !socketRef.current.connected) {
      console.error('Not connected to server');
      return;
    }
    
    try {
      // Get local stream with video and audio
      const stream = await initializeMediaStream({ video: true, audio: true });
      
      if (!stream) {
        console.error('Failed to get local media stream');
        return;
      }
      
      socketRef.current.emit('join-room', {
        roomId,
        userId
      });
      
      setCurrentRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };
  
  // Leave the current room
  const leaveRoom = () => {
    if (!currentRoom || !userId) return;
    
    socketRef.current?.emit('leave-room', {
      roomId: currentRoom,
      userId
    });
    
    // Destroy all peer connections
    Object.keys(peersRef.current).forEach(peerId => {
      peersRef.current[peerId].destroy();
      delete peersRef.current[peerId];
    });
    
    // Clean up
    setCurrentRoom(null);
    setRoomParticipants([]);
    setRemoteStreams(new Map());
    
    // Keep local stream for potential future calls
  };
  
  // Clean up function
  const cleanup = () => {
    // Stop all tracks in local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Destroy all peer connections
    Object.keys(peersRef.current).forEach(peerId => {
      if (peersRef.current[peerId]) {
        peersRef.current[peerId].destroy();
      }
    });
    
    peersRef.current = {};
    
    // Clear all states
    setIncomingCall(null);
    setCurrentCall(null);
    setRemoteStreams(new Map());
    setCurrentRoom(null);
    setRoomParticipants([]);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  return (
    <VideoChatContext.Provider
      value={{
        isConnected,
        onlineUsers,
        incomingCall,
        currentCall,
        localStream,
        remoteStreams,
        currentRoom,
        roomParticipants,
        connectToServer,
        disconnectFromServer,
        callUser,
        answerCall,
        endCall,
        createRoom,
        joinRoom,
        leaveRoom,
        initializeMediaStream,
      }}
    >
      {children}
    </VideoChatContext.Provider>
  );
};

export const useVideoChat = () => {
  const context = useContext(VideoChatContext);
  
  if (context === undefined) {
    throw new Error('useVideoChat must be used within VideoChatProvider');
  }
  
  return context;
};