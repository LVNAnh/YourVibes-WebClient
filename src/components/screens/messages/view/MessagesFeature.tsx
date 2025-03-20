"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useMessageViewModel } from '@/components/screens/messages/viewModel/MessagesViewModel';
import { useGroupConversationManager } from '@/components/screens/messages/viewModel/GroupConversationManager'; 
import { message as antdMessage, Spin, Modal } from 'antd';
import { AiOutlineSend, AiOutlineSearch, AiOutlineUsergroupAdd } from "react-icons/ai";
import { FaRegSmile } from 'react-icons/fa';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { CiCircleChevDown } from "react-icons/ci";
import { useRouter, useSearchParams } from 'next/navigation';
import { IoMdArrowBack } from "react-icons/io";
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { useConversationViewModel } from '@/components/screens/messages/viewModel/ConversationViewModel';

const MessagesFeature = () => {
  const { user, localStrings } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const {
    messageError,
    newMessage,
    setNewMessage,
    activeFriend,         
    setActiveFriend,
    messages,
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

  const {
    isCreatingGroup,
    groupError,
  } = useGroupConversationManager();

  const {
    fetchAllConversations,
  } = useConversationViewModel();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [friendSearchText, setFriendSearchText] = useState("");
  const [showGroupCreationError, setShowGroupCreationError] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [showFriendsTab, setShowFriendsTab] = useState(true);
  
  let hoverTimeout: NodeJS.Timeout | null = null;

  const isUserMessage = (message: MessageResponseModel): boolean => {
    return message.user_id === user?.id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  };

  useEffect(() => {
    if (user?.id) {
      fetchAllConversations();
    }
  }, [user?.id, fetchAllConversations]);

  useEffect(() => {
    const conversationId = searchParams?.get("conversation");
    if (conversationId) {
      console.log("Loading conversation with ID:", conversationId);
    }
    
    const members = searchParams?.get("members");
    if (members) {
      console.log("Members parameter found:", members);
    }
  }, [searchParams]);

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
  }, [activeFriend]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(!activeFriend);
    }
  }, [activeFriend]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }, [messages, activeFriend]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (activeFriend?.id) {
        forceUpdateTempMessages();
      }
    }, 200);
    
    return () => clearInterval(intervalId);
  }, [activeFriend, forceUpdateTempMessages]);
  
  useEffect(() => {
    if (activeFriend?.id) {
      const friendMessages = messages[activeFriend.id];
      console.log(`Render với ${friendMessages?.length || 0} tin nhắn cho friend ${activeFriend.id}`);
    }
  }, [messages, activeFriend]);

  useEffect(() => {
    if (user?.id) {
      fetchFriends(1);
    }
  }, [user, fetchFriends]);

  useEffect(() => {
    if (groupError) {
      setShowGroupCreationError(true);
    }
  }, [groupError]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMessage.trim() && activeFriend) {
      if (newMessage.length > 500) {
        antdMessage.error({
          content: localStrings.Messages.MessageTooLong || "Tin nhắn không được vượt quá 500 ký tự",
          duration: 3 
        });
        return;
      }
      
      sendChatMessage();
    }
  };
  
  const sendChatMessage = () => {
    if (!newMessage.trim() || !activeFriend || !activeConversationId) return;
    
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
  };
  
  const handleBackToFriendList = () => {
    setActiveFriend(null);
    setShowSidebar(true);
  };

  const createGroupChat = async () => {
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

    const allMembers = [user.id, ...selectedFriends];
     
    setShowGroupModal(false);
    
    router.push(`/messages?members=${allMembers.join(',')}`);
  };

  const activeFriendData = activeFriend 
    ? friends.find((friend: FriendResponseModel) => friend.id === activeFriend.id)
    : null;

  const filteredFriends = friends.filter((friend: FriendResponseModel) => {
    const fullName = `${friend.family_name || ""} ${friend.name || ""}`.toLowerCase();
    return fullName.includes(friendSearchText.toLowerCase());
  });
  
  const currentMessages = activeFriend?.id ? messages[activeFriend.id] || [] : [];

  return (
    <div className="flex flex-col md:flex-row h-[85vh] p-2 md:p-4 relative">
      {/* Left Side Bar */}
      {showSidebar && (
        <div className="w-full md:w-1/3 lg:w-1/4 border-r p-2 md:p-4 overflow-y-auto h-[40vh] md:h-[80vh] bg-white">
          <div className="flex items-center w-full">
            <AiOutlineSearch className="mr-[10px]" />
            <input
              type="text"
              placeholder={localStrings.Messages.SearchUser}
              className="flex-1 p-2 border rounded-lg text-sm md:text-base"
              value={friendSearchText}
              onChange={(e) => setFriendSearchText(e.target.value)}
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
          <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 mt-2 md:mt-4">{localStrings.Messages.FriendBar}</h2>
          <ul>
          {filteredFriends.map((friend: FriendResponseModel, index: number) => {
            const friendName = friend.name || "";
            const friendFamilyName = friend.family_name || "";
            
            const friendMessages = friend.id ? messages[friend.id] || [] : [];
            const latestMessage = friendMessages.length > 0 ? 
              friendMessages[friendMessages.length - 1] : null;
            
            const senderName = latestMessage?.user_id === user?.id ? 
              `${localStrings.Messages.You}: ` : latestMessage?.user?.name ? `${latestMessage.user.name}: ` : "";
            const messageContent = latestMessage?.text || latestMessage?.content || "";
            
            const truncatedMessage = messageContent.length > 30 ? 
              messageContent.substring(0, 30) + "..." : messageContent;
            
            return (
              <li
                key={index}
                className={`flex items-center p-2 cursor-pointer rounded-lg hover:bg-blue-100 ${activeFriend?.id === friend.id ? 'bg-blue-200' : ''}`}
                onClick={() => {
                  setActiveFriend(friend);
                  if (window.innerWidth < 768) {
                    setShowSidebar(false);
                  }
                }}
              >
                <img 
                  src={friend.avatar_url} 
                  alt={`${friendName}'s avatar`} 
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-2" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/40"; 
                  }}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-sm md:text-base truncate">{friendFamilyName} {friendName}</span>
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
        </div>
      )}
      
      {/* Conversation Area */}
      <div className={`flex-1 flex flex-col px-1 md:px-2 ${!showSidebar ? 'block' : 'hidden md:block'}`}>
        {/* Conversation Header */}
        {activeFriend ? (
          <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl items-center shadow-sm'>
            {window.innerWidth < 768 && (
              <button 
                onClick={handleBackToFriendList}
                className="p-2 mr-1"
                aria-label="Back to friend list"
              >
                <IoMdArrowBack className="text-xl" />
              </button>
            )}
            <img
              src={activeFriendData?.avatar_url || "https://via.placeholder.com/64"}
              alt={activeFriendData?.name || "Friend avatar"}
              className="mt-1 md:mt-2 mr-3 ml-1 md:ml-2 w-10 h-10 md:w-16 md:h-16 rounded-full object-cover cursor-pointer"
              onMouseEnter={() => {
                hoverTimeout = setTimeout(() => {
                  if (activeFriendData?.id) {
                    fetchUserProfile(activeFriendData.id);
                  }
                }, 200); 
              }}
              onMouseLeave={() => {
                if (hoverTimeout) {
                  clearTimeout(hoverTimeout); 
                }
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/64";
              }}
            />
            <div className='grow'>
              <h3 className='mt-1 md:mt-6 mb-1 md:mb-2 ml-1 md:ml-3 text-base md:text-xl font-bold truncate'>
                {activeFriendData ? `${activeFriendData.family_name || ""} ${activeFriendData.name || ""}`.trim() : "Chọn bạn để chat"}
              </h3>
              <p className='mt-0 mb-1 ml-1 md:ml-3 text-xs text-gray-500'>
                {isConnected ? (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    {localStrings.Messages.Connected}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                    {localStrings.Messages.Connecting}...
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl shadow-sm'>
            <div className='grow p-2 md:p-4'>
              <h3 className='mt-1 md:mt-2 mb-1 md:mb-3 ml-1 md:ml-3 text-base md:text-xl font-bold'>{localStrings.Messages.ChooseFriendToChat}</h3>
            </div>
          </div>
        )}

        {/* Conversation Content */}
        <div
          className="flex-1 overflow-y-auto border p-4 rounded-lg mb-4 bg-gray-100 h-[64vh] relative"
          onScroll={(e) => {
            const target = e.currentTarget;
            const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 100;
            setShowScrollToBottom(isNearBottom);
          }}
        >
          {activeFriend ? (
            isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Spin size="large" tip="Đang tải tin nhắn..." />
              </div>
            ) : isCreatingGroup ? (
              <div className="flex justify-center items-center h-full">
                <Spin size="large" tip="Đang tạo nhóm chat..." />
              </div>
            ) : currentMessages.length > 0 ? (
              <>
                {(() => {
                  const messagesByDate: Record<string, MessageResponseModel[]> = {};
                  
                  currentMessages.forEach(message => {
                    const date = new Date(message.created_at || new Date());
                    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    
                    if (!messagesByDate[dateKey]) {
                      messagesByDate[dateKey] = [];
                    }
                    
                    messagesByDate[dateKey].push(message);
                  });
                  
                  return Object.entries(messagesByDate)
                    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB)) 
                    .map(([dateKey, messagesForDate]) => {
                      const [year, month, day] = dateKey.split('-').map(Number);
                      const formattedDate = `${day}/${month}/${year}`;
                      
                      return (
                        <div key={dateKey} className="mb-6">
                          <div className="flex justify-center mb-4">
                            <div className="bg-gray-200 rounded-full px-4 py-1 text-sm text-gray-600">
                              {formattedDate}
                            </div>
                          </div>
                          
                          {messagesForDate.map((message, index) => {
                            const isUser = isUserMessage(message);
                            const messageContent = message.text || message.content || "";
                            
                            const messageDate = new Date(message.created_at || new Date());
                            const timeString = `${String(messageDate.getHours()).padStart(2, '0')}:${String(messageDate.getMinutes()).padStart(2, '0')}:${String(messageDate.getSeconds()).padStart(2, '0')}`;
                            
                            return (
                              <div key={message.id || index} className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                {!isUser && (
                                  <img
                                    src={message.user?.avatar_url || "https://via.placeholder.com/40"}
                                    alt={`${message.user?.name || "Friend"}'s avatar`}
                                    className="w-8 h-8 rounded-full mr-2"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                                    }}
                                  />
                                )}
                                <div 
                                  className={`p-3 rounded-lg shadow max-w-xs md:max-w-sm w-fit break-words ${
                                    isUser ? 'bg-blue-100' : 'bg-white'
                                  } ${message.isTemporary ? 'opacity-70' : 'opacity-100'}`}
                                >
                                  <div className="mb-1">{messageContent}</div>
                                  {message.reply_to && (
                                    <div className="text-sm text-gray-500 mt-1 p-1 bg-gray-100 rounded border-l-2 border-gray-300">
                                      {localStrings.Messages.Reply}: {message.reply_to.text || message.reply_to.content}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <span>{timeString}</span>
                                    {message.isTemporary && (
                                      <>
                                        <span className="mx-1">•</span>
                                        <span className="text-blue-500 flex items-center">
                                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Đang gửi...
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {!message.isTemporary && (
                                    <div className="flex gap-2 mt-2 items-center">
                                      <button onClick={() => setReplyTo(message)} className="text-xs text-blue-500">
                                        {localStrings.Messages.Reply}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {isUser && (
                                  <img
                                    src={user?.avatar_url || "https://via.placeholder.com/40"}
                                    alt="Your avatar"
                                    className="w-8 h-8 rounded-full ml-2"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                })()}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">{localStrings.Messages.NoMessages}</p>
            )
          ) : (
            <p className="text-gray-500 text-center py-8">{localStrings.Messages.ChooseFriendToConnect}</p>
          )}
        </div>
        {showScrollToBottom && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
              setShowScrollToBottom(false);
            }}
            className="absolute bottom-16 md:bottom-20 md:mb-2 right-6 md:right-12 p-1 md:p-2 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-200"
            title={localStrings.Messages.ScrollToBottom}
          >
            <CiCircleChevDown className="text-xl md:text-2xl text-gray-700" />
          </button>
        )}
        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center bg-gray-50 p-2 rounded-lg mb-2">
            <div className="flex-1 truncate">
              <span className="text-sm text-gray-500">{localStrings.Messages.Reply}: {replyTo.text || replyTo.content}</span>
            </div>
            <button 
              onClick={() => setReplyTo(null)} 
              className="text-red-500 ml-2"
              aria-label="Cancel reply"
            >
              {localStrings.Messages.Cancel}
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
            disabled={!activeFriend}
          >
            <FaRegSmile className={`text-2xl ${!activeFriend ? 'text-gray-400' : ''}`} />
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
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeFriend ? localStrings.Messages.EnterMessage : localStrings.Messages.ChooseFriendToConnect}
              className="w-full p-2 border rounded-lg outline-none"
              disabled={!activeFriend}
            />
          </div>
          <button
            onClick={sendChatMessage}
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
            className={`px-4 py-2 rounded-lg text-white ${newMessage.trim() && activeFriend ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!newMessage.trim() || !activeFriend}
          >
            <AiOutlineSend />
          </button>
        </div>
      </div>

      {/* Modal tạo nhóm chat */}
      <Modal
        title={localStrings.Messages.CreateChatGroup}
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
        <input
          type="text"
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.target.value)}
          placeholder={localStrings.Messages.FindFriendInModal}
          className="w-full p-2 border rounded-lg mb-4 text-sm md:text-base"
        />
        <div className="mb-4 text-sm text-gray-600">
          {localStrings.Messages.GroupSelectionInfo || "Chọn ít nhất 2 người bạn để tạo nhóm chat"}
          <div className="font-bold mt-1">
            {localStrings.Messages.SelectedFriends || "Đã chọn"}: {selectedFriends.length}/
            {localStrings.Messages.MinimumFriends || "Tối thiểu"}: 2
          </div>
        </div>
        <ul className="max-h-40 md:max-h-60 overflow-y-auto mb-4">
          {friends
            .filter((friend: FriendResponseModel) => {
              const fullName = `${friend.family_name || ""} ${friend.name || ""}`.toLowerCase();
              return fullName.includes(groupSearch.toLowerCase());
            })
            .map((friend: FriendResponseModel, index: number) => {
              const fullName = `${friend.family_name || ""} ${friend.name || ""}`;
              return (
                <li
                  key={index}
                  onClick={() => {
                    if (selectedFriends.includes(friend.id!)) {
                      setSelectedFriends((prev) => prev.filter((id) => id !== friend.id));
                    } else {
                      setSelectedFriends((prev) => [...prev, friend.id!]);
                    }
                  }}
                  className="flex items-center p-2 cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    id={`friend-checkbox-${friend.id}`}
                    checked={selectedFriends.includes(friend.id!)}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-2"
                    title={`Chọn ${fullName} vào nhóm chat`}
                  />
                  <img 
                    src={friend.avatar_url} 
                    alt={fullName} 
                    className="w-6 h-6 md:w-8 md:h-8 rounded-full mr-2" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/32";
                    }}
                  />
                  <span className="text-sm md:text-base">{fullName}</span>
                </li>
              );
            })}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowGroupModal(false)}
            className="px-2 py-1 md:px-4 md:py-2 rounded-lg border border-gray-400 text-gray-700 text-sm md:text-base"
          >
            {localStrings.Messages.Cancel}
          </button>
          <button
            onClick={createGroupChat}
            disabled={selectedFriends.length < 2}
            className={`px-2 py-1 md:px-4 md:py-2 rounded-lg text-white text-sm md:text-base ${
              selectedFriends.length < 2 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {localStrings.Messages.Confirm}
          </button>
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
      
      {/* Modal hiển thị thông tin hồ sơ */}
      <Modal
        title={localStrings.Messages.UserProfile}
        open={isProfileModalOpen}
        onCancel={() => setIsProfileModalOpen(false)}
        footer={null}
        styles={{ 
          body: { padding: '20px' },
          mask: { background: 'rgba(0, 0, 0, 0.6)' },
          content: { 
            width: '90%', 
            maxWidth: '400px',
            margin: '0 auto' 
          }
        }}
      >
        {activeFriendProfile ? (
          <div className="flex flex-col items-center p-2 md:p-4">
            <img
              src={activeFriendProfile.avatar_url || "https://via.placeholder.com/100"}
              alt="Avatar"
              className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-gray-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
              }}
            />
            <h3 className="mt-2 text-base md:text-lg font-bold">{activeFriendProfile.family_name} {activeFriendProfile.name}</h3>
            <p className="text-sm md:text-base text-gray-600">{activeFriendProfile.email}</p>
            <div className="w-full mt-4">
              <button
                className="w-full py-1 md:py-2 border border-black text-black rounded-md hover:bg-gray-100 text-sm md:text-base"
                onClick={() => window.open(`/user/${activeFriendProfile.id}`, "_parent")}
              >
                {localStrings.Messages.ProfilePage}
              </button>
              <button
                className="w-full py-1 md:py-2 mt-2 border border-black text-black rounded-md hover:bg-gray-100 text-sm md:text-base"
                onClick={() => alert("Tính năng chặn chưa được triển khai")}
              >
                {localStrings.Messages.Block}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm md:text-base">Đang tải thông tin...</p>
        )}
      </Modal>
    </div>
  );
};

export default MessagesFeature;