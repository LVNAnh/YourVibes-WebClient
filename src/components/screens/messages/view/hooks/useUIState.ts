import { useState, useCallback } from 'react';
import { MessageUIState } from '../../types/messageTypes';
import { message as antdMessage } from 'antd';
import { EmojiClickData } from 'emoji-picker-react';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { ConversationWithMembers } from '../../viewModel/components/ConversationViewModel';

export const useUIState = (
  localStrings: any,
  handleSendMessage: (message: string, replyTo?: MessageResponseModel) => boolean,
  setNewMessage: (message: string | ((prev: string) => string)) => void,
  setReplyTo: (message: MessageResponseModel | null) => void,
  messagesEndRef: React.RefObject<HTMLDivElement>,
  setActiveFriend: (friend: FriendResponseModel | null) => void,
  newMessage: string,
  activeFriend: FriendResponseModel | null,
  replyTo: MessageResponseModel | null,
  activeConversationId: string | null
) => {
  // UI State
  const [uiState, setUIState] = useState<MessageUIState>({
    showEmojiPicker: false,
    showGroupModal: false,
    groupSearch: "",
    selectedFriends: [],
    showScrollToBottom: false,
    showSidebar: true,
    friendSearchText: "",
    showGroupCreationError: false,
    showConversations: true,
    showFriendsTab: true
  });

  // Handlers
  const toggleEmojiPicker = useCallback(() => {
    setUIState(prev => ({ ...prev, showEmojiPicker: !prev.showEmojiPicker }));
  }, []);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setNewMessage((prev: string) => prev + emojiData.emoji);
    setUIState((prev: MessageUIState) => ({ ...prev, showEmojiPicker: false }));
  }, [setNewMessage]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messagesEndRef]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 100;
    setUIState(prev => ({ ...prev, showScrollToBottom: isNearBottom }));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMessage.trim() && activeConversationId) {
      if (newMessage.length > 500) {
        antdMessage.error({
          content: localStrings.Messages.MessageTooLong || "Tin nhắn không được vượt quá 500 ký tự",
          duration: 3 
        });
        return;
      }
      
      sendChatMessage();
    }
  }, [newMessage, activeConversationId, localStrings]);

  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim() || !activeConversationId) return;
    
    if (newMessage.length > 500) {
      antdMessage.error({
        content: localStrings.Messages.MessageTooLong || "Tin nhắn không được vượt quá 500 ký tự",
        duration: 3 
      });
      return;
    }
    
    const success = handleSendMessage(newMessage, replyTo || undefined);
    
    if (success) {
      setNewMessage('');
      setReplyTo(null);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [newMessage, activeConversationId, replyTo, handleSendMessage, setNewMessage, setReplyTo, scrollToBottom, localStrings]);

  const handleBackToConversationList = useCallback(() => {
    setActiveFriend(null);
    setUIState(prev => ({ ...prev, showSidebar: true }));
  }, [setActiveFriend]);

  const updateUIState = useCallback((updates: Partial<MessageUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleGroupModal = useCallback(() => {
    setUIState(prev => ({ ...prev, showGroupModal: !prev.showGroupModal }));
  }, []);

  const handleFriendSelect = useCallback((friendId: string) => {
    setUIState(prev => {
      const selectedFriends = [...prev.selectedFriends];
      const index = selectedFriends.indexOf(friendId);
      
      if (index === -1) {
        selectedFriends.push(friendId);
      } else {
        selectedFriends.splice(index, 1);
      }
      
      return { ...prev, selectedFriends };
    });
  }, []);

  return {
    uiState,
    scrollToBottom,
    handleEmojiClick,
    toggleEmojiPicker,
    handleScroll,
    handleKeyDown,
    sendChatMessage,
    handleBackToConversationList,
    updateUIState,
    toggleGroupModal,
    handleFriendSelect
  };
};

export default useUIState;