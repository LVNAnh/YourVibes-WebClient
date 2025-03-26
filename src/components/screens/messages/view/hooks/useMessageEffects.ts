import { useEffect, RefObject } from 'react';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';

export const useMessageEffects = (
  messagesEndRef: RefObject<HTMLDivElement>,
  activeFriend: FriendResponseModel | null,
  messages: Record<string, MessageResponseModel[]>,
  forceUpdateTempMessages: () => void,
  fetchFriends: (page: number) => void,
  scrollToBottom: () => void,
  user: any
) => {
  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, [messages, activeFriend, scrollToBottom]);
  
  // Update temporary messages
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (activeFriend?.id) {
        forceUpdateTempMessages();
      }
    }, 200);
    
    return () => clearInterval(intervalId);
  }, [activeFriend, forceUpdateTempMessages]);
  
  // Log message count for debugging
  useEffect(() => {
    if (activeFriend?.id) {
      const friendMessages = messages[activeFriend.id];
      console.log(`Render với ${friendMessages?.length || 0} tin nhắn cho friend ${activeFriend.id}`);
    }
  }, [messages, activeFriend]);

  // Fetch friends list
  useEffect(() => {
    if (user?.id) {
      fetchFriends(1);
    }
  }, [user, fetchFriends]);

  // Handle responsive UI
  useEffect(() => {
    const handleResize = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [messagesEndRef]);
};

export const useResponsiveEffects = (
  activeFriend: FriendResponseModel | null,
  setShowSidebar: (show: boolean) => void
) => {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSidebar(!activeFriend);
      } else {
        setShowSidebar(true);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeFriend, setShowSidebar]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(!activeFriend);
    }
  }, [activeFriend, setShowSidebar]);
};