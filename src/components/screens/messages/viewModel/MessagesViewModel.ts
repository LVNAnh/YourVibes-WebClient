import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useConversationViewModel, ConversationWithMembers } from './components/ConversationViewModel';
import { useWebSocketConnect } from './components/WebSocketConnect';

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const { getExistingConversation } = useConversationViewModel();
  
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<MessageResponseModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [activeFriendProfile, setActiveFriendProfile] = useState<UserModel | null>(null); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  
  // Flag to track ongoing message fetch operations
  const isFetchingMessagesRef = useRef<Record<string, boolean>>({});
  const fetchDebounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  const {
    messages,
    setMessages,
    activeConversationId,
    setActiveConversationId,
    connectToWebSocket,
    initializeConversation,
    sendMessage,
    isConnected,
    updateTemporaryMessages,
    fetchMessages: wsConnectFetchMessages
  } = useWebSocketConnect();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Debounced fetch messages to prevent excessive API calls
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId || !user?.id) {
      console.warn("Cannot fetch messages - missing conversationId or user");
      return Promise.resolve([]);
    }
    
    // Clear any existing debounce timer for this conversation
    if (fetchDebounceTimersRef.current[conversationId]) {
      clearTimeout(fetchDebounceTimersRef.current[conversationId]);
    }
    
    // Return a promise that resolves when the fetch is complete
    return new Promise<MessageResponseModel[]>((resolve) => {
      // Create a new debounce timer
      fetchDebounceTimersRef.current[conversationId] = setTimeout(async () => {
        // Skip if we're already fetching messages for this conversation
        if (isFetchingMessagesRef.current[conversationId]) {
          console.log(`Already fetching messages for conversation ${conversationId}`);
          resolve(messages[conversationId] || []);
          return;
        }
        
        try {
          setIsLoadingMessages(true);
          isFetchingMessagesRef.current[conversationId] = true;
          
          console.log(`Fetching messages for conversation: ${conversationId}`);
          
          // Use the WebSocketConnect's fetchMessages function
          const fetchedMessages = await wsConnectFetchMessages(conversationId);
          resolve(fetchedMessages);
        } catch (err) {
          console.error("Error loading messages", err);
          resolve(messages[conversationId] || []);
        } finally {
          setIsLoadingMessages(false);
          isFetchingMessagesRef.current[conversationId] = false;
        }
      }, 300); // 300ms debounce
    });
  }, [user, messages, wsConnectFetchMessages]);

  useEffect(() => {
    // Cleanup debounce timers on unmount
    return () => {
      Object.values(fetchDebounceTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await defaultProfileRepo.getProfile(userId);
      if (response?.data) {
        setActiveFriendProfile(response.data);
        setIsProfileModalOpen(true); 
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, []);

  const handleSendMessage = useCallback((message: string, conversationId: string, replyToMessage?: MessageResponseModel) => {
    setMessageError(null);

    if (!message.trim() || !conversationId) {
      return false;
    }
    
    if (message.length > 500) {
      setMessageError(localStrings.Messages.MessageTooLong);
      return false;
    }
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageResponseModel = {
      id: tempId,
      conversation_id: conversationId,
      user_id: user?.id || '',
      content: message,
      text: message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isTemporary: true,
      reply_to: replyToMessage,
      user: {
        id: user?.id,
        name: user?.name,
        family_name: user?.family_name,
        avatar_url: user?.avatar_url
      }
    };
    
    // Update messages with temp message
    setMessages(prevMessages => {
      const newMessages = { ...prevMessages };
      
      if (!newMessages[conversationId]) {
        newMessages[conversationId] = [tempMessage];
      } else {
        newMessages[conversationId] = [...newMessages[conversationId], tempMessage];
      }
      
      return newMessages;
    });
    
    // Try to send via WebSocket
    const success = sendMessage(message, conversationId, replyToMessage);
    
    // If WebSocket fails, use API
    if (!success) {
      console.log("WebSocket send failed, using API instead");
      defaultMessagesRepo.createMessage({
        content: message,
        conversation_id: conversationId,
        parent_id: replyToMessage?.id,
        parent_content: replyToMessage?.text || replyToMessage?.content,
        user: {
          id: user?.id,
          name: user?.name,
          family_name: user?.family_name,
          avatar_url: user?.avatar_url
        }
      }).then(response => {
        if (response.data && response.data.id) {
          setMessages(prevMessages => {
            const newMessages = { ...prevMessages };
            if (!newMessages[conversationId]) return newMessages;
            
            const updatedMessages = [...newMessages[conversationId]];
            const tempIndex = updatedMessages.findIndex(
              msg => msg.id === tempId
            );
            
            if (tempIndex !== -1) {
              updatedMessages[tempIndex] = {
                ...updatedMessages[tempIndex],
                ...response.data,
                isTemporary: false,
                text: message,
                content: message
              };
            }
            
            newMessages[conversationId] = updatedMessages;
            return newMessages;
          });
        }
      }).catch(error => {
        console.error("Error sending message via API:", error);
      });
    }
    
    // Mark temporary messages as sent after delay
    setTimeout(() => {
      updateTemporaryMessages(conversationId);
    }, 5000);
    
    return true;
  }, [user, sendMessage, setMessages, updateTemporaryMessages, localStrings.Messages.MessageTooLong]);

  const forceUpdateTempMessages = useCallback(() => {
    if (activeConversationId) {
      updateTemporaryMessages(activeConversationId);
    }
  }, [activeConversationId, updateTemporaryMessages]);

  return {
    fetchMessages,
    newMessage,
    setNewMessage,
    messages,
    setMessages,
    messageError,
    setMessageError,
    replyTo,
    setReplyTo,
    messagesEndRef,
    fetchUserProfile, 
    activeFriendProfile, 
    isProfileModalOpen, 
    setIsProfileModalOpen,
    activeConversationId,
    setActiveConversationId,
    getExistingConversation,
    handleSendMessage,
    isConnected,
    isLoadingMessages,
    forceUpdateTempMessages,
    initializeConversation
  };
};