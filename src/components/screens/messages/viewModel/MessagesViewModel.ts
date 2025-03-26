import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useConversationViewModel } from './components/ConversationViewModel';
import { defaultMessagesRepo } from '@/api/features/messages/MessagesRepo';
import { useWebSocketConnect } from './components/WebSocketConnect';
import { ConversationDetailResponseModel } from '@/api/features/messages/models/ConversationDetailModel';
import { GroupMember } from './components/GroupConversationManager';

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const { getExistingConversation } = useConversationViewModel();
  
  const [newMessage, setNewMessage] = useState('');
  const [activeFriend, setActiveFriend] = useState<FriendResponseModel | null>(null);
  const [replyTo, setReplyTo] = useState<MessageResponseModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
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
    if (activeFriend && user?.id) {
      const isGroup = Object.prototype.hasOwnProperty.call(activeFriend, 'isGroup') && 
                     (activeFriend as any).isGroup === true;
      
      if (isGroup) {
        setActiveConversationId(activeFriend.id || '');
        initializeConversation(activeFriend.id || '');
        fetchMessages(activeFriend.id || '');
      } else {
        setupConversationForFriend(activeFriend.id || '');
      }
    }
  }, [activeFriend, user?.id]);
  
  useEffect(() => {
    if (activeFriend?.id && !isLoadingMessages) {
      const timerId = setTimeout(() => {
        updateTemporaryMessages(activeFriend.id || '');
      }, 200);
      
      return () => clearTimeout(timerId);
    }
  }, [activeFriend?.id, isLoadingMessages, updateTemporaryMessages]);

  const setupConversationForFriend = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      setIsLoadingMessages(true);
      
      const existingConvId = await getExistingConversation(user.id, friendId);
      
      if (existingConvId) {
        setActiveConversationId(existingConvId);
        initializeConversation(existingConvId);
        fetchMessages(existingConvId);
      } else {
        const newConversation = await createNewConversation(user.id, friendId);
        
        if (newConversation) {
          setActiveConversationId(newConversation);
          initializeConversation(newConversation);
        }
      }
    } catch (error) {
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId || !activeFriend?.id) {
      return;
    }
    
    try {
      setIsLoadingMessages(true);
      
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        page: 1,
        limit: 100,
      });
      
      if (response.data) {
        const fetchedMessages = Array.isArray(response.data) 
          ? response.data as MessageResponseModel[] 
          : [response.data as MessageResponseModel]
        
        const normalizedMessages = fetchedMessages.map(msg => ({
          ...msg,
          text: msg.content || msg.text,
          content: msg.content || msg.text,
          isTemporary: false 
        }));
        
        const sortedMessages = normalizedMessages.sort(
          (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );
        
        setMessages(prevMessages => {
          const friendId = activeFriend.id || '';
          
          return {
            ...prevMessages,
            [friendId]: sortedMessages
          };
        });
      }
    } catch (err) {
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeFriend, setMessages]);

  const findFriendByConversationId = useCallback(async (conversationId: string): Promise<FriendResponseModel | null> => {
    if (!user?.id) return null;
    
    try {
      setIsLoadingMessages(true);
      
      const conversationResponse = await defaultMessagesRepo.getConversationById({
        conversation_id: conversationId
      });
      
      if (conversationResponse.data) {
        const conversationDetails = conversationResponse.data;
        
        const membersResponse = await defaultMessagesRepo.getConversationDetailByUserID({
          conversation_id: conversationId
        });
        
        if (membersResponse.data) {
          const members = Array.isArray(membersResponse.data) ? membersResponse.data : [membersResponse.data];
          
          if (members.length > 2) {
            const groupMembers: GroupMember[] = [];
            
            for (const member of members) {
              if (member.user_id) {
                try {
                  const userResponse = await defaultProfileRepo.getProfile(member.user_id);
                  if (userResponse.data) {
                    groupMembers.push({
                      id: userResponse.data.id || "",
                      name: userResponse.data.name,
                      family_name: userResponse.data.family_name,
                      avatar_url: userResponse.data.avatar_url
                    });
                  }
                } catch (error) {
                }
              }
            }
            
            const groupFriend: FriendResponseModel = {
              id: conversationId,
              name: conversationDetails.name || "Group Chat",
              family_name: "",
              avatar_url: conversationDetails.image || "https://via.placeholder.com/40"
            };
            
            Object.defineProperty(groupFriend, 'isGroup', { value: true });
            Object.defineProperty(groupFriend, 'groupMembers', { value: groupMembers });
            
            initializeConversation(conversationId);
            fetchMessages(conversationId);
            
            return groupFriend;
          } else {
            const otherUser = members.find(detail => 
              detail.user_id !== user.id
            );
            
            if (!otherUser || !otherUser.user) {
              return null;
            }
            
            const friend: FriendResponseModel = {
              id: otherUser.user.id,
              name: otherUser.user.name,
              family_name: otherUser.user.family_name,
              avatar_url: otherUser.user.avatar_url
            };
            
            initializeConversation(conversationId);
            fetchMessages(conversationId);
            
            return friend;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user, initializeConversation, fetchMessages]);
  
  const createNewConversation = useCallback(async (userId: string, friendId: string, retryCount = 0): Promise<string | null> => {
    try {
      const friend = friends.find(f => f.id === friendId);
      const friendName = friend ? `${friend.family_name || ''} ${friend.name || ''}`.trim() : 'friend';
      const userName = user ? `${user.family_name || ''} ${user.name || ''}`.trim() : 'user';
      
      let conversationName = `Chat: ${userName} - ${friendName}`;
      if (conversationName.length > 30) {
        const maxNameLength = 10; 
        const truncatedUserName = userName.length > maxNameLength 
          ? userName.substring(0, maxNameLength) + "..." 
          : userName;
        const truncatedFriendName = friendName.length > maxNameLength 
          ? friendName.substring(0, maxNameLength) + "..." 
          : friendName;
        
        conversationName = `Chat: ${truncatedUserName} - ${truncatedFriendName}`;
        
        if (conversationName.length > 30) {
          conversationName = conversationName.substring(0, 29) + "…";
        }
      }
      
      const response = await defaultMessagesRepo.createConversation({
        name: conversationName
      });
      
      if (response.error) {
        throw new Error(`API returned error: ${response.error.message}`);
      }
      
      if (!response.data?.id) {
        throw new Error("No conversation ID received in response");
      }
      
      const conversationId = response.data.id;
      
      const userDetailResponse = await defaultMessagesRepo.createConversationDetail({
        conversation_id: conversationId,
        user_id: userId
      });
      
      if (userDetailResponse.error) {
        throw new Error(`Error adding user: ${userDetailResponse.error.message}`);
      }
      
      const friendDetailResponse = await defaultMessagesRepo.createConversationDetail({
        conversation_id: conversationId,
        user_id: friendId
      });
      
      if (friendDetailResponse.error) {
        throw new Error(`Error adding friend: ${friendDetailResponse.error.message}`);
      }
      
      return conversationId;
    } catch (error) {
      
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return createNewConversation(userId, friendId, retryCount + 1);
      }
      
      return null;
    }
  }, [user, friends]);

  const fetchFriends = useCallback(async (page: number) => {
    try {
      const response = await defaultProfileRepo.getListFriends({
        page: page,
        limit: 20,
        user_id: user?.id,
      });

      if (response?.data) {
        if (Array.isArray(response?.data)) {
          const friends = response?.data.map(
            (friendResponse: UserModel) => ({
              id: friendResponse.id,
              family_name: friendResponse.family_name,
              name: friendResponse.name,
              avatar_url: friendResponse.avatar_url,
            })
          ) as UserModel[];
          setFriends(friends);
        } else {
          setFriends([]);
        }
      }
    } catch (error) {
    }
  }, [user]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await defaultProfileRepo.getProfile(userId);
      if (response?.data) {
        setActiveFriendProfile(response.data);
        setIsProfileModalOpen(true); 
      }
    } catch (error) {
    }
  }, []);

  const handleSendMessage = useCallback((message: string, replyToMessage?: MessageResponseModel) => {
    setMessageError(null);

    if (!message.trim() || !activeFriend || !activeConversationId) {
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
      const friendId = activeFriend.id || '';
      
      if (!prevMessages[friendId]) {
        return {
          ...prevMessages,
          [friendId]: [tempMessage]
        };
      }
      
      return {
        ...prevMessages,
        [friendId]: [...prevMessages[friendId], tempMessage]
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
            const friendId = activeFriend.id || '';
            if (!prevMessages[friendId]) return prevMessages;
            
            const updatedMessages = [...prevMessages[friendId]];
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
              [friendId]: updatedMessages
            };
          });
        }
      }).catch(error => {
      });
    }
    
    setTimeout(() => {
      updateTemporaryMessages(activeFriend.id || '');
    }, 3000);
    
    return true;
  }, [activeFriend, activeConversationId, user, sendMessage, setMessages, updateTemporaryMessages, localStrings]);

  const forceUpdateTempMessages = useCallback(() => {
    if (activeFriend?.id) {
      updateTemporaryMessages(activeFriend.id);
    }
  }, [activeFriend, updateTemporaryMessages]);

  return {
    fetchMessages,
    newMessage,
    setNewMessage,
    activeFriend,
    setActiveFriend,
    messages,
    setMessages,
    messageError,
    setMessageError,
    replyTo,
    setReplyTo,
    messagesEndRef,
    fetchFriends,
    friends,
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
    findFriendByConversationId
  };
};