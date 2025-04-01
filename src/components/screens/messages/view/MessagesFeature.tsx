"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useMessagesViewModel } from "../viewModel/MessagesViewModel";
import { Avatar, Button, Empty, Input, Layout, List, Skeleton, Spin, Typography, Popover, Badge } from "antd";
import { SendOutlined, EllipsisOutlined, SearchOutlined, ArrowLeftOutlined, PlusOutlined, SmileOutlined } from "@ant-design/icons";
import useColor from "@/hooks/useColor";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import NewConversationModal from "./NewConversationModal";
import MessageItem from "./MessageItem";
import DateSeparator from "./DateSeparator";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

const { Header, Content, Sider } = Layout;
const { Search } = Input;
const { Text, Title } = Typography;

const MessagesFeature: React.FC = () => {
  const { user, localStrings } = useAuth();
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const {
    deleteMessage,
    createConversation,
    conversations,
    currentConversation,
    messages,
    messagesLoading,
    conversationsLoading,
    searchText,
    messageText,
    setSearchText,
    setMessageText,
    setCurrentConversation,
    sendMessage,
    fetchMessages,
    isMessagesEnd,
    loadMoreMessages,
    isWebSocketConnected,
    messageListRef,
    handleScroll,
    getMessagesForConversation,
    initialMessagesLoaded,
    unreadMessages,
    markConversationAsRead,
  } = useMessagesViewModel();

  const [isMobile, setIsMobile] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const { backgroundColor, lightGray, brandPrimary } = useColor();

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Handle mobile view
  useEffect(() => {
    if (isMobile && currentConversation) {
      setShowConversation(false);
    }
  }, [currentConversation, isMobile]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  // Handle message send
  const handleSendMessage = () => {
    if (messageText.trim() && currentConversation) {
      sendMessage();
    }
  };

  // Handle message input enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Handle selecting a conversation with debounce
  const handleSelectConversation = useCallback((conversation: ConversationResponseModel) => {
    // Skip if same conversation already selected
    if (currentConversation?.id === conversation.id) {
      return;
    }
    
    setCurrentConversation(conversation);
    
    // Delay fetching messages to prevent API hammering
    setTimeout(() => {
      if (conversation.id) {
        fetchMessages(conversation.id);
        // Mark messages as read when conversation is selected
        markConversationAsRead(conversation.id);
      }
    }, 200);
  }, [currentConversation?.id, fetchMessages, setCurrentConversation, markConversationAsRead]);

  // Back button for mobile view
  const handleBackToConversations = () => {
    setShowConversation(true);
  };

  // Format timestamp to readable time
  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter conversations by search text
  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Add a modal to create new conversations
  const [newConversationModalVisible, setNewConversationModalVisible] = useState(false);

  return (
    <Layout style={{ height: "calc(100vh - 64px)", background: backgroundColor }}>
      {/* Conversations Sidebar */}
      {(showConversation || !isMobile) && (
        <Sider 
          width={isMobile ? "100%" : 300} 
          style={{ 
            background: backgroundColor,
            overflow: "auto",
            borderRight: `1px solid ${lightGray}`,
            display: isMobile ? (showConversation ? "block" : "none") : "block"
          }}
        >
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Title level={4} style={{ margin: 0 }}>
                {localStrings.Public.Messages || "Messages"}
              </Title>
              <div>
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<PlusOutlined />} 
                  onClick={() => setNewConversationModalVisible(true)}
                />
              </div>
            </div>
            <Search
              placeholder={localStrings.Public.Search || "Search"}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginTop: 16 }}
              prefix={<SearchOutlined />}
            />
          </div>
          <div style={{ height: "calc(100% - 130px)", overflow: "auto" }}>
            {conversationsLoading ? (
              <div style={{ padding: "16px" }}>
                <Skeleton avatar paragraph={{ rows: 1 }} active />
                <Skeleton avatar paragraph={{ rows: 1 }} active />
                <Skeleton avatar paragraph={{ rows: 1 }} active />
              </div>
            ) : (
              <>
                {filteredConversations.length === 0 ? (
                  <Empty 
                    description={
                      searchText 
                        ? (localStrings.Messages.NoConversations) 
                        : (localStrings.Messages.NoConversations)
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: "40px 0" }}
                  >
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => setNewConversationModalVisible(true)}
                    >
                      {localStrings.Messages.StartConversation || "Start a conversation"}
                    </Button>
                  </Empty>
                ) : (
                  <List
                    dataSource={filteredConversations}
                    renderItem={(item) => {
                      // Get conversation messages from WebSocket context
                      const conversationMessages = getMessagesForConversation(item.id || '');
                      
                      // Filter out date separator messages (if any)
                      const actualMessages = conversationMessages.filter(msg => !msg.isDateSeparator);
                      
                      // Get the most recent message (last element in time-sorted array)
                      const lastMessage = actualMessages.length > 0 
                        ? actualMessages.sort((a, b) => 
                            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
                          )[0]
                        : null;
                      
                      // Format message preview (truncate if needed)
                      const messagePreview = lastMessage?.content 
                        ? (lastMessage.content.length > 50 ? lastMessage.content.substring(0, 47) + '...' : lastMessage.content)
                        : (localStrings.Messages?.StartConversation || "Start chatting");
                      
                      // Format sender name
                      const senderName = lastMessage?.user_id === user?.id 
                        ? (localStrings.Messages?.You || "You") 
                        : lastMessage?.user 
                          ? `${lastMessage.user.family_name || ''} ${lastMessage.user.name || ''}`.trim()
                          : '';
                      
                      // Display message with sender name
                      const messageDisplay = lastMessage 
                        ? (senderName ? `${senderName}: ${messagePreview}` : messagePreview)
                        : messagePreview;
                      
                      // Format time of last message
                      const lastMessageTime = lastMessage?.created_at
                        ? formatMessageTime(lastMessage.created_at)
                        : '';
                        
                      // Check if this conversation has unread messages
                      // We consider a conversation unread if it's not the current active conversation
                      // and has recent messages that the user hasn't seen yet
                      const hasUnreadMessages = currentConversation?.id !== item.id && 
                        unreadMessages[item.id || ''] > 0;
                        
                      // Check if this is a 1-on-1 conversation
                      const isOneOnOneChat = item.name?.includes(" & ") || 
                                           (actualMessages.some(msg => msg.user_id !== user?.id) && 
                                            new Set(actualMessages.map(msg => msg.user_id)).size <= 2);
                      
                      // Find the other user in 1-on-1 chats to get their avatar
                      const otherUser = isOneOnOneChat && actualMessages.length > 0
                        ? actualMessages.find(msg => msg.user_id !== user?.id)?.user 
                        : null;
                      
                      // Use friend's avatar for 1-on-1 chats, or conversation image for group chats
                      const avatarUrl = isOneOnOneChat && otherUser?.avatar_url 
                        ? otherUser.avatar_url 
                        : item.image;
                      
                      // Get the initial letter for avatar fallback
                      const avatarInitial = isOneOnOneChat && otherUser?.name 
                        ? otherUser.name.charAt(0).toUpperCase() 
                        : item.name?.charAt(0).toUpperCase();
                        
                      return (
                        <List.Item 
                          onClick={() => handleSelectConversation(item)}
                          style={{ 
                            cursor: "pointer", 
                            padding: "12px 16px",
                            background: currentConversation?.id === item.id ? lightGray : "transparent",
                            transition: "background 0.3s",
                            // Add subtle highlight for unread conversations
                            borderLeft: hasUnreadMessages ? `3px solid ${brandPrimary}` : "none"
                          }}
                          key={item.id}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar 
                                src={avatarUrl} 
                                size={48}
                                style={{ 
                                  backgroundColor: !avatarUrl ? brandPrimary : undefined 
                                }}
                              >
                                {!avatarUrl && avatarInitial}
                              </Avatar>
                            }
                            title={<Text strong>{item.name}</Text>}
                            description={
                              <Text 
                                type="secondary" 
                                ellipsis 
                                style={{ 
                                  maxWidth: '100%',
                                  fontWeight: hasUnreadMessages ? 'bold' : 'normal'
                                }}
                              >
                                {messageDisplay}
                              </Text>
                            }
                          />
                          {lastMessage && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {lastMessageTime}
                              </Text>
                              {hasUnreadMessages && (
                                <Badge 
                                  count={unreadMessages[item.id || '']} 
                                  size="small" 
                                  style={{ marginTop: 4 }}
                                />
                              )}
                            </div>
                          )}
                        </List.Item>
                      );
                    }}
                  />
                )}
              </>
            )}
          </div>
        </Sider>
      )}

      {/* Chat Area */}
      {(!showConversation || !isMobile) && (
        <Layout style={{ 
          height: "100%", 
          background: backgroundColor,
          display: isMobile ? (showConversation ? "none" : "flex") : "flex"
        }}>
          {/* Chat Header */}
          <Header style={{ 
            background: backgroundColor, 
            padding: "0 16px", 
            height: "64px", 
            lineHeight: "64px",
            borderBottom: `1px solid ${lightGray}`,
            display: "flex",
            alignItems: "center"
          }}>
            {isMobile && (
              <Button 
                icon={<ArrowLeftOutlined />} 
                type="text" 
                onClick={handleBackToConversations}
                style={{ marginRight: 8 }}
              />
            )}
            {currentConversation ? (
              <>
                {/* For the header, we also want to show the friend's avatar for 1-on-1 chats */}
                {(() => {
                  // Get conversation messages
                  const conversationMessages = getMessagesForConversation(currentConversation.id || '');
                  const actualMessages = conversationMessages.filter(msg => !msg.isDateSeparator);
                  
                  // Check if this is a 1-on-1 conversation
                  const isOneOnOneChat = currentConversation.name?.includes(" & ") || 
                    (actualMessages.some(msg => msg.user_id !== user?.id) && 
                    new Set(actualMessages.map(msg => msg.user_id)).size <= 2);
                  
                  // Find the other user in 1-on-1 chats to get their avatar
                  const otherUser = isOneOnOneChat && actualMessages.length > 0
                    ? actualMessages.find(msg => msg.user_id !== user?.id)?.user 
                    : null;
                  
                  // Use friend's avatar for 1-on-1 chats
                  const avatarUrl = isOneOnOneChat && otherUser?.avatar_url 
                    ? otherUser.avatar_url 
                    : currentConversation.image;
                  
                  // Get the initial letter for avatar fallback
                  const avatarInitial = isOneOnOneChat && otherUser?.name 
                    ? otherUser.name.charAt(0).toUpperCase() 
                    : currentConversation.name?.charAt(0).toUpperCase();
                  
                  return (
                    <Avatar 
                      src={avatarUrl} 
                      size={40}
                      style={{ 
                        backgroundColor: !avatarUrl ? brandPrimary : undefined 
                      }}
                    >
                      {!avatarUrl && avatarInitial}
                    </Avatar>
                  );
                })()}
                <div style={{ marginLeft: 12 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {currentConversation.name}
                  </Text>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                  <Button 
                    type="text" 
                    icon={<EllipsisOutlined style={{ fontSize: 20 }} />} 
                  />
                </div>
              </>
            ) : (
              <div style={{ width: "100%", textAlign: "center" }}>
                <Text type="secondary">{localStrings.Messages.SelectConversation || "Select a conversation"}</Text>
              </div>
            )}
          </Header>

          {/* Messages Container */}
          <Content 
            style={{ 
              padding: "16px", 
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              height: "calc(100% - 128px)",
              position: "relative"
            }}
            ref={messageListRef}
            onScroll={handleScroll}
          >
            {currentConversation ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Loading indicator for initial load */}
                {messagesLoading && messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Spin size="large" />
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Load More Button - only show when we have messages and not at the end */}
                    {messages.length > 0 && !isMessagesEnd && (
                      <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <Button 
                          onClick={loadMoreMessages} 
                          loading={messagesLoading}
                          disabled={messagesLoading}
                        >
                          {localStrings.Public.LoadMore || "Load more"}
                        </Button>
                      </div>
                    )}
                    
                    {/* Loading indicator when fetching more messages */}
                    {messagesLoading && messages.length > 0 && (
                      <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <Spin size="small" />
                      </div>
                    )}

                    {/* Message content area */}
                    <div style={{ flex: 1 }}>
                      {messages.length > 0 ? (
                        <>
                          {/* Network indicator */}
                          <div style={{
                            position: "absolute",
                            top: 0,
                            right: 16,
                            padding: "4px 8px",
                            borderRadius: "0 0 4px 4px",
                            backgroundColor: navigator.onLine ? "#4CAF50" : "#F44336",
                            color: "white",
                            fontSize: 12,
                            opacity: 0.8,
                            zIndex: 1
                          }}>
                            {navigator.onLine ? "Online" : "Offline"}
                          </div>
                          
                          {/* Message list */}
                          {messages.map((msg: MessageResponseModel) => (
                            msg.isDateSeparator ? (
                              <DateSeparator 
                                key={msg.id} 
                                date={msg.content || ""}
                              />
                            ) : (
                              <MessageItem 
                                key={msg.id || `temp-${msg.created_at}`} 
                                message={msg} 
                                onDelete={deleteMessage}
                              />
                            )
                          ))}
                        </>
                      ) : initialMessagesLoaded ? (
                        <Empty
                          description={localStrings.Messages.NoMessages || "No messages yet"}
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ marginTop: 40 }}
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Text type="secondary">{localStrings.Messages.SelectConversationToChat || "Select a conversation to start chatting"}</Text>
              </div>
            )}
          </Content>

          {/* Message Input */}
          <div style={{ 
            padding: "12px 16px", 
            borderTop: `1px solid ${lightGray}`,
            background: backgroundColor,
            display: "flex",
            alignItems: "center"
          }}>
            {currentConversation && (
              <>
                <Popover
                  content={
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      searchPlaceholder="Tìm emoji..."
                      width={300}
                      height={400}
                      theme={Theme.LIGHT}
                      lazyLoadEmojis={true}
                    />
                  }
                  trigger="click"
                  open={emojiPickerVisible}
                  onOpenChange={setEmojiPickerVisible}
                  placement="topRight"
                >
                  <Button
                    type="text"
                    icon={<SmileOutlined style={{ fontSize: "20px", color: "#666" }} />}
                    style={{ marginRight: 8 }}
                  />
                </Popover>
                
                <Input
                  placeholder={localStrings.Messages?.TypeMessage || "Type a message..."}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ 
                    borderRadius: 20,
                    padding: "8px 12px",
                    flex: 1
                  }}
                  disabled={!isWebSocketConnected}
                />
                
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  style={{ marginLeft: 8 }}
                  disabled={!messageText.trim() || !isWebSocketConnected}
                />
              </>
            )}
          </div>
        </Layout>
      )}

      {/* New Conversation Modal */}
      <NewConversationModal 
        visible={newConversationModalVisible}
        onCancel={() => setNewConversationModalVisible(false)}
        onCreateConversation={createConversation}
      />
    </Layout>
  );
};

export default MessagesFeature;