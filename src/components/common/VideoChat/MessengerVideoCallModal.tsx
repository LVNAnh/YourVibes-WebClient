import React, { useState, useRef, useEffect } from 'react';
import { 
  PhoneOutlined, 
  AudioMutedOutlined, 
  VideoCameraOutlined 
} from '@ant-design/icons';

const MessengerVideoCall = ({ 
  friendName = 'John Smith', 
  friendAvatar = '', 
  localStream, 
  remoteStream 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute
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

  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 1000 }}
    >
      {/* Main Video (Remote) */}
      <div className="flex-grow relative">
        <video 
          ref={remoteVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay 
          playsInline
        />
      </div>

      {/* Small Video (Local) */}
      <div 
        className="absolute bottom-20 right-6 w-52 h-80 rounded-lg border-4 border-white overflow-hidden shadow-lg"
        style={{ zIndex: 10 }}
      >
        <video 
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay 
          playsInline 
          muted
        />
        {isVideoOff && (
          <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
            <span className="text-white">Video Off</span>
          </div>
        )}
      </div>

      {/* Call Info */}
      <div className="absolute top-6 left-0 right-0 text-center text-white">
        <h2 className="text-2xl font-bold">{friendName}</h2>
        <p className="text-sm">Connected • {formatDuration(callDuration)}</p>
      </div>

      {/* Call Controls */}
      <div 
        className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4"
        style={{ zIndex: 10 }}
      >
        {/* Mute Button */}
        <button 
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center 
            ${isMuted ? 'bg-red-500' : 'bg-gray-700'} text-white`}
        >
          <AudioMutedOutlined className="text-2xl" />
        </button>

        {/* Video Toggle Button */}
        <button 
          onClick={toggleVideo}
          className={`w-16 h-16 rounded-full flex items-center justify-center 
            ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} text-white`}
        >
          <VideoCameraOutlined className="text-2xl" />
        </button>

        {/* End Call Button */}
        <button 
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 text-white"
          // Thêm hàm kết thúc cuộc gọi
          // onClick={handleEndCall}
        >
          <PhoneOutlined className="text-2xl" />
        </button>
      </div>
    </div>
  );
};

export default MessengerVideoCall;