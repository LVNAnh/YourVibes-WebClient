import { useEffect, RefObject } from 'react';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { ConversationWithMembers } from '../../viewModel/components/ConversationViewModel';

export const useMessageEffects = (
  messagesEndRef: RefObject<HTMLDivElement>,
  activeConversationId: string | null,
  messages: Record<string, MessageResponseModel[]>,
  forceUpdateTempMessages: () => void,
  fetchConversations: () => void,
  scrollToBottom: () => void,
  user: any
) => {
  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, [messages, activeConversationId, scrollToBottom]);
  
  // Update temporary messages
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (activeConversationId) {
        forceUpdateTempMessages();
      }
    }, 200);
    
    return () => clearInterval(intervalId);
  }, [activeConversationId, forceUpdateTempMessages]);
  
  // Log message count for debugging
  useEffect(() => {
    if (activeConversationId) {
      const conversationMessages = messages[activeConversationId];
      console.log(`Render with ${conversationMessages?.length || 0} messages for conversation ${activeConversationId}`);
    }
  }, [messages, activeConversationId]);

  // Fetch conversations list
  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

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
  activeConversation: ConversationWithMembers | null,
  setShowSidebar: (show: boolean) => void
) => {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSidebar(!activeConversation);
      } else {
        setShowSidebar(true);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation, setShowSidebar]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(!activeConversation);
    }
  }, [activeConversation, setShowSidebar]);
};