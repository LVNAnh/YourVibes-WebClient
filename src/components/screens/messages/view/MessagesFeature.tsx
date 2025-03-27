"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useMessagesViewModel } from "../viewModel/MessagesViewModel";
import { Avatar, Button, Empty, Input, Layout, List, Skeleton, Spin, Typography, message } from "antd";
import { SendOutlined, EllipsisOutlined, SearchOutlined, ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import useColor from "@/hooks/useColor";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import NewConversationModal from "./NewConversationModal";
import MessageItem from "./MessageItem";

const { Header, Content, Sider } = Layout;
const { Search } = Input;
const { Text, Title } = Typography;

const MessagesFeature: React.FC = () => {
  const { user, localStrings } = useAuth();
  const {
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
  } = useMessagesViewModel();

  const messageListRef = useRef<HTMLDivElement>(null);
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Load initial conversations
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: ConversationResponseModel) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation.id!);
  };

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
              <Button 
                type="primary" 
                shape="circle" 
                icon={<PlusOutlined />} 
                onClick={() => setNewConversationModalVisible(true)}
              />
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
                        ? (localStrings.Public.NoConversationsFound || "No conversations found") 
                        : (localStrings.Public.NoConversations || "No conversations")
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: "40px 0" }}
                  >
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => setNewConversationModalVisible(true)}
                    >
                      {localStrings.Public.StartConversation || "Start a conversation"}
                    </Button>
                  </Empty>
                ) : (
                  <List
                    dataSource={filteredConversations}
                    renderItem={(item) => (
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
                            <Text type="secondary" ellipsis>
                              {/* Show last message preview here if available */}
                              {localStrings.Public.StartConversation || "Start chatting"}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
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
                <div style={{ marginLeft: "auto" }}>
                  <Button 
                    type="text" 
                    icon={<EllipsisOutlined style={{ fontSize: 20 }} />} 
                  />
                </div>
              </>
            ) : (
              <div style={{ width: "100%", textAlign: "center" }}>
                <Text type="secondary">{localStrings.Public.SelectConversation}</Text>
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
            }}
            ref={messageListRef}
          >
            {currentConversation ? (
              messagesLoading ? (
                <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Spin size="large" />
                </div>
              ) : (
                <>
                  {!isMessagesEnd && (
                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                      <Button onClick={loadMoreMessages}>
                        {localStrings.Public.LoadMore}
                      </Button>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    {messages.length > 0 ? (
                      messages.map((msg: MessageResponseModel) => (
                        <MessageItem 
                          key={msg.id} 
                          message={msg} 
                          onDelete={deleteMessage}
                        />
                      ))
                    ) : (
                      <Empty
                        description={localStrings.Public.NoMessages || "No messages yet"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginTop: 40 }}
                      />
                    )}
                  </div>
                </>
              )
            ) : (
              <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Text type="secondary">{localStrings.Public.SelectConversationToChat}</Text>
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
                  placeholder={localStrings.Public.TypeMessage}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ 
                    borderRadius: 20,
                    padding: "8px 12px",
                    flex: 1
                  }}
                />
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  style={{ marginLeft: 8 }}
                  disabled={!messageText.trim()}
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