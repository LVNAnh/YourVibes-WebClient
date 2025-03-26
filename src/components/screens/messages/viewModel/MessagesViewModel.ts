import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { GetMessagesByConversationIdRequestModel, MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useConversationViewModel, ConversationWithMembers } from './components/ConversationViewModel';
import { defaultMessagesRepo } from '@/api/features/messages/MessagesRepo';
import { useWebSocketConnect } from './components/WebSocketConnect';
import { ConversationDetailResponseModel } from '@/api/features/messages/models/ConversationDetailModel';
import { GroupMember } from './components/GroupConversationManager';

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const { 
    getExistingConversation, 
    conversations,
    fetchAllConversations,
    isLoadingConversations 
  } = useConversationViewModel();
  
  const [newMessage, setNewMessage] = useState('');
  const [activeFriend, setActiveFriend] = useState<FriendResponseModel | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationWithMembers | null>(null);
  const [replyTo, setReplyTo] = useState<MessageResponseModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeFriendProfile, setActiveFriendProfile] = useState<UserModel | null>(null); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  
  const {
    messages,
    setMessages,
    activeConversationId,
    setActiveConversationId,
    connectToWebSocket,
    initializeConversation,
    sendMessage,
    isConnected,
    updateTemporaryMessages
  } = useWebSocketConnect();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (activeConversation && user?.id) {
      setActiveConversationId(activeConversation.id || '');
      initializeConversation(activeConversation.id || '');
      fetchMessages(activeConversation.id || '');
    }
  }, [activeConversation, user?.id]);

  // Load friend info from conversation for UI compatibility
  useEffect(() => {
    if (activeConversation && user?.id) {
      // If it's a direct conversation with only 2 members
      if (activeConversation.members && 
          activeConversation.members.length === 2 && 
          !activeConversation.isGroup) {
        // Find the other user in the conversation
        const otherMember = activeConversation.members.find(member => 
          member.user_id !== user.id && member.user
        );
        
        if (otherMember && otherMember.user) {
          // Create a FriendResponseModel from the other user
          const friend: FriendResponseModel = {
            id: otherMember.user_id || '',
            name: otherMember.user?.name || '',
            family_name: otherMember.user?.family_name || '',
            avatar_url: otherMember.user?.avatar_url || ''
          };
          setActiveFriend(friend);
        }
      } else if (activeConversation.isGroup) {
        // Handle group conversations
        const groupFriend: FriendResponseModel = {
          id: activeConversation.id || '',
          name: activeConversation.name || 'Group Chat',
          family_name: '',
          avatar_url: activeConversation.image || 'https://via.placeholder.com/40'
        };
        // Add isGroup flag
        Object.defineProperty(groupFriend, 'isGroup', { value: true });
        // Add group members if available
        if (activeConversation.members) {
          const groupMembers: GroupMember[] = activeConversation.members
            .filter(member => member.user)
            .map(member => ({
              id: member.user_id || '',
              name: member.user?.name || '',
              family_name: member.user?.family_name || '',
              avatar_url: member.user?.avatar_url || ''
            }));
          Object.defineProperty(groupFriend, 'groupMembers', { value: groupMembers });
        }
        setActiveFriend(groupFriend);
      }
    }
  }, [activeConversation, user?.id]);
  
  useEffect(() => {
    if (activeConversation?.id && !isLoadingMessages) {
      const timerId = setTimeout(() => {
        updateTemporaryMessages(activeConversation.id || '');
      }, 200);
      
      return () => clearTimeout(timerId);
    }
  }, [activeConversation?.id, isLoadingMessages, updateTemporaryMessages]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.error("No conversation ID provided to fetchMessages");
      return;
    }
    
    try {
      setIsLoadingMessages(true);
      console.log("Fetching messages for conversation:", conversationId);
      
      // Create the proper request model
      const requestParams: GetMessagesByConversationIdRequestModel = {
        conversation_id: conversationId,
        page: 1,
        limit: 100
      };
      
      console.log("API request parameters:", requestParams);
      
      // Call the modified API method
      const response = await defaultMessagesRepo.getMessagesByConversationId(requestParams);
      
      console.log("API response for messages:", response);
      
      if (response && response.data) {
        // Process the response data
        const fetchedMessages = Array.isArray(response.data) 
          ? response.data 
          : [response.data];
        
        console.log("Fetched messages:", fetchedMessages);
        
        // Normalize message format
        const normalizedMessages = fetchedMessages.map(msg => ({
          ...msg,
          text: msg.content || msg.text,
          content: msg.content || msg.text,
          isTemporary: false 
        }));
        
        // Sort messages by creation date
        const sortedMessages = normalizedMessages.sort(
          (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );
        
        // Update the messages state for this specific conversation ID
        setMessages(prevMessages => {
          const newMessages = {
            ...prevMessages,
            [conversationId]: sortedMessages
          };
          console.log("Updated messages state:", newMessages);
          return newMessages;
        });
      } else {
        console.warn("No message data returned from API");
        // Initialize with empty array to prevent undefined
        setMessages(prevMessages => ({
          ...prevMessages,
          [conversationId]: []
        }));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      // Initialize with empty array on error
      setMessages(prevMessages => ({
        ...prevMessages,
        [conversationId]: []
      }));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [setMessages, setIsLoadingMessages]);

  const handleConversationSelect = useCallback((conversation: ConversationWithMembers) => {
    setActiveConversation(conversation);
    
    // Set conversation ID and initialize connection
    if (conversation.id) {
      const conversationId = conversation.id;
      console.log("Selecting conversation:", conversationId);
      
      setActiveConversationId(conversationId);
      
      // Always fetch messages when selecting a conversation to ensure fresh data
      setIsLoadingMessages(true);
      fetchMessages(conversationId).then(() => {
        console.log("Messages fetched and stored for conversation:", conversationId);
      });
      
      initializeConversation(conversationId);
    }
  }, [setActiveConversationId, initializeConversation, fetchMessages, setIsLoadingMessages]);

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

  const handleSendMessage = useCallback((message: string, replyToMessage?: MessageResponseModel) => {
    setMessageError(null);

    if (!message.trim() || !activeConversationId) {
      return false;
    }
    
    if (message.length > 500) {
      setMessageError(localStrings.Messages.MessageTooLong);
      return false;
    }
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageResponseModel = {
      id: tempId,
      conversation_id: activeConversationId,
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
    
    setMessages(prevMessages => {
      if (!prevMessages[activeConversationId]) {
        return {
          ...prevMessages,
          [activeConversationId]: [tempMessage]
        };
      }
      
      return {
        ...prevMessages,
        [activeConversationId]: [...prevMessages[activeConversationId], tempMessage]
      };
    });
    
    const success = sendMessage(message, replyToMessage);
    
    if (!success) {
      defaultMessagesRepo.createMessage({
        content: message,
        conversation_id: activeConversationId,
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
            if (!prevMessages[activeConversationId]) return prevMessages;
            
            const updatedMessages = [...prevMessages[activeConversationId]];
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
            
            return {
              ...prevMessages,
              [activeConversationId]: updatedMessages
            };
          });
        }
      }).catch(error => {
        console.error("Error creating message:", error);
      });
    }
    
    setTimeout(() => {
      updateTemporaryMessages(activeConversationId);
    }, 3000);
    
    return true;
  }, [activeConversationId, user, sendMessage, setMessages, updateTemporaryMessages, localStrings]);

  const forceUpdateTempMessages = useCallback(() => {
    if (activeConversationId) {
      updateTemporaryMessages(activeConversationId);
    }
  }, [activeConversationId, updateTemporaryMessages]);

  // Modified to use conversation API instead of friends API
  const fetchConversations = useCallback(async () => {
    if (user?.id) {
      fetchAllConversations();
    }
  }, [user?.id, fetchAllConversations]);

  return {
    fetchMessages,
    newMessage,
    setNewMessage,
    activeFriend,
    setActiveFriend,
    activeConversation,
    setActiveConversation,
    handleConversationSelect,
    messages,
    setMessages,
    messageError,
    setMessageError,
    replyTo,
    setReplyTo,
    messagesEndRef,
    fetchConversations,  // Renamed from fetchFriends
    conversations,       // Using conversations instead of friends
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
    isLoadingConversations,
    forceUpdateTempMessages
  };
};