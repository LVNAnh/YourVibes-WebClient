"use client";

import { useMessagesViewModel } from '../viewModel/MessagesViewModel';
import { defaultMessagesRepo } from '@/api/features/messages/MessagesRepo';
import { ConversationResponseModel } from '@/api/features/messages/models/ConversationModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { useAuth } from '@/context/auth/useAuth';
import useColor from '@/hooks/useColor';
import { EllipsisOutlined, DeleteOutlined, InboxOutlined, SendOutlined, SearchOutlined, ArrowLeftOutlined, PlusOutlined, SmileOutlined } from '@ant-design/icons';
import { Empty, Layout, Skeleton, Typography, Popover, Badge, Menu, Dropdown, Popconfirm, Input, Button, Upload, Modal, Form, List, Avatar, Spin, message, Checkbox } from 'antd';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

interface AddMemberModalProps {
  visible: boolean;
  onCancel: () => void;
  onAddMembers: (userIds: string[]) => Promise<any>;
  conversationId: string | undefined;
  existingMemberIds: string[];
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ 
  visible, 
  onCancel, 
  onAddMembers,
  conversationId,
  existingMemberIds
}) => {
  const { user, localStrings } = useAuth();
  const { brandPrimary } = useColor();
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (visible && user?.id) {
      fetchFriends();
    }
  }, [visible, user?.id]);

  useEffect(() => {
    if (visible) {
      setSelectedFriends([]);
    }
  }, [visible]);

  const fetchFriends = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await defaultProfileRepo.getListFriends({
        user_id: user.id,
        limit: 50,
        page: 1
      });
      
      if (response.data) {
        const availableFriends = (response.data as FriendResponseModel[])
          .filter(friend => !existingMemberIds.includes(friend.id || ''));
        setFriends(availableFriends);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      message.error(localStrings.Messages.ErrorFetchingFriends);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(prev => prev.filter(id => id !== friendId));
    } else {
      setSelectedFriends(prev => [...prev, friendId]);
    }
  };

  const handleAddMembers = async () => {
    if (!conversationId) {
      message.error(localStrings.Public.Error);
      return;
    }
    
    if (selectedFriends.length === 0) {
      message.warning(localStrings.Messages?.SelectAtLeastOneFriend);
      return;
    }
    
    setAdding(true);
    
    try {
      await onAddMembers(selectedFriends);
      message.success(localStrings.Messages.MembersAdded);
      onCancel();
    } catch (error) {
      console.error("Error adding members:", error);
      message.error(localStrings.Public.Error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={localStrings.Messages.AddMembers}
      onCancel={onCancel}
      okText={localStrings.Messages.Add}
      cancelText={localStrings.Public.Cancel}
      onOk={handleAddMembers}
      confirmLoading={adding}
      okButtonProps={{ disabled: selectedFriends.length === 0 }}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          {localStrings.Messages.SelectFriendsToAdd}
        </label>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <List
            style={{ 
              maxHeight: 300, 
              overflow: "auto", 
              border: "1px solid #d9d9d9", 
              borderRadius: 4,
              padding: "8px 0"
            }}
            dataSource={friends}
            renderItem={friend => (
              <List.Item 
                key={friend.id}
                onClick={() => toggleFriendSelection(friend.id!)}
                style={{ 
                  cursor: "pointer", 
                  padding: "8px 16px",
                  background: selectedFriends.includes(friend.id!) ? "rgba(0, 0, 0, 0.05)" : "transparent"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <Checkbox 
                    checked={selectedFriends.includes(friend.id!)}
                    onChange={() => toggleFriendSelection(friend.id!)}
                  />
                  <Avatar 
                    src={friend.avatar_url} 
                    style={{ 
                      marginLeft: 8,
                      backgroundColor: !friend.avatar_url ? brandPrimary : undefined 
                    }}
                  >
                    {!friend.avatar_url && (friend.name?.charAt(0) || "").toUpperCase()}
                  </Avatar>
                  <span style={{ marginLeft: 12 }}>
                    {`${friend.family_name || ''} ${friend.name || ''}`}
                  </span>
                </div>
              </List.Item>
            )}
            locale={{ emptyText: localStrings.Messages.NoFriendsToAdd }}
          />
        )}
      </div>
    </Modal>
  );
};

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
    return (
      <div 
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "16px 0",
          position: "relative",
          width: "100%"
        }}
      >
        <div 
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            position: "absolute",
            zIndex: 1
          }}
        />
        <div 
          style={{
            backgroundColor: "#f0f2f5",
            padding: "4px 12px",
            borderRadius: "16px",
            fontSize: "12px",
            color: "#65676B",
            position: "relative",
            zIndex: 2
          }}
        >
          {date}
        </div>
      </div>
    );
};

const { Dragger } = Upload;

interface EditConversationModalProps {
  visible: boolean;
  onCancel: () => void;
  onUpdateConversation: (name: string, image?: File | string) => Promise<any>;
  currentConversation: ConversationResponseModel | null;
}

const EditConversationModal: React.FC<EditConversationModalProps> = ({ 
  visible, 
  onCancel, 
  onUpdateConversation,
  currentConversation
}) => {
  const { localStrings } = useAuth();
  const { brandPrimary } = useColor();
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  const [conversationImage, setConversationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentConversation) {
      form.setFieldsValue({
        name: currentConversation.name
      });
      
      if (currentConversation.image) {
        setImagePreview(currentConversation.image);
      } else {
        setImagePreview(null);
      }
    }
  }, [visible, currentConversation, form]);

  const handleImageUpload = (info: any) => {
    const file = info.file;
    
    if (!file) {
      console.error("Không tìm thấy file:", info);
      return false;
    }
    
    const isImage = file.type.startsWith('image/');
    const isLt5M = file.size / 1024 / 1024 < 5;
    
    if (!isImage) {
      message.error(localStrings.Messages.OnlyImageFiles);
      return false;
    }
    
    if (!isLt5M) {
      message.error(localStrings.Messages.ImageMustSmallerThan5M);
      return false;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setImagePreview(previewUrl);
    };
    reader.readAsDataURL(file);
    
    setConversationImage(file);
    return false; 
  };

  const removeImage = () => {
    setConversationImage(null);
    setImagePreview(null);
  };

  const handleUpdateConversation = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setUpdating(true);
      
      let imageToSend: File | string | undefined = undefined;
      
      if (conversationImage) {
        imageToSend = conversationImage;
      } else if (imagePreview && (!currentConversation?.image || imagePreview !== currentConversation.image)) {
        imageToSend = imagePreview;
      }
      
      await onUpdateConversation(values.name, imageToSend);
      
      form.resetFields();
      setConversationImage(null);
      setImagePreview(null);
      
      onCancel();
    } catch (error) {
      console.error("Error updating conversation:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={localStrings.Messages.EditConversation}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {localStrings.Public.Cancel}
        </Button>,
        <Button 
          key="update" 
          type="primary" 
          onClick={handleUpdateConversation} 
          loading={updating}
        >
          {localStrings.Messages.Update}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="name" 
          label={localStrings.Messages.ConversationName}
          rules={[{ required: true, message: localStrings.Messages.ConversationNameRequired}]}
        >
          <Input placeholder={localStrings.Messages.GroupName} />
        </Form.Item>
        
        {/* Image Upload Section */}
        <Form.Item 
          name="image" 
          label={localStrings.Messages?.ConversationImage}
        >
          <Dragger
            name="avatar"
            multiple={false}
            showUploadList={false}
            beforeUpload={() => false}
            onChange={(info) => {
              handleImageUpload(info);
            }}
            accept="image/*"
          >
            {imagePreview ? (
              <div style={{ 
                position: 'relative',
                width: '100%',
                height: '200px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={imagePreview} 
                  alt="Conversation" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    objectFit: 'contain' 
                  }} 
                />
                <Button 
                  type="text" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  style={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {localStrings.Messages.Remove}
                </Button>
              </div>
            ) : (
              <div>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {localStrings.Messages?.ClickOrDragImageToUpload}
                </p>
                <p className="ant-upload-hint">
                  {localStrings.Messages?.SupportSingleImageUpload}
                </p>
              </div>
            )}
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface MessageItemProps {
  message: MessageResponseModel;
  onDelete: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onDelete }) => {
  const { user, localStrings } = useAuth();
  const { brandPrimary, lightGray } = useColor();
  const [hovering, setHovering] = useState(false);
  
  const isMyMessage = message.user_id === user?.id;
  
  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleDelete = () => {
    if (message.id) {
      onDelete(message.id);
    }
  };
  
  const menuItems = [
    {
      key: "delete",
      label: (
        <Popconfirm
          title={localStrings.Messages.ConfirmDeleteMessage}
          onConfirm={handleDelete}
          okText={localStrings.Public.Yes}
          cancelText={localStrings.Public.No}
        >
          <span>
            <DeleteOutlined style={{ marginRight: 8 }} />
            {localStrings.Public.Delete}
          </span>
        </Popconfirm>
      ),
      style: { padding: "8px 16px" }
    }
  ];
  
  return (
    <div 
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: "flex",
        justifyContent: isMyMessage ? "flex-end" : "flex-start",
        marginBottom: 16,
        position: "relative"
      }}
    >
      {!isMyMessage && (
        <Avatar 
          src={message.user?.avatar_url} 
          size={32}
          style={{ marginRight: 8, alignSelf: "flex-end" }}
        >
          {!message.user?.avatar_url && message.user?.name?.charAt(0)}
        </Avatar>
      )}
      <div 
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          borderRadius: 12,
          background: isMyMessage ? brandPrimary : lightGray,
          color: isMyMessage ? "#fff" : "inherit",
          position: "relative",
          border: message.fromServer ? "none" : "1px solid rgba(0,0,0,0.1)"
        }}
      >
        {!isMyMessage && (
          <div style={{ fontSize: 12, marginBottom: 2, fontWeight: "bold", color: isMyMessage ? "#fff" : "inherit" }}>
            {`${message.user?.family_name || ''} ${message.user?.name || ''}`}
          </div>
        )}
        
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: isMyMessage ? "#fff" : "inherit" }}>
          {message.content}
        </div>
        
        <div style={{ fontSize: 10, textAlign: "right", marginTop: 4, opacity: 0.7 }}>
          {message.isTemporary ? (
            <span style={{ color: isMyMessage ? "rgba(255, 255, 255, 0.7)" : "inherit" }}>
            </span>
          ) : (
            <span style={{ 
              color: isMyMessage ? "rgba(255, 255, 255, 0.7)" : "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end"
            }}>
              {formatMessageTime(message.created_at || '')}
            </span>
          )}
        </div>
      </div>
      
      {/* Message Options Dropdown (only for the user's own messages) */}
      {isMyMessage && hovering && !message.isTemporary && (
        <Dropdown 
          menu={{ items: menuItems }} 
          trigger={["click"]}
          placement="bottomRight"
        >
          <div
            style={{
              position: "absolute",
              right: "calc(100% - 8px)",
              top: 0,
              cursor: "pointer",
              padding: 4,
              borderRadius: "50%",
              background: "#f0f0f0",
              zIndex: 1
            }}
          >
            <EllipsisOutlined style={{ fontSize: 16 }} />
          </div>
        </Dropdown>
      )}
    </div>
  );
};

interface NewConversationModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreateConversation: (name: string, image?: File | string, userIds?: string[]) => Promise<any>;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ 
  visible, 
  onCancel, 
  onCreateConversation 
}) => {
  const { user, localStrings } = useAuth();
  const { brandPrimary } = useColor();
  const [form] = Form.useForm();
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [conversationImage, setConversationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user?.id) {
      fetchFriends();
    }
  }, [visible, user?.id]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedFriends([]);
      setConversationImage(null);
      setImagePreview(null);
    }
  }, [visible]);

  const fetchFriends = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await defaultProfileRepo.getListFriends({
        user_id: user.id,
        limit: 50,
        page: 1
      });
      
      if (response.data) {
        setFriends(response.data as FriendResponseModel[]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      message.error(localStrings.Messages.ErrorFetchingFriends);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (info: any) => {
    const file = info.file;
    
    if (!file) {
      console.error("Không tìm thấy file:", info);
      return false;
    }
    
    const isImage = file.type.startsWith('image/');
    const isLt5M = file.size / 1024 / 1024 < 5;
    
    if (!isImage) {
      message.error(localStrings.Messages.OnlyImageFiles);
      return false;
    }
    
    if (!isLt5M) {
      message.error(localStrings.Messages.ImageMustSmallerThan5M);
      return false;
    }
    
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setImagePreview(previewUrl);
    };
    reader.readAsDataURL(file);
    
    setConversationImage(file);
    return false; 
  };

  const removeImage = () => {
    setConversationImage(null);
    setImagePreview(null);
  };

  const handleCreateConversation = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      if (selectedFriends.length === 0) {
        message.warning(localStrings.Messages.SelectAtLeastOneFriend);
        return;
      }
      
      setCreating(true);
      
      const selectedUsers = selectedFriends.map(id => 
        friends.find(friend => friend.id === id)
      ).filter(Boolean) as FriendResponseModel[];
      
      let conversationName = values.name;
      if (!conversationName && selectedUsers.length > 0) {
        conversationName = selectedUsers
          .map(user => `${user.family_name || ''} ${user.name || ''}`.trim())
          .join(", ");
      }
      
      const userIdsToAdd = [
        ...(user?.id ? [user.id] : []), 
        ...selectedFriends
      ];
      
      const newConversation = await onCreateConversation(
        conversationName, 
        conversationImage || undefined, 
        userIdsToAdd
      );
      
      if (newConversation && newConversation.id) {
        form.resetFields();
        setSelectedFriends([]);
        setConversationImage(null);
        setImagePreview(null);
        
        onCancel();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setCreating(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(prev => prev.filter(id => id !== friendId));
    } else {
      setSelectedFriends(prev => [...prev, friendId]);
    }
  };

  return (
    <Modal
      open={visible}
      title={localStrings.Messages.NewConversation}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {localStrings.Public.Cancel}
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          onClick={handleCreateConversation} 
          loading={creating}
          disabled={selectedFriends.length === 0}
        >
          {localStrings.Messages.Create}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="name" 
          label={localStrings.Messages.ConversationName}
        >
          <Input placeholder={localStrings.Messages.OptionalGroupName} />
        </Form.Item>
        
        {/* Image Upload Section */}
        <Form.Item 
          name="image" 
          label={localStrings.Messages.ConversationImage}
        >
          <Dragger
            name="avatar"
            multiple={false}
            showUploadList={false}
            beforeUpload={() => false} 
            onChange={(info) => {
              handleImageUpload(info);
            }}
            accept="image/*"
          >
            {imagePreview ? (
              <div style={{ 
                position: 'relative',
                width: '100%',
                height: '200px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={imagePreview} 
                  alt="Conversation" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    objectFit: 'contain' 
                  }} 
                />
                <Button 
                  type="text" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  style={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {localStrings.Messages.Remove}
                </Button>
              </div>
            ) : (
              <div>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {localStrings.Messages.ClickOrDragImageToUpload}
                </p>
                <p className="ant-upload-hint">
                  {localStrings.Messages.SupportSingleImageUpload}
                </p>
              </div>
            )}
          </Dragger>
        </Form.Item>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            {localStrings.Public.Messages}
          </label>
          
          {loading ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : (
            <List
              style={{ 
                maxHeight: 300, 
                overflow: "auto", 
                border: "1px solid #d9d9d9", 
                borderRadius: 4,
                padding: "8px 0"
              }}
              dataSource={friends}
              renderItem={friend => (
                <List.Item 
                  key={friend.id}
                  onClick={() => toggleFriendSelection(friend.id!)}
                  style={{ 
                    cursor: "pointer", 
                    padding: "8px 16px",
                    background: selectedFriends.includes(friend.id!) ? "rgba(0, 0, 0, 0.05)" : "transparent"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <Checkbox 
                      checked={selectedFriends.includes(friend.id!)}
                      onChange={() => toggleFriendSelection(friend.id!)}
                    />
                    <Avatar 
                      src={friend.avatar_url} 
                      style={{ 
                        marginLeft: 8,
                        backgroundColor: !friend.avatar_url ? brandPrimary : undefined 
                      }}
                    >
                      {!friend.avatar_url && (friend.name?.charAt(0) || "").toUpperCase()}
                    </Avatar>
                    <span style={{ marginLeft: 12 }}>
                      {`${friend.family_name || ''} ${friend.name || ''}`}
                    </span>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: localStrings.Messages.NoFriendsFound}}
            />
          )}
        </div>
      </Form>
    </Modal>
  );
};

const { Header, Content, Sider } = Layout;
const { Search } = Input;
const { Text, Title } = Typography;
const { SubMenu, Item } = Menu;

const MessagesFeature: React.FC = () => {
  const { user, localStrings } = useAuth();
  const searchParams = useSearchParams(); // Thêm để lấy query params
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const {
    deleteMessage,
    createConversation,
    updateConversation,
    deleteConversation,
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
    addConversationMembers,
    leaveConversation,
  } = useMessagesViewModel();

  const [isMobile, setIsMobile] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const { backgroundColor, lightGray, brandPrimary } = useColor();
  const [editConversationModalVisible, setEditConversationModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);

  // Lấy conversation_id từ query params
  const conversationIdFromUrl = searchParams.get("conversation_id");

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

  useEffect(() => {
    if (isMobile && currentConversation) {
      setShowConversation(false);
    }
  }, [currentConversation, isMobile]);
  
  const handleSelectConversation = useCallback((conversation: ConversationResponseModel) => {
    if (currentConversation?.id === conversation.id) {
      return;
    }

    setCurrentConversation(conversation);

    setTimeout(() => {
      if (conversation.id) {
        fetchMessages(conversation.id);
        markConversationAsRead(conversation.id);
      }
    }, 200);
  }, [currentConversation?.id, fetchMessages, setCurrentConversation, markConversationAsRead]);
  // Xử lý khi có conversation_id từ URL
  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const selectedConversation = conversations.find(conv => conv.id === conversationIdFromUrl);
      if (selectedConversation && selectedConversation.id !== currentConversation?.id) {
        handleSelectConversation(selectedConversation);
      }
    }
  }, [conversationIdFromUrl, conversations, currentConversation?.id, handleSelectConversation]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleSendMessage = () => {
    if (messageText.trim() && currentConversation && messageText.length <= 500) {
      sendMessage();
    } else if (messageText.length > 500) {
      message.error(localStrings.Messages.MessageTooLong);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };



  const handleBackToConversations = () => {
    setShowConversation(true);
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const [newConversationModalVisible, setNewConversationModalVisible] = useState(false);

  const handleUpdateConversation = async (name: string, image?: File | string) => {
    if (currentConversation?.id) {
      try {
        await updateConversation(currentConversation.id, name, image as string);
        message.success(localStrings.Messages.ConversationUpdated);
        setEditConversationModalVisible(false);
      } catch (error) {
        message.error(localStrings.Public.Error);
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    Modal.confirm({
      title: localStrings.Messages.ConfirmDeleteConversation,
      content: localStrings.Messages.ConfirmDeleteConversation,
      okText: localStrings.Public.Yes,
      cancelText: localStrings.Public.No,
      onOk: async () => {
        try {
          await deleteConversation(conversationId);
          message.success(localStrings.Messages.ConversationDeleted);
        } catch (error) {
          message.error(localStrings.Public.Error);
        }
      }
    });
  };

  const fetchExistingMembers = async (conversationId: string) => {
    try {
      const response = await defaultMessagesRepo.getConversationDetailByUserID({
        conversation_id: conversationId
      });

      if (response.data) {
        const members = Array.isArray(response.data) ? response.data : [response.data];
        const memberIds = members.map(member => member.user_id).filter(Boolean) as string[];
        setExistingMemberIds(memberIds);
      }
    } catch (error) {
      console.error("Error fetching conversation members:", error);
      setExistingMemberIds([]);
    }
  };

  const handleOpenAddMemberModal = async () => {
    if (currentConversation?.id) {
      await fetchExistingMembers(currentConversation.id);
      setAddMemberModalVisible(true);
    }
  };

  const handleAddMembers = async (userIds: string[]) => {
    if (currentConversation?.id) {
      await addConversationMembers(currentConversation.id, userIds);
    }
  };

  const handleLeaveConversation = () => {
    if (!currentConversation?.id) return;

    Modal.confirm({
      title: localStrings.Messages.LeaveConversation,
      content: localStrings.Messages.ConfirmLeaveConversation,
      okText: localStrings.Public.Yes,
      cancelText: localStrings.Public.No,
      onOk: async () => {
        try {
          if (currentConversation.id) {
            await leaveConversation(currentConversation.id);
            message.success(localStrings.Messages.LeftConversation);
          }
        } catch (error) {
          message.error(localStrings.Public.Error);
        }
      }
    });
  };

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
                {localStrings.Public.Messages}
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
              placeholder={localStrings.Public.Search}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginTop: 16 }}
              prefix={<SearchOutlined />}
            />
          </div>
          <div style={{ height: "calc(100% - 130px)", overflow: "auto" }}>
            {conversationsLoading ? (
              <div style={{ padding: "0 16px" }}>
                {/* Header skeleton */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  paddingTop: 16
                }}>
                  <Skeleton.Button active style={{ width: 100, height: 24 }} />
                  <Skeleton.Avatar active shape="circle" size="small" />
                </div>

                {/* Search box skeleton */}
                <div style={{ marginBottom: 16 }}>
                  <Skeleton.Input active style={{ width: '100%', height: 32 }} size="small" />
                </div>

                {/* Conversations list skeleton */}
                {Array(6).fill(null).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      padding: "12px 0",
                      borderBottom: "1px solid #f0f0f0",
                      alignItems: "center"
                    }}
                  >
                    <Skeleton.Avatar active size="large" style={{ flexShrink: 0 }} />
                    <div style={{ marginLeft: 12, flex: 1 }}>
                      <Skeleton.Input active style={{ width: '70%', height: 16 }} size="small" />
                      <div style={{ marginTop: 6 }}>
                        <Skeleton.Input active style={{ width: '90%', height: 14 }} size="small" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Skeleton.Input active style={{ width: 35, height: 12 }} size="small" />
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#f0f0f0',
                        marginTop: 8
                      }} />
                    </div>
                  </div>
                ))}
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
                      {localStrings.Messages.StartConversation}
                    </Button>
                  </Empty>
                ) : (
                  <List
                    dataSource={filteredConversations}
                    renderItem={(item) => {
                      const conversationMessages = getMessagesForConversation(item.id || '');

                      const actualMessages = conversationMessages.filter(msg => !msg.isDateSeparator);

                      const lastMessage = actualMessages.length > 0
                        ? actualMessages.sort((a, b) =>
                          new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
                        )[0]
                        : null;

                      const messagePreview = lastMessage?.content
                        ? (lastMessage.content.length > 50 ? lastMessage.content.substring(0, 47) + '...' : lastMessage.content)
                        : (localStrings.Messages.StartConversation);
                      
                      const senderName = lastMessage?.user_id === user?.id 
                        ? (localStrings.Messages.You) 
                        : lastMessage?.user 
                          ? `${lastMessage.user.family_name || ''} ${lastMessage.user.name || ''}`.trim()
                          : '';

                      const messageDisplay = lastMessage
                        ? (senderName ? `${senderName}: ${messagePreview}` : messagePreview)
                        : messagePreview;

                      const lastMessageTime = lastMessage?.created_at
                        ? formatMessageTime(lastMessage.created_at)
                        : '';

                      const hasUnreadMessages = currentConversation?.id !== item.id &&
                        unreadMessages[item.id || ''] > 0;

                      const isOneOnOneChat = item.name?.includes(" & ") ||
                        (actualMessages.some(msg => msg.user_id !== user?.id) &&
                          new Set(actualMessages.map(msg => msg.user_id)).size <= 2);

                      const otherUser = isOneOnOneChat && actualMessages.length > 0
                        ? actualMessages.find(msg => msg.user_id !== user?.id)?.user
                        : null;

                      let avatarUrl = item.image;

                      if (isOneOnOneChat && !item.image && otherUser?.avatar_url) {
                        avatarUrl = otherUser.avatar_url;
                      }

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
                  const conversationMessages = getMessagesForConversation(currentConversation.id || '');
                  const actualMessages = conversationMessages.filter(msg => !msg.isDateSeparator);

                  const isOneOnOneChat = currentConversation.name?.includes(" & ") ||
                    (actualMessages.some(msg => msg.user_id !== user?.id) &&
                      new Set(actualMessages.map(msg => msg.user_id)).size <= 2);

                  const otherUser = isOneOnOneChat && actualMessages.length > 0
                    ? actualMessages.find(msg => msg.user_id !== user?.id)?.user
                    : null;

                  let avatarUrl = currentConversation.image;

                  if (isOneOnOneChat && !currentConversation.image && otherUser?.avatar_url) {
                    avatarUrl = otherUser.avatar_url;
                  }

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
                <Dropdown
                  overlay={
                    <Menu>
                      <Item 
                        key="edit" 
                        onClick={() => setEditConversationModalVisible(true)}
                      >
                        {localStrings.Messages.EditConversation}
                      </Item>
                      <Item 
                        key="addMember" 
                        onClick={handleOpenAddMemberModal}
                      >
                        {localStrings.Messages.AddMembers}
                      </Item>
                      <Item 
                        key="delete" 
                        danger 
                        onClick={() => currentConversation?.id && handleDeleteConversation(currentConversation.id)}
                      >
                        {localStrings.Messages.DeleteConversation}
                      </Item>
                      {(currentConversation?.name && !currentConversation.name.includes(" & ")) && (
                        <Item 
                          key="leave" 
                          onClick={handleLeaveConversation}
                        >
                          {localStrings.Messages.LeaveConversation}
                        </Item>
                      )}
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button 
                    type="text" 
                    icon={<EllipsisOutlined style={{ fontSize: 20 }} />} 
                  />
                </Dropdown>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    {localStrings.Messages.SelectConversationToChat}
                  </Text>
                </div>
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
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header skeleton */}
                    <div style={{
                      height: 64,
                      borderBottom: '1px solid #f0f0f0',
                      padding: '0 16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Skeleton.Avatar active size="default" style={{ marginRight: 12 }} />
                      <Skeleton.Input active style={{ width: 180, height: 16 }} size="small" />
                      <div style={{ marginLeft: 'auto' }}>
                        <Skeleton.Button active style={{ width: 32, height: 32 }} shape="circle" />
                      </div>
                    </div>

                    {/* Message area skeleton */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end'
                    }}>
                      {/* Skeleton for a date separator */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '10px 0'
                      }}>
                        <Skeleton.Input active style={{ width: 80, height: 20 }} size="small" />
                      </div>

                      {/* Skeletons for messages */}
                      {/* Received message */}
                      <div style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-end' }}>
                        <Skeleton.Avatar active size="small" style={{ marginRight: 8 }} />
                        <div style={{ maxWidth: '60%' }}>
                          <div style={{
                            background: '#f5f5f5',
                            borderRadius: '12px',
                            padding: '10px'
                          }}>
                            <Skeleton.Input active style={{ width: 80, height: 14 }} size="small" />
                            <div style={{ marginTop: 4 }}>
                              <Skeleton.Input active style={{ width: 140, height: 14 }} size="small" />
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <Skeleton.Input active style={{ width: 180, height: 14 }} size="small" />
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              marginTop: 4
                            }}>
                              <Skeleton.Input active style={{ width: 40, height: 10 }} size="small" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sent message */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 16
                      }}>
                        <div style={{ maxWidth: '60%' }}>
                          <div style={{
                            background: '#e6f7ff',
                            borderRadius: '12px',
                            padding: '10px'
                          }}>
                            <Skeleton.Input active style={{ width: 160, height: 14 }} size="small" />
                            <div style={{ marginTop: 4 }}>
                              <Skeleton.Input active style={{ width: 120, height: 14 }} size="small" />
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              marginTop: 4
                            }}>
                              <Skeleton.Input active style={{ width: 40, height: 10 }} size="small" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Another received message */}
                      <div style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-end' }}>
                        <Skeleton.Avatar active size="small" style={{ marginRight: 8 }} />
                        <div style={{ maxWidth: '60%' }}>
                          <div style={{
                            background: '#f5f5f5',
                            borderRadius: '12px',
                            padding: '10px'
                          }}>
                            <Skeleton.Input active style={{ width: 200, height: 14 }} size="small" />
                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              marginTop: 4
                            }}>
                              <Skeleton.Input active style={{ width: 40, height: 10 }} size="small" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message input skeleton */}
                    <div style={{
                      borderTop: '1px solid #f0f0f0',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Skeleton.Button active style={{ width: 32, height: 32, marginRight: 8 }} shape="circle" />
                      <Skeleton.Input active style={{ flex: 1, height: 36 }} size="default" />
                      <Skeleton.Button active style={{ width: 32, height: 32, marginLeft: 8 }} shape="circle" />
                    </div>
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
                          {localStrings.Public.LoadMore}
                        </Button>
                      </div>
                    )}

                    {/* Loading indicator when fetching more messages */}
                    {messagesLoading && messages.length > 0 && (
                      <div style={{
                        textAlign: "center",
                        padding: "10px 0",
                        display: "flex",
                        justifyContent: "center"
                      }}>
                        <Spin size="small" />
                      </div>
                    )}

                    {/* Message content area */}
                    <div style={{ flex: 1 }}>
                      {messages.length > 0 ? (
                        <>
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
                          description={localStrings.Messages.NoMessages}
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ marginTop: 40 }}
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                  <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    {localStrings.Messages.SelectConversationToChat}
                  </Text>
                </div>
              </div>
            )}
          </Content>

          {/* Message Input */}
          <div style={{
            padding: "12px 16px",
            borderTop: `1px solid ${lightGray}`,
            background: backgroundColor,
            display: "flex",
            flexDirection: "column",
          }}>
            {currentConversation && (
              <>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
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
                    placeholder={localStrings.Messages.TypeMessage}
                    value={messageText}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setMessageText(newValue);
                      // Hiển thị thông báo khi vượt quá 500 ký tự
                      if (newValue.length > 500 && messageText.length <= 500) {
                        message.warning(localStrings.Messages.MessageTooLong);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    status={messageText.length > 500 ? "error" : ""}
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
                    disabled={!messageText.trim() || !isWebSocketConnected || messageText.length > 500}
                  />
                </div>

                {/* Character counter */}
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  fontSize: "12px",
                  marginTop: "4px",
                  color: messageText.length > 500 ? "#ff4d4f" : "rgba(0, 0, 0, 0.45)"
                }}>
                  {messageText.length}/500
                </div>
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

      {/* Edit Conversation Modal */}
      <EditConversationModal
        visible={editConversationModalVisible}
        onCancel={() => setEditConversationModalVisible(false)}
        onUpdateConversation={handleUpdateConversation}
        currentConversation={currentConversation}
      />

      <AddMemberModal
        visible={addMemberModalVisible}
        onCancel={() => setAddMemberModalVisible(false)}
        onAddMembers={handleAddMembers}
        conversationId={currentConversation?.id}
        existingMemberIds={existingMemberIds}
      />
    </Layout>
  );
};

export default MessagesFeature