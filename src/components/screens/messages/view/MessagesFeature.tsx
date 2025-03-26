"use client";

import React, { useRef } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useMessageViewModel } from '@/components/screens/messages/viewModel/MessagesViewModel';
import { useGroupConversationManager } from '@/components/screens/messages/viewModel/components/GroupConversationManager';
import { useConversationViewModel } from '@/components/screens/messages/viewModel/components/ConversationViewModel';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMessageEffects, useResponsiveEffects } from './hooks/useMessageEffects';
import useUIState from './hooks/useUIState';

// Component imports
import FriendsSidebar from './components/FriendsSidebar';
import ConversationHeader from './components/ConversationHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ScrollToBottomButton from './components/ScrollToBottomButton';
import CreateGroupModal from './components/modals/CreateGroupModal';
import ProfileModal from './components/modals/ProfileModal';
import ErrorModal from './components/modals/ErrorModal';

const MessagesFeature = () => {
  const { user, localStrings } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // View models
  const {
    messageError,
    setMessageError,
    newMessage,
    setNewMessage,
    activeFriend,         
    setActiveFriend,
    messages,
    fetchMessages,
    replyTo,
    setReplyTo,
    messagesEndRef,
    fetchFriends,
    friends,
    fetchUserProfile,
    setIsProfileModalOpen,
    isProfileModalOpen,
    activeFriendProfile,
    activeConversationId,
    handleSendMessage,
    isConnected,
    isLoadingMessages,
    forceUpdateTempMessages
  } = useMessageViewModel();

  // Group conversation manager
  const {
    conversationMembers,
    isCreatingGroup,
    groupError,
    handleGroupCreation,
    findExistingGroupConversation
  } = useGroupConversationManager();

  // Conversation view model
  const {
    setActiveConversationId,
    conversations,
    fetchAllConversations,
    isLoadingConversations
  } = useConversationViewModel();

  // UI state management
  const {
    uiState,
    scrollToBottom,
    handleEmojiClick,
    toggleEmojiPicker,
    handleScroll,
    handleKeyDown,
    sendChatMessage,
    handleBackToFriendList,
    updateUIState,
    toggleGroupModal,
    handleFriendSelect
  } = useUIState(
    localStrings,
    handleSendMessage,
    setNewMessage,
    setReplyTo,
    messagesEndRef,
    setActiveFriend,
    newMessage,
    activeFriend,
    replyTo,
    activeConversationId
  );

  // Effects
  useMessageEffects(
    messagesEndRef,
    activeFriend,
    messages,
    forceUpdateTempMessages,
    fetchFriends,
    scrollToBottom,
    user
  );

  useResponsiveEffects(
    activeFriend,
    (show) => updateUIState({ showSidebar: show })
  );

  // Search params effects
  React.useEffect(() => {
    const conversationId = searchParams?.get("conversation");
    if (conversationId) {
      console.log("Loading conversation with ID:", conversationId);
    }
    
    const members = searchParams?.get("members");
    if (members) {
      console.log("Members parameter found:", members);
    }
  }, [searchParams]);

  // Create group chat handler
  const createGroupChat = async () => {
    if (uiState.selectedFriends.length < 2) {
      setMessageError(localStrings.Messages.GroupMinimumMembers || "Nhóm chat phải có ít nhất 3 thành viên (bao gồm bạn)");
      return;
    }

    if (!user?.id) {
      setMessageError(localStrings.Messages.UserNotLoggedIn || "Vui lòng đăng nhập");
      return;
    }

    const allMembers = [user.id, ...uiState.selectedFriends];
    updateUIState({ showGroupModal: false });
    
    router.push(`/messages?members=${allMembers.join(',')}`);
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] p-2 md:p-4 relative">
      {/* Left Side Bar */}
      {uiState.showSidebar && (
        <FriendsSidebar
          friends={friends}
          activeFriend={activeFriend}
          messages={messages}
          friendSearchText={uiState.friendSearchText}
          currentUser={user}
          onSearchChange={(text) => updateUIState({ friendSearchText: text })}
          onFriendSelect={setActiveFriend}
          onCreateGroup={toggleGroupModal}
          localStrings={localStrings}
        />
      )}
      
      {/* Conversation Area */}
      <div className={`flex-1 flex flex-col px-1 md:px-2 ${!uiState.showSidebar ? 'block' : 'hidden md:block'}`}>
        {/* Conversation Header */}
        <ConversationHeader
          activeFriend={activeFriend}
          isConnected={isConnected}
          onBackClick={handleBackToFriendList}
          onProfileView={fetchUserProfile}
          localStrings={localStrings}
        />

        {/* Conversation Content */}
        <MessageList
          messages={activeFriend?.id ? messages[activeFriend.id] || [] : []}
          currentUser={user}
          onReply={setReplyTo}
          messagesEndRef={messagesEndRef}
          onScroll={handleScroll}
          activeFriend={activeFriend}
          isLoadingMessages={isLoadingMessages}
          isCreatingGroup={isCreatingGroup}
          localStrings={localStrings}
        />
        
        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          visible={uiState.showScrollToBottom}
          onClick={scrollToBottom}
          localStrings={localStrings}
        />

        {/* Message input */}
        <MessageInput
          newMessage={newMessage}
          replyTo={replyTo}
          activeFriend={activeFriend}
          messageError={messageError}
          showEmojiPicker={uiState.showEmojiPicker}
          onMessageChange={setNewMessage}
          onEmojiClick={handleEmojiClick}
          onEmojiPickerToggle={toggleEmojiPicker}
          onSendMessage={sendChatMessage}
          onCancelReply={() => setReplyTo(null)}
          onKeyDown={handleKeyDown}
          localStrings={localStrings}
        />
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={uiState.showGroupModal}
        friends={friends}
        selectedFriends={uiState.selectedFriends}
        groupSearch={uiState.groupSearch}
        onClose={toggleGroupModal}
        onSearchChange={(search) => updateUIState({ groupSearch: search })}
        onFriendSelect={handleFriendSelect}
        onCreateGroup={createGroupChat}
        localStrings={localStrings}
      />
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={activeFriendProfile}
        onClose={() => setIsProfileModalOpen(false)}
        localStrings={localStrings}
      />
      
      <ErrorModal
        isOpen={uiState.showGroupCreationError}
        errorMessage={groupError}
        onClose={() => updateUIState({ showGroupCreationError: false })}
        localStrings={localStrings}
      />
    </div>
  );
};

export default MessagesFeature;