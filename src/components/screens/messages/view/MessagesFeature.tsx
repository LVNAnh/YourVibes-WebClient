"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useMessagesViewModel } from "../viewModel/MessagesViewModel";
import { Avatar, Button, Empty, Input, Layout, List, Skeleton, Spin, Typography, message, Badge } from "antd";
import { SendOutlined, EllipsisOutlined, SearchOutlined, ArrowLeftOutlined, PlusOutlined, WifiOutlined, DisconnectOutlined } from "@ant-design/icons";
import useColor from "@/hooks/useColor";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import NewConversationModal from "./NewConversationModal";
import MessageItem from "./MessageItem";
import DateSeparator from "./DateSeparator";

const { Header, Content, Sider } = Layout;
const { Search } = Input;
const { Text, Title } = Typography;

const MessagesFeature: React.FC = () => {
  const { user, localStrings } = useAuth();
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
    fetchConversations,
    fetchMessages,
    isMessagesEnd,
    loadMoreMessages,
    isWebSocketConnected,
    messageListRef,
    handleScroll,
    getMessagesForConversation,
    initialMessagesLoaded,
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
      }
    }, 200);
  }, [currentConversation?.id, fetchMessages, setCurrentConversation]);

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
                      // Lấy tin nhắn cuối cùng của cuộc trò chuyện
                      const conversationMessages = getMessagesForConversation(item.id || '');
                      const lastMessage = conversationMessages.length > 0 
                        ? conversationMessages[conversationMessages.length - 1] 
                        : null;
                      
                      // Hiển thị tin nhắn cuối hoặc thông báo mặc định
                      const messagePreview = lastMessage?.content 
                        ? lastMessage.content
                        : (localStrings.Messages.StartConversation || "Start chatting");
                      
                      // Định dạng tên người gửi nếu có
                      const senderName = lastMessage?.user_id === user?.id 
                        ? (localStrings.Messages.You || "You") 
                        : lastMessage?.user 
                          ? `${lastMessage.user.family_name || ''} ${lastMessage.user.name || ''}`.trim()
                          : '';
                      
                      // Hiển thị tin nhắn cuối với tên người gửi
                      const messageDisplay = lastMessage 
                        ? (senderName ? `${senderName}: ${messagePreview}` : messagePreview)
                        : messagePreview;
                        
                      return (
                        <List.Item 
                          onClick={() => handleSelectConversation(item)}
                          style={{ 
                            cursor: "pointer", 
                            padding: "12px 16px",
                            background: currentConversation?.id === item.id ? lightGray : "transparent",
                            transition: "background 0.3s"
                          }}
                          key={item.id}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar 
                                src={item.image} 
                                size={48}
                                style={{ 
                                  backgroundColor: !item.image ? brandPrimary : undefined 
                                }}
                              >
                                {!item.image && item.name?.charAt(0).toUpperCase()}
                              </Avatar>
                            }
                            title={<Text strong>{item.name}</Text>}
                            description={
                              <Text type="secondary" ellipsis style={{ maxWidth: '100%' }}>
                                {messageDisplay}
                              </Text>
                            }
                          />
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
                <Avatar 
                  src={currentConversation.image} 
                  size={40}
                  style={{ 
                    backgroundColor: !currentConversation.image ? brandPrimary : undefined 
                  }}
                >
                  {!currentConversation.image && currentConversation.name?.charAt(0).toUpperCase()}
                </Avatar>
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
                <Input
                  placeholder={localStrings.Messages.TypeMessage || "Type a message..."}
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