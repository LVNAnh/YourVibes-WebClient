"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useMessageViewModel } from '@/components/screens/messages/viewModel/MessagesViewModel';
import { useGroupConversationManager } from '@/components/screens/messages/viewModel/components/GroupConversationManager';
import { ConversationWithMembers } from '@/components/screens/messages/viewModel/components/ConversationViewModel';
import { message as antdMessage, Modal } from 'antd';
import { AiOutlineSend, AiOutlineSearch, AiOutlineUsergroupAdd } from "react-icons/ai";
import { FaRegSmile } from 'react-icons/fa';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoMdArrowBack } from "react-icons/io";
import { useConversationViewModel } from '@/components/screens/messages/viewModel/components/ConversationViewModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { BiReply } from 'react-icons/bi';
import { AiOutlineDelete, AiOutlineMore } from 'react-icons/ai';
import { Popover } from 'antd';

const MessagesFeature = () => {
  const { user, localStrings } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use refs to prevent unnecessary re-renders
  const selectedConvRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  
  // View models
  const {
    messageError,
    setMessageError,
    newMessage,
    setNewMessage,
    messages,
    fetchMessages,
    replyTo,
    setReplyTo,
    messagesEndRef,
    setIsProfileModalOpen,
    isProfileModalOpen,
    handleSendMessage,
    isConnected,
    deleteMessage,
    isLoadingMessages,
    forceUpdateTempMessages,
    typingUsers,
    sendTypingIndicator
  } = useMessageViewModel();

  // Conversation view model
  const {
    setActiveConversationId,
    activeConversationId,
    conversations,
    fetchAllConversations,
    isLoadingConversations,
    activeConversation,
    setActiveConversation
  } = useConversationViewModel();

  // Group conversation manager
  const {
    isCreatingGroup,
    groupError,
    handleGroupCreation,
    selectedFriends,
    setSelectedFriends,
    availableFriends,
    setAvailableFriends,
    toggleFriendSelection
  } = useGroupConversationManager();

  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversationSearchText, setConversationSearchText] = useState("");
  const [showGroupCreationError, setShowGroupCreationError] = useState(false);
  
  // Throttled typing indicator
  const lastTypingRef = useRef<number>(0);
  
  // Load conversations when the component mounts
  useEffect(() => {
    if (user?.id) {
      fetchAllConversations();
    }
  }, [user?.id, fetchAllConversations]);

  // Handle conversation selection from URL - with protection against concurrent operations
  useEffect(() => {
    const conversationId = searchParams?.get("conversation");
    if (conversationId && conversationId !== selectedConvRef.current && !processingRef.current) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        console.log("Loading conversation from URL:", conversationId);
        selectedConvRef.current = conversationId;
        
        handleSelectConversation(conversation);
      }
    }
  }, [searchParams, conversations]);

  // Responsive sidebar handling
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
  }, [activeConversation]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(!activeConversation);
    }
  }, [activeConversation]);
  
  // Force update temporary messages
  useEffect(() => {
    if (activeConversationId) {
      const intervalId = setInterval(() => {
        forceUpdateTempMessages();
      }, 200);
      
      return () => clearInterval(intervalId);
    }
  }, [activeConversationId, forceUpdateTempMessages]);
  
  // Show error modal if group creation fails
  useEffect(() => {
    if (groupError) {
      setShowGroupCreationError(true);
    }
  }, [groupError]);

  // Critical effect to load messages when active conversation changes - with debounce
  useEffect(() => {
    if (!activeConversationId || processingRef.current) return;
    
    const timeoutId = setTimeout(() => {
      console.log("Loading messages for conversation:", activeConversationId);
      processingRef.current = true;
      
      fetchMessages(activeConversationId)
        .finally(() => {
          processingRef.current = false;
        });
    }, 50); // Small delay to prevent rapid consecutive calls
    
    return () => clearTimeout(timeoutId);
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeConversationId && messages[activeConversationId]?.length) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activeConversationId, messages]);

  const onEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMessage.trim() && activeConversation) {
      if (newMessage.length > 500) {
        antdMessage.error({
          content: localStrings.Messages.MessageTooLong || "Tin nhắn không được vượt quá 500 ký tự",
          duration: 3 
        });
        return;
      }
      
      sendChatMessage();
    }
  }, [newMessage, activeConversation, localStrings]);
  
  // Handle input change with typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator, but throttle to prevent too many messages
    if (activeConversationId) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2000) { // Send at most every 2 seconds
        sendTypingIndicator(activeConversationId);
        lastTypingRef.current = now;
      }
    }
  }, [activeConversationId, sendTypingIndicator]);
  
  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim() || !activeConversation || !activeConversationId) return;
    
    if (newMessage.length > 500) {
      antdMessage.error({
        content: localStrings.Messages.MessageTooLong || "Tin nhắn không được vượt quá 500 ký tự",
        duration: 3 
      });
      return;
    }
    
    const success = handleSendMessage(newMessage, activeConversationId, replyTo || undefined);
    
    if (success) {
      setNewMessage('');
      setReplyTo(null);
    }
  }, [newMessage, activeConversation, activeConversationId, handleSendMessage, replyTo, localStrings]);
  
  const handleBackToConversationList = useCallback(() => {
    selectedConvRef.current = null;
    setActiveConversation(null);
    setShowSidebar(true);
  }, [setActiveConversation]);

  // Function to create a group chat
  const createGroupChat = useCallback(async () => {
    if (selectedFriends.length < 2) {
      antdMessage.error({
        content: localStrings.Messages.GroupMinimumMembers || "Nhóm chat phải có ít nhất 3 thành viên (bao gồm bạn)",
        duration: 3
      });
      return;
    }

    if (!user?.id) {
      antdMessage.error({
        content: localStrings.Messages.UserNotLoggedIn || "Vui lòng đăng nhập",
        duration: 3
      });
      return;
    }

    const friendIds = selectedFriends.map(f => f.id);
     
    setShowGroupModal(false);
    
    const newConversation = await handleGroupCreation();
    if (newConversation && newConversation.id) {
      router.push(`/messages?conversation=${newConversation.id}`);
    }
  }, [selectedFriends, user, router, localStrings, handleGroupCreation]);

  // Handle conversation selection - CRITICAL FUNCTION - with mutex protection
  const handleSelectConversation = useCallback((conversation: ConversationWithMembers) => {
    if (processingRef.current || conversation.id === selectedConvRef.current) {
      return;
    }
    
    console.log("Selected conversation:", conversation.id);
    processingRef.current = true;
    selectedConvRef.current = conversation.id || null;
    
    // First set the active conversation object
    setActiveConversation(conversation);
    
    // Set active conversation ID
    if (conversation.id) {
      setActiveConversationId(conversation.id);
    }
    
    // Wait for state to update before fetching messages
    setTimeout(() => {
      if (conversation.id) {
        console.log("Fetching messages after selection for:", conversation.id);
        fetchMessages(conversation.id)
          .finally(() => {
            processingRef.current = false;
          });
      } else {
        processingRef.current = false;
      }
    }, 50);
    
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, [setActiveConversation, setActiveConversationId, fetchMessages]);
  
  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!activeConversationId) return;
    
    deleteMessage(messageId, activeConversationId);
  }, [activeConversationId, deleteMessage]);

  const filteredConversations = conversations.filter((conversation) => {
    const conversationName = conversation.name?.toLowerCase() || "";
    return conversationName.includes(conversationSearchText.toLowerCase());
  });
  
  // Get the current messages for the active conversation
  const currentMessages = (
    activeConversationId && 
    messages && 
    messages[activeConversationId]
  ) ? messages[activeConversationId] : [];
  
  // Format message time
  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message component
  const renderMessage = (message: MessageResponseModel) => {
    const isOwnMessage = message.user_id === user?.id;
    const isPending = message.isTemporary;
    
    return (
      <div 
        key={message.id} 
        className={`flex my-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        {!isOwnMessage && (
          <img 
            src={message.user?.avatar_url || "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png"} 
            alt={`${message.user?.name || "User"}'s avatar`} 
            className="w-8 h-8 rounded-full mr-2 self-end"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png";
            }}
          />
        )}
        
        <div className="flex flex-col max-w-[70%]">
          {/* Reply indicator */}
          {message.reply_to && (
            <div className={`text-xs ${isOwnMessage ? 'self-end mr-2' : 'self-start ml-2'} bg-gray-100 p-1 rounded mb-1 text-gray-600`}>
              <div className="flex items-center">
                <BiReply className="mr-1" />
                <span className="truncate max-w-[150px]">
                  {message.reply_to.text || message.reply_to.content}
                </span>
              </div>
            </div>
          )}
          
          <div className={`relative rounded-lg p-2 ${
            isOwnMessage 
              ? 'bg-blue-500 text-white self-end' 
              : 'bg-gray-200 text-gray-800 self-start'
          }`}>
            {/* Message content */}
            <div className="break-words">
              {message.text || message.content}
              {isPending && (
                <span className="text-xs opacity-70 ml-1">
                  {isOwnMessage ? '' : ''}
                </span>
              )}
            </div>
            
            {/* Time */}
            <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatMessageTime(message.created_at)}
            </div>
          </div>
        </div>
        
        {/* Message actions */}
        {isOwnMessage && !isPending && (
          <Popover
            content={
              <div className="flex flex-col">
                <button 
                  onClick={() => handleDeleteMessage(message.id || '')}
                  className="text-left px-2 py-1 hover:bg-red-50 text-red-500"
                >
                  <AiOutlineDelete className="inline mr-1" />
                  {localStrings.PostDetails?.DeleteComment || "Delete"}
                </button>
              </div>
            }
            trigger="click"
            placement="left"
          >
            <button className="self-start ml-1 p-1 text-gray-500 hover:text-gray-700">
              <AiOutlineMore />
            </button>
          </Popover>
        )}
        
        {!isOwnMessage && !isPending && (
          <button 
            onClick={() => setReplyTo(message)}
            className="self-end ml-1 p-1 text-gray-500 hover:text-gray-700"
          >
            <BiReply />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] p-2 md:p-4 relative">
      {/* Left Side Bar - Now showing Conversations */}
      {showSidebar && (
        <div className="w-full md:w-1/3 lg:w-1/4 border-r p-2 md:p-4 overflow-y-auto h-[40vh] md:h-[80vh] bg-white">
          <div className="flex items-center w-full">
            <AiOutlineSearch className="mr-[10px]" />
            <input
              type="text"
              placeholder={localStrings.Messages.SearchConversation || "Tìm kiếm cuộc hội thoại"}
              className="flex-1 p-2 border rounded-lg text-sm md:text-base"
              value={conversationSearchText}
              onChange={(e) => setConversationSearchText(e.target.value)}
            />
            <button
              title={localStrings.Messages.CreateChatGroup}
              aria-label={localStrings.Messages.CreateChatGroup}
              onClick={() => setShowGroupModal(true)}
              className="ml-2 p-1"
            >
              <AiOutlineUsergroupAdd className="text-xl md:text-2xl" />
            </button>
          </div>
          <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 mt-2 md:mt-4">
            {localStrings.Messages.Conversations || "Cuộc hội thoại"}
          </h2>
          
          {isLoadingConversations ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-pulse text-gray-500">Đang tải...</div>
            </div>
          ) : (
            <ul>
              {filteredConversations.map((conversation: ConversationWithMembers, index: number) => {
                const isGroup = conversation.isGroup;
                const conversationName = conversation.name || "Cuộc hội thoại";
                
                const conversationMessages = conversation.id && messages && messages[conversation.id] 
                  ? messages[conversation.id] 
                  : [];
                  
                const latestMessage = conversationMessages.length > 0 ? 
                  conversationMessages[conversationMessages.length - 1] : null;
                
                const senderName = latestMessage?.user_id === user?.id ? 
                  `${localStrings.Messages.You || "Bạn"}: ` : latestMessage?.user?.name ? `${latestMessage.user.name}: ` : "";
                const messageContent = latestMessage?.text || latestMessage?.content || "";
                
                const truncatedMessage = messageContent.length > 30 ? 
                  messageContent.substring(0, 30) + "..." : messageContent;
                
                const otherMembers = conversation.members?.filter(member => 
                  member.user_id !== user?.id
                );
                
                const firstMember = otherMembers && otherMembers.length > 0 ? otherMembers[0].user : null;
                const avatarUrl = isGroup ? (conversation.image || "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png") : 
                  (firstMember?.avatar_url || "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png");
                
                return (
                  <li
                    key={`conv-${conversation.id || index}`}
                    className={`flex items-center p-2 cursor-pointer rounded-lg hover:bg-blue-100 ${selectedConvRef.current === conversation.id ? 'bg-blue-200' : ''}`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <img 
                      src={avatarUrl} 
                      alt={`${conversationName}'s avatar`} 
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-2" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png"; 
                      }}
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-sm md:text-base truncate">{conversationName}</span>
                      {latestMessage && (
                        <span className="text-xs text-gray-500 truncate">
                          {senderName}{truncatedMessage}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      
      {/* Conversation Area */}
      <div className={`flex-1 flex flex-col px-1 md:px-2 ${!showSidebar ? 'block' : 'hidden md:block'}`}>
        {/* Conversation Header */}
        {activeConversation ? (
          <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl items-center shadow-sm'>
            {window.innerWidth < 768 && (
              <button 
                onClick={handleBackToConversationList}
                className="p-2 mr-1"
                aria-label="Back to conversation list"
              >
                <IoMdArrowBack className="text-xl" />
              </button>
            )}
            <img
              src={activeConversation.image || "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png"}
              alt={activeConversation.name || "Conversation avatar"}
              className="mt-1 md:mt-2 mr-3 ml-1 md:ml-2 w-10 h-10 md:w-16 md:h-16 rounded-full object-cover cursor-pointer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "http://localhost:8080/v1/2024/media/f8081529-2d0f-4107-803c-d0299ac30684.png";
              }}
            />
            <div className='grow'>
              <h3 className='mt-1 md:mt-6 mb-1 md:mb-2 ml-1 md:ml-3 text-base md:text-xl font-bold truncate'>
                {activeConversation.name || "Cuộc hội thoại"}
              </h3>
              <p className='mt-0 mb-1 ml-1 md:ml-3 text-xs text-gray-500'>
                {isConnected ? (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {localStrings.Messages.Connected || "Đã kết nối"}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                    {localStrings.Messages.Connecting || "Đang kết nối"}...
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl shadow-sm'>
            <div className='grow p-2 md:p-4'>
              <h3 className='mt-1 md:mt-2 mb-1 md:mb-3 ml-1 md:ml-3 text-base md:text-xl font-bold'>
                {localStrings.Messages.ChooseConversationToChat || "Chọn cuộc hội thoại để trò chuyện"}
              </h3>
            </div>
          </div>
        )}

        {/* Conversation Content */}
        <div className="flex-1 border rounded-lg mb-4 bg-gray-100 h-[64vh] relative overflow-y-auto p-3">
          {/* Loading state */}
          {activeConversationId && isLoadingMessages && 
            typeof isLoadingMessages === 'object' && 
            isLoadingMessages[activeConversationId] ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-pulse text-gray-500">Đang tải tin nhắn...</div>
            </div>
          ) : !activeConversation ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="text-gray-500">
                {localStrings.Messages.ChooseFriendToChat || "Chọn cuộc trò chuyện để chat"}
              </div>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="text-gray-500">
                {localStrings.Messages.NoMessages || "Chưa có tin nhắn nào"}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {currentMessages.map(renderMessage)}
              {/* Typing indicator */}
              {activeConversationId && 
                typingUsers && 
                typingUsers[activeConversationId]?.length > 0 && (
                <div className="flex items-center mt-2 mb-1">
                  <div className="bg-gray-200 text-gray-700 rounded-lg py-1 px-2">
                    <div className="flex items-center">
                      <div className="mr-2 text-xs">
                        {typingUsers[activeConversationId][0].username} is typing
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* End of messages marker */}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>
        
        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center bg-gray-50 p-2 rounded-lg mb-2">
            <div className="flex-1 truncate">
              <span className="text-sm text-gray-500">{localStrings.Messages.Reply || "Trả lời"}: {replyTo.text || replyTo.content}</span>
            </div>
            <button 
              onClick={() => setReplyTo(null)} 
              className="text-red-500 ml-2"
              aria-label="Cancel reply"
            >
              {localStrings.Messages.Cancel || "Hủy"}
            </button>
          </div>
        )}
        
        {/* Input area */}
        <div className="flex gap-2 relative mb-2 md:mb-4">
          {messageError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-sm">
              {messageError}
            </div>
          )}
        
          <button
            title="Chọn emoji"
            aria-label="Chọn emoji"
            className="p-1 mr-0 relative z-10"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!activeConversation}
          >
            <FaRegSmile className={`text-2xl ${!activeConversation ? 'text-gray-400' : ''}`} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-0 z-20">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}
          <div className="flex items-center w-full">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={activeConversation ? (localStrings.Messages.EnterMessage || "Nhập tin nhắn") : (localStrings.Messages.ChooseConversationToConnect || "Chọn cuộc hội thoại để kết nối")}
              className="w-full p-2 border rounded-lg outline-none"
              disabled={!activeConversation}
            />
          </div>
          <button
            onClick={sendChatMessage}
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
            className={`px-4 py-2 rounded-lg text-white ${newMessage.trim() && activeConversation ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!newMessage.trim() || !activeConversation}
          >
            <AiOutlineSend />
          </button>
        </div>
      </div>

      {/* Group chat creation modal */}
      <Modal
        title={localStrings.Messages.CreateChatGroup || "Tạo nhóm chat"}
        open={showGroupModal}
        onCancel={() => setShowGroupModal(false)}
        footer={null}
        styles={{ 
          body: { padding: '20px' },
          mask: { background: 'rgba(0, 0, 0, 0.6)' },
          content: { 
            width: '90%', 
            maxWidth: '500px',
            margin: '0 auto' 
          }
        }}
      >
        {/* Group chat modal content */}
        <input
          type="text"
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.target.value)}
          placeholder={localStrings.Messages.FindFriendInModal || "Tìm kiếm bạn bè"}
          className="w-full p-2 border rounded-lg mb-4 text-sm md:text-base"
        />
        <div className="mb-4 text-sm text-gray-600">
          {localStrings.Messages.GroupSelectionInfo || "Chọn ít nhất 2 người bạn để tạo nhóm chat"}
          <div className="font-bold mt-1">
            {localStrings.Messages.SelectedFriends || "Đã chọn"}: {selectedFriends.length}/
            {localStrings.Messages.MinimumFriends || "Tối thiểu"}: 2
          </div>
        </div>
        {/* Friend selection list would go here */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowGroupModal(false)}
            className="px-2 py-1 md:px-4 md:py-2 rounded-lg border border-gray-400 text-gray-700 text-sm md:text-base"
          >
            {localStrings.Messages.Cancel || "Hủy"}
          </button>
          <button
            onClick={createGroupChat}
            disabled={selectedFriends.length < 2}
            className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-white text-sm md:text-base ${
              selectedFriends.length < 2 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {localStrings.Messages.Confirm || "Xác nhận"}
          </button>
        </div>
        
        {/* Friend list for selection */}
        <div className="mt-4 max-h-60 overflow-y-auto">
          <h4 className="font-medium mb-2">{localStrings.Messages.Friends || "Bạn bè"}</h4>
          <ul className="divide-y">
            {availableFriends.filter(friend => 
              friend.name?.toLowerCase().includes(groupSearch.toLowerCase()) ||
              friend.family_name?.toLowerCase().includes(groupSearch.toLowerCase())
            ).map(friend => (
              <li 
                key={friend.id} 
                className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 ${
                  selectedFriends.some(f => f.id === friend.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleFriendSelection(friend)}
              >
                <img 
                  src={friend.avatar_url || "https://via.placeholder.com/40"} 
                  alt={`${friend.name}'s avatar`} 
                  className="w-8 h-8 rounded-full mr-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                  }}
                />
                <span className="flex-1">{friend.name} {friend.family_name}</span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ml-2 ${
                  selectedFriends.some(f => f.id === friend.id) 
                    ? 'bg-blue-500 text-white' 
                    : 'border border-gray-300'
                }`}>
                  {selectedFriends.some(f => f.id === friend.id) && '✓'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
      
      {/* Error Modal for Group Creation */}
      <Modal
        title={localStrings.Messages.Error || "Lỗi"}
        open={showGroupCreationError}
        onCancel={() => setShowGroupCreationError(false)}
        footer={[
          <button
            key="ok"
            onClick={() => setShowGroupCreationError(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            {localStrings.Messages.OK || "OK"}
          </button>
        ]}
      >
        <p>{groupError}</p>
      </Modal>
    </div>
  );
};

export default MessagesFeature;