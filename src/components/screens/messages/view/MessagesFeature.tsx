"use client";

import { useMessagesViewModel } from '../viewModel/MessagesViewModel';
import { defaultMessagesRepo } from '@/api/features/messages/MessagesRepo';
import { ConversationResponseModel } from '@/api/features/messages/models/ConversationModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { useAuth } from '@/context/auth/useAuth';
import useColor from '@/hooks/useColor';
import { EllipsisOutlined, DeleteOutlined, InboxOutlined, SendOutlined, SearchOutlined, ArrowLeftOutlined, PlusOutlined, SmileOutlined, VideoCameraOutlined, CloseOutlined } from '@ant-design/icons';
import { Empty, Layout, Skeleton, Typography, Popover, Badge, Menu, Dropdown, Popconfirm, Input, Button, Upload, Modal, Form, List, Avatar, Spin, message, Checkbox, Tabs } from 'antd';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useRef  } from 'react';
import io from 'socket.io-client';

interface AddMemberModalProps {
  visible: boolean;
  onCancel: () => void;
  onAddMembers: (userIds: string[]) => Promise<any>;
  conversationId: string | undefined;
  existingMemberIds: string[];
  existingMembers: FriendResponseModel[];
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ 
  visible, 
  onCancel, 
  onAddMembers,
  conversationId,
  existingMemberIds,
  existingMembers,
}) => {
  const { user, localStrings } = useAuth();
  const { brandPrimary } = useColor();
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("addMembers");

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

  const tabItems = [
    {
      key: 'addMembers',
      label: localStrings.Messages.AddMembers,
      children: (
        <div>
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
      ),
    },
    {
      key: 'currentMembers',
      label: localStrings.Messages.CurrentMembers,
      children: (
        <List
          style={{ 
            maxHeight: 300, 
            overflow: "auto", 
            border: "1px solid #d9d9d9", 
            borderRadius: 4,
            padding: "8px 0"
          }}
          dataSource={existingMembers}
          renderItem={member => (
            <List.Item 
              key={member.id}
              style={{ 
                padding: "8px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <Avatar 
                  src={member.avatar_url} 
                  style={{ 
                    marginLeft: 8,
                    backgroundColor: !member.avatar_url ? brandPrimary : undefined 
                  }}
                >
                  {!member.avatar_url && (member.name?.charAt(0) || "").toUpperCase()}
                </Avatar>
                <span style={{ marginLeft: 12 }}>
                  {`${member.family_name || ''} ${member.name || ''}`}
                  {member.id === user?.id ? ` (${localStrings.Messages.You})` : ''}
                </span>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: localStrings.Messages.NoMembersInConversation }}
        />
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      title={localStrings.Messages.ManageMembers}
      onCancel={onCancel}
      okText={localStrings.Messages.Add}
      cancelText={localStrings.Public.Cancel}
      onOk={handleAddMembers}
      confirmLoading={adding}
      okButtonProps={{ 
        disabled: selectedFriends.length === 0 || activeTab === "currentMembers"
      }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
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
  const [existingMembers, setExistingMembers] = useState<FriendResponseModel[]>([]);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    signalData: any;
    fromUser?: FriendResponseModel;
  } | null>(null);
  const socketRef = useRef<any>(null);
  const {
    fetchConversations,
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
    messageListRef,
    handleScroll,
    getMessagesForConversation,
    initialMessagesLoaded,
    markConversationAsRead,
    addConversationMembers,
    leaveConversation,
    unreadMessageCounts,
    resetUnreadCount,
  } = useMessagesViewModel();

  const [isMobile, setIsMobile] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const { backgroundColor, lightGray, brandPrimary } = useColor();
  const [editConversationModalVisible, setEditConversationModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);

  interface SocketCallPayload {
    from: string;
    signalData: any; // Hoặc có thể định nghĩa chi tiết hơn cho signalData
    callType: 'video' | 'audio';
  }
  
  interface SocketEndCallPayload {
    from: string;
    reason?: string;
  }

  // Lấy conversation_id từ query params
  const conversationIdFromUrl = searchParams.get("conversation_id");

  useEffect(() => {
    if (user?.id) {
      const socketUrl = process.env.NEXT_PUBLIC_VIDEO_CHAT_SERVER || 'http://localhost:5000';
      socketRef.current = io(socketUrl);
      
      // Đăng ký người dùng
      socketRef.current.emit('register', user.id);
      
      // Lắng nghe cuộc gọi đến
      socketRef.current.on('call-incoming', async ({ from, signalData, callType }: SocketCallPayload) => {
        if (callType === 'video') {
          // Tìm thông tin người gọi
          try {
            let fromUser: FriendResponseModel | undefined;
            
            if (conversations.length > 0) {
              // Tìm trong các tin nhắn hiện có
              for (const conv of conversations) {
                if (!conv.id) continue;
                
                const messages = getMessagesForConversation(conv.id);
                const fromMessage = messages.find(m => m.user_id === from && !m.isDateSeparator);
                
                if (fromMessage && fromMessage.user) {
                  fromUser = {
                    id: fromMessage.user.id,
                    name: fromMessage.user.name,
                    family_name: fromMessage.user.family_name,
                    avatar_url: fromMessage.user.avatar_url
                  } as FriendResponseModel;
                  break;
                }
              }
            }
            
            // Nếu không tìm thấy, có thể gọi API để lấy thông tin user (nếu cần)
            
            setIncomingCall({
              from,
              signalData,
              fromUser
            });
          } catch (error) {
            console.error('Error handling incoming call:', error);
            setIncomingCall({
              from,
              signalData
            });
          }
        }
      });
      
      
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConversation?.id) {
      markConversationAsRead(currentConversation.id);
      resetUnreadCount(currentConversation.id);
    }
  }, [currentConversation?.id]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversation?.id) {
        markConversationAsRead(currentConversation.id);
      }
    };
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentConversation?.id, markConversationAsRead]);

  

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
  
  const handleSelectConversation = (conversation: ConversationResponseModel) => {
    if (currentConversation?.id === conversation.id) {
      return;
    }
  
    setCurrentConversation(conversation);
  
    setTimeout(() => {
      if (conversation.id) {
        fetchMessages(conversation.id);
        markConversationAsRead(conversation.id);
        resetUnreadCount(conversation.id); 
      }
    }, 200);
  };
  
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
        
        const membersWithDetails = members.filter(member => member.user && member.user.id);
        
        if (membersWithDetails.length > 0) {
          const memberProfiles = membersWithDetails.map(member => ({
            id: member.user?.id,
            name: member.user?.name,
            family_name: member.user?.family_name,
            avatar_url: member.user?.avatar_url
          }));
          
          setExistingMembers(memberProfiles as FriendResponseModel[]);
        } else {
          const membersPromises = memberIds.map(async (userId) => {
            try {
              if (userId === user?.id) {
                return {
                  id: user.id,
                  name: user.name,
                  family_name: user.family_name,
                  avatar_url: user.avatar_url
                };
              }
              
              return null;
            } catch (error) {
              console.error("Error fetching user details:", error);
              return null;
            }
          });
          
          const membersDetails = await Promise.all(membersPromises);
          const validMembers = membersDetails.filter(Boolean) as FriendResponseModel[];
          setExistingMembers(validMembers);
        }
      }
    } catch (error) {
      console.error("Error fetching conversation members:", error);
      setExistingMemberIds([]);
      setExistingMembers([]);
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

  const handleVideoCall = (conversation: ConversationResponseModel) => {
    if (!conversation?.id || !user?.id) return;
  
    // Xác định người nhận cuộc gọi (trong trường hợp chat 1-1)
    const conversationMessages = getMessagesForConversation(conversation.id);
    const actualMessages = conversationMessages.filter(msg => !msg.isDateSeparator);
    
    const isOneOnOneChat = conversation.name?.includes(" & ") ||
      (actualMessages.some(msg => msg.user_id !== user?.id) &&
        new Set(actualMessages.map(msg => msg.user_id)).size <= 2);
    
    let calleeId = "";
    if (isOneOnOneChat) {
      const otherUserMessage = actualMessages.find(msg => msg.user_id !== user?.id);
      if (otherUserMessage?.user_id) {
        calleeId = otherUserMessage.user_id;
      }
    }
    
    // Mở cửa sổ video call mới
    const width = 800;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const videoCallWindow = window.open(
      '', 
      '_blank',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!videoCallWindow) {
      message.error("Không thể mở cửa sổ video call. Vui lòng kiểm tra trình chặn popup.");
      return;
    }
    
    // Viết nội dung video call page vào cửa sổ
    videoCallWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Video Call | ${conversation.name}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          body {
            background-color: #000;
            overflow: hidden;
          }
          
          #remote-video {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 0;
          }
          
          #local-video {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 200px;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #fff;
            z-index: 1;
          }
          
          .controls {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            padding: 20px;
            gap: 10px;
            z-index: 2;
            background: linear-gradient(transparent, rgba(0,0,0,0.7));
          }
          
          .btn {
            padding: 12px 20px;
            border-radius: 50px;
            border: none;
            outline: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 500;
            transition: all 0.2s;
          }
          
          .end-call {
            background-color: #f5222d;
          }
          
          .mute, .video-toggle {
            background-color: rgba(255,255,255,0.2);
          }
          
          .btn:hover {
            opacity: 0.8;
          }
          
          .btn svg {
            margin-right: 6px;
          }
          
          .waiting {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            z-index: 3;
          }
          
          .waiting h2 {
            margin-bottom: 10px;
          }
          
          .incoming-call {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            color: white;
            z-index: 4;
          }
          
          .incoming-call h2 {
            margin-bottom: 20px;
          }
          
          .incoming-call .buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
          }
          
          .accept {
            background-color: #52c41a;
          }
          
          .decline {
            background-color: #f5222d;
          }
        </style>
      </head>
      <body>
        <video id="remote-video" autoplay playsinline></video>
        <video id="local-video" autoplay playsinline muted></video>
        
        <div id="waiting" class="waiting">
          <h2>Đang gọi...</h2>
          <p>Vui lòng chờ người nhận trả lời</p>
        </div>
        
        <div id="incoming-call" class="incoming-call" style="display: none;">
          <h2>Cuộc gọi đến</h2>
          <div class="buttons">
            <button id="accept-call" class="btn accept">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
              </svg>
              Trả lời
            </button>
            <button id="decline-call" class="btn decline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
              </svg>
              Từ chối
            </button>
          </div>
        </div>
        
        <div class="controls">
          <button id="mute-btn" class="btn mute">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
            </svg>
            Tắt mic
          </button>
          <button id="video-btn" class="btn video-toggle">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175l3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
            </svg>
            Tắt camera
          </button>
          <button id="end-call" class="btn end-call">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
              <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>
            Kết thúc
          </button>
        </div>
        
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <script src="https://unpkg.com/simple-peer@9.11.0/simplepeer.min.js"></script>
        <script>
          const socket = io('${process.env.NEXT_PUBLIC_VIDEO_CHAT_SERVER || 'http://localhost:5000'}');
          
          // Thông tin người dùng
          const myUserId = '${user?.id}';
          const conversationId = '${conversation.id}';
          const conversationName = '${conversation.name?.replace(/'/g, "\\'")}';
          const isOneOnOne = ${isOneOnOneChat};
          const calleeId = '${calleeId}';
          
          // DOM elements
          const localVideo = document.getElementById('local-video');
          const remoteVideo = document.getElementById('remote-video');
          const muteBtn = document.getElementById('mute-btn');
          const videoBtn = document.getElementById('video-btn');
          const endCallBtn = document.getElementById('end-call');
          const waitingDiv = document.getElementById('waiting');
          const incomingCallDiv = document.getElementById('incoming-call');
          const acceptCallBtn = document.getElementById('accept-call');
          const declineCallBtn = document.getElementById('decline-call');
          
          // Biến theo dõi trạng thái
          let localStream = null;
          let remoteStream = null;
          let peer = null;
          let isCaller = false;
          let isCalleeId = null;
          let callAccepted = false;
          let isMuted = false;
          let isVideoOff = false;
          
          // Hàm khởi tạo
          async function initialize() {
            try {
              // Lấy video và audio từ người dùng
              localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
              });
              
              // Hiển thị video người dùng
              localVideo.srcObject = localStream;
              
              // Đăng ký người dùng
              socket.emit('register', myUserId);
              
              // Nếu đây là một cuộc gọi 1-1 và có calleeId, bắt đầu gọi
              if (isOneOnOne && calleeId) {
                isCaller = true;
                callUser(calleeId);
              } else {
                // Ẩn phần đang gọi nếu không phải là người gọi
                waitingDiv.style.display = 'none';
              }
              
              // Thiết lập các sự kiện Socket.IO
              setupSocketEvents();
              
              // Thiết lập các sự kiện UI
              setupUIEvents();
            } catch (error) {
              console.error('Không thể khởi tạo video call:', error);
              alert('Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.');
              window.close();
            }
          }
          
          // Thiết lập các sự kiện Socket.IO
          function setupSocketEvents() {
            // Nhận cuộc gọi đến
            socket.on('call-incoming', ({ from, signalData, callType }) => {
              if (callType === 'video') {
                isCalleeId = from;
                
                // Hiển thị UI cuộc gọi đến
                incomingCallDiv.style.display = 'block';
                
                // Lưu signal data để sử dụng khi trả lời
                window.callerSignalData = signalData;
              }
            });
            
            // Cuộc gọi được chấp nhận
            socket.on('call-accepted', ({ from, signalData }) => {
              if (isCaller && from === calleeId) {
                callAccepted = true;
                waitingDiv.style.display = 'none';
                
                // Signal cho peer connection
                peer.signal(signalData);
              }
            });
            
            // Cuộc gọi bị từ chối
            socket.on('call-declined', ({ from, reason }) => {
              alert(\`Cuộc gọi bị từ chối: \${reason || 'Người dùng không muốn trả lời'}\`);
              window.close();
            });
            
            // Cuộc gọi kết thúc
            socket.on('call-ended', ({ from }) => {
              endCall(false);
            });
          }
          
          // Thiết lập các sự kiện UI
          function setupUIEvents() {
            // Bật/tắt microphone
            muteBtn.addEventListener('click', () => {
              if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  const enabled = !audioTracks[0].enabled;
                  audioTracks[0].enabled = enabled;
                  isMuted = !enabled;
                  muteBtn.innerHTML = isMuted ? 
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                      <path d="M10.707 11.182A4.486 4.486 0 0 0 12.025 8a4.486 4.486 0 0 0-1.318-3.182L10 5.525A3.489 3.489 0 0 1 11.025 8c0 .966-.392 1.841-1.025 2.475l.707.707z"/>
                      <path d="M9.293 12.95l.707.707A5.483 5.483 0 0 0 13.025 8a5.483 5.483 0 0 0-3.025-4.95l-.707.707A4.486 4.486 0 0 1 12.025 8c0 1.439-.675 2.72-1.725 3.537l-1.007-.993z"/>
                      <path d="M10.121 14.536l.707.707A6.48 6.48 0 0 0 14.025 8a6.48 6.48 0 0 0-3.197-5.584l-.707.707A5.483 5.483 0 0 1 13.025 8a5.483 5.483 0 0 1-2.904 4.829l-1 .707z"/>
                    </svg> Bật mic\` :
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                      <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                    </svg> Tắt mic\`;
                }
              }
            });
            
            // Bật/tắt camera
            videoBtn.addEventListener('click', () => {
              if (localStream) {
                const videoTracks = localStream.getVideoTracks();
                if (videoTracks.length > 0) {
                  const enabled = !videoTracks[0].enabled;
                  videoTracks[0].enabled = enabled;
                  isVideoOff = !enabled;
                  videoBtn.innerHTML = isVideoOff ? 
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l.714 1H9.5a1 1 0 0 1 1 1v6a1 1 0 0 1-.144.518l.605.847zM1.428 4.18A.999.999 0 0 0 1 5v6a1 1 0 0 0 1 1h5.014l.714 1H2a2 2 0 0 1-2-2V5c0-.675.334-1.272.847-1.634l.58.814zM15 11.73l-3.5-1.555v-4.35L15 4.269v7.462zm-4.407 3.56-10-14 .814-.58 10 14-.814.58z"/>
                    </svg> Bật camera\` :
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175l3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
                    </svg> Tắt camera\`;
                }
              }
            });
            
            // Kết thúc cuộc gọi
            endCallBtn.addEventListener('click', () => {
              endCall(true);
            });
            
            // Chấp nhận cuộc gọi
            acceptCallBtn.addEventListener('click', () => {
              answerCall();
            });
            
            // Từ chối cuộc gọi
            declineCallBtn.addEventListener('click', () => {
              declineCall();
            });
          }
          
          // Gọi cho người dùng khác
          function callUser(userId) {
            // Hiển thị phần chờ
            waitingDiv.style.display = 'block';
            
            // Tạo peer connection
            peer = new SimplePeer({
              initiator: true,
              trickle: false,
              stream: localStream
            });
            
            // Khi có tín hiệu cục bộ
            peer.on('signal', (data) => {
              // Gửi tín hiệu đến người được gọi
              socket.emit('call-user', {
                to: userId,
                from: myUserId,
                signalData: data,
                callType: 'video'
              });
            });
            
            // Khi nhận được stream từ bạn
            peer.on('stream', (stream) => {
              remoteStream = stream;
              remoteVideo.srcObject = stream;
              waitingDiv.style.display = 'none';
            });
            
            // Xử lý lỗi
            peer.on('error', (err) => {
              console.error('Peer connection error:', err);
              alert('Có lỗi xảy ra với kết nối. Vui lòng thử lại sau.');
              window.close();
            });
          }
          
          // Trả lời cuộc gọi
          function answerCall() {
            callAccepted = true;
            incomingCallDiv.style.display = 'none';
            
            // Tạo peer connection
            peer = new SimplePeer({
              initiator: false,
              trickle: false,
              stream: localStream
            });
            
            // Khi có tín hiệu cục bộ
            peer.on('signal', (data) => {
              // Gửi tín hiệu đến người gọi
              socket.emit('call-accepted', {
                to: isCalleeId,
                from: myUserId,
                signalData: data
              });
            });
            
            // Khi nhận được stream từ bạn
            peer.on('stream', (stream) => {
              remoteStream = stream;
              remoteVideo.srcObject = stream;
            });
            
            // Xử lý lỗi
            peer.on('error', (err) => {
              console.error('Peer connection error:', err);
              alert('Có lỗi xảy ra với kết nối. Vui lòng thử lại sau.');
              window.close();
            });
            
            // Signal với dữ liệu từ người gọi
            peer.signal(window.callerSignalData);
          }
          
          // Từ chối cuộc gọi
          function declineCall() {
            if (isCalleeId) {
              socket.emit('call-declined', {
                to: isCalleeId,
                from: myUserId,
                reason: 'Người dùng từ chối cuộc gọi'
              });
            }
            window.close();
          }
          
          // Kết thúc cuộc gọi
          function endCall(sendSignal = true) {
            // Gửi tín hiệu kết thúc cuộc gọi
            if (sendSignal) {
              if (isCaller && calleeId) {
                socket.emit('end-call', {
                  to: calleeId,
                  from: myUserId
                });
              } else if (isCalleeId) {
                socket.emit('end-call', {
                  to: isCalleeId,
                  from: myUserId
                });
              }
            }
            
            // Dừng các stream
            if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
            }
            
            // Đóng kết nối peer
            if (peer) {
              peer.destroy();
            }
            
            // Đóng socket
            socket.disconnect();
            
            // Đóng cửa sổ
            window.close();
          }
          
          // Khi cửa sổ đóng
          window.onbeforeunload = () => {
            endCall(true);
          };
          
          // Khởi tạo
          initialize();
        </script>
      </body>
      </html>
    `);
    
    videoCallWindow.document.close();
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    const width = 800;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const videoCallWindow = window.open(
      '', 
      '_blank',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!videoCallWindow) {
      message.error("Không thể mở cửa sổ video call. Vui lòng kiểm tra trình chặn popup.");
      // Từ chối cuộc gọi vì không thể mở cửa sổ
      socketRef.current.emit('call-declined', {
        to: incomingCall.from,
        from: user?.id,
        reason: 'Không thể mở cửa sổ video call'
      });
      setIncomingCall(null);
      return;
    }
    
    // Lưu signal data để truyền vào cửa sổ mới
    const signalData = incomingCall.signalData;
    
    // Viết nội dung HTML cho trang video call
    videoCallWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Video Call | ${incomingCall.fromUser ? `${incomingCall.fromUser.family_name || ''} ${incomingCall.fromUser.name || ''}` : 'Incoming Call'}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* CSS giống như trong hàm handleVideoCall */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          
          body {
            background-color: #000;
            overflow: hidden;
          }
          
          #remote-video {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 0;
          }
          
          #local-video {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 200px;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #fff;
            z-index: 1;
          }
          
          .controls {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            padding: 20px;
            gap: 10px;
            z-index: 2;
            background: linear-gradient(transparent, rgba(0,0,0,0.7));
          }
          
          .btn {
            padding: 12px 20px;
            border-radius: 50px;
            border: none;
            outline: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 500;
            transition: all 0.2s;
          }
          
          .end-call {
            background-color: #f5222d;
          }
          
          .mute, .video-toggle {
            background-color: rgba(255,255,255,0.2);
          }
          
          .btn:hover {
            opacity: 0.8;
          }
          
          .btn svg {
            margin-right: 6px;
          }
        </style>
      </head>
      <body>
        <video id="remote-video" autoplay playsinline></video>
        <video id="local-video" autoplay playsinline muted></video>
        
        <div class="controls">
          <button id="mute-btn" class="btn mute">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
            </svg>
            Tắt mic
          </button>
          <button id="video-btn" class="btn video-toggle">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175l3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
            </svg>
            Tắt camera
          </button>
          <button id="end-call" class="btn end-call">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
              <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>
            Kết thúc
          </button>
        </div>
        
        <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
        <script src="https://unpkg.com/simple-peer@9.11.0/simplepeer.min.js"></script>
        <script>
          // Script mã JavaScript tương tự như trong handleVideoCall, nhưng với trạng thái người nhận cuộc gọi
          const socket = io('${process.env.NEXT_PUBLIC_VIDEO_CHAT_SERVER || 'http://localhost:5000'}');
          
          // Thông tin người dùng
          const myUserId = '${user?.id}';
          const callerId = '${incomingCall.from}';
          
          // DOM elements
          const localVideo = document.getElementById('local-video');
          const remoteVideo = document.getElementById('remote-video');
          const muteBtn = document.getElementById('mute-btn');
          const videoBtn = document.getElementById('video-btn');
          const endCallBtn = document.getElementById('end-call');
          
          // Biến theo dõi trạng thái
          let localStream = null;
          let remoteStream = null;
          let peer = null;
          let callAccepted = false;
          let isMuted = false;
          let isVideoOff = false;
          
          // Signal data từ người gọi
          const callerSignalData = ${JSON.stringify(signalData)};
          
          // Hàm khởi tạo
          async function initialize() {
            console.log('Initializing video call...');
            try {
              console.log('Requesting camera and microphone access...');
              // Lấy video và audio từ người dùng
              try {
                localStream = await navigator.mediaDevices.getUserMedia({ 
                  video: true, 
                  audio: true 
                });
                console.log('Camera and microphone access granted');
              } catch (mediaError) {
                console.error('Media error:', mediaError);
                // Thử lại với chỉ audio nếu video thất bại
                alert('Không thể truy cập camera. Đang thử lại với chỉ microphone...');
                try {
                  localStream = await navigator.mediaDevices.getUserMedia({ 
                    video: false, 
                    audio: true 
                  });
                  console.log('Audio-only access granted');
                } catch (audioError) {
                  console.error('Audio-only error:', audioError);
                  alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập và làm mới trang.');
                  return;
                }
              }
              
              // Hiển thị video người dùng
              if (localStream) {
                localVideo.srcObject = localStream;
                console.log('Local video stream set to video element');
              }
              
              // Đăng ký người dùng
              socket.emit('register', myUserId);
              console.log('Registered user with socket:', myUserId);
              
              // Thiết lập các sự kiện Socket.IO
              setupSocketEvents();
              
              // Thiết lập các sự kiện UI
              setupUIEvents();
              
              // Trả lời cuộc gọi ngay
              console.log('Auto-answering call...');
              answerCall();
            } catch (error) {
              console.error('General initialization error:', error);
              alert('Không thể khởi tạo video call: ' + error.message);
            }
          }
          
          // Thiết lập các sự kiện Socket.IO
          function setupSocketEvents() {
            // Cuộc gọi kết thúc
            socket.on('call-ended', ({ from }) => {
              if (from === callerId) {
                endCall(false);
              }
            });
          }
          
          // Thiết lập các sự kiện UI
          function setupUIEvents() {
            // Bật/tắt microphone
            muteBtn.addEventListener('click', () => {
              if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  const enabled = !audioTracks[0].enabled;
                  audioTracks[0].enabled = enabled;
                  isMuted = !enabled;
                  muteBtn.innerHTML = isMuted ? 
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                      <path d="M10.707 11.182A4.486 4.486 0 0 0 12.025 8a4.486 4.486 0 0 0-1.318-3.182L10 5.525A3.489 3.489 0 0 1 11.025 8c0 .966-.392 1.841-1.025 2.475l.707.707z"/>
                      <path d="M9.293 12.95l.707.707A5.483 5.483 0 0 0 13.025 8a5.483 5.483 0 0 0-3.025-4.95l-.707.707A4.486 4.486 0 0 1 12.025 8c0 1.439-.675 2.72-1.725 3.537l-1.007-.993z"/>
                      <path d="M10.121 14.536l.707.707A6.48 6.48 0 0 0 14.025 8a6.48 6.48 0 0 0-3.197-5.584l-.707.707A5.483 5.483 0 0 1 13.025 8a5.483 5.483 0 0 1-2.904 4.829l-1 .707z"/>
                    </svg> Bật mic\` :
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                      <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                    </svg> Tắt mic\`;
                }
              }
            });
            
            // Bật/tắt camera
            videoBtn.addEventListener('click', () => {
              if (localStream) {
                const videoTracks = localStream.getVideoTracks();
                if (videoTracks.length > 0) {
                  const enabled = !videoTracks[0].enabled;
                  videoTracks[0].enabled = enabled;
                  isVideoOff = !enabled;
                  videoBtn.innerHTML = isVideoOff ? 
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M10.961 12.365a1.99 1.99 0 0 0 .522-1.103l3.11 1.382A1 1 0 0 0 16 11.731V4.269a1 1 0 0 0-1.406-.913l-3.111 1.382A2 2 0 0 0 9.5 3H4.272l.714 1H9.5a1 1 0 0 1 1 1v6a1 1 0 0 1-.144.518l.605.847zM1.428 4.18A.999.999 0 0 0 1 5v6a1 1 0 0 0 1 1h5.014l.714 1H2a2 2 0 0 1-2-2V5c0-.675.334-1.272.847-1.634l.58.814zM15 11.73l-3.5-1.555v-4.35L15 4.269v7.462zm-4.407 3.56-10-14 .814-.58 10 14-.814.58z"/>
                    </svg> Bật camera\` :
                    \`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5zm11.5 5.175l3.5 1.556V4.269l-3.5 1.556v4.35zM2 4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H2z"/>
                    </svg> Tắt camera\`;
                }
              }
            });
            
            // Kết thúc cuộc gọi
            endCallBtn.addEventListener('click', () => {
              endCall(true);
            });
          }
          
          // Trả lời cuộc gọi
          function answerCall() {
            try {
              console.log('Answering call...');
              callAccepted = true;
              
              // Tạo peer connection
              peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: localStream
              });
              
              console.log('Peer created successfully');
              
              // Khi có tín hiệu cục bộ
              peer.on('signal', (data) => {
                console.log('Generated signal to send back to caller:', data);
                // Gửi tín hiệu đến người gọi
                socket.emit('call-accepted', {
                  to: callerId,
                  from: myUserId,
                  signalData: data
                });
              });
              
              // Khi nhận được stream từ bạn
              peer.on('stream', (stream) => {
                console.log('Received remote stream');
                remoteStream = stream;
                remoteVideo.srcObject = stream;
              });
              
              // Xử lý lỗi
              peer.on('error', (err) => {
                console.error('Peer connection error:', err);
                alert('Có lỗi xảy ra với kết nối. Vui lòng thử lại sau.');
                window.close();
              });
              
              console.log('Signaling with caller data:', callerSignalData);
              // Signal với dữ liệu từ người gọi
              peer.signal(callerSignalData);
            } catch (error) {
              console.error('Error in answerCall:', error);
              alert('Có lỗi khi kết nối cuộc gọi: ' + error.message);
            }
          }
          
          // Kết thúc cuộc gọi
          function endCall(sendSignal = true) {
            // Gửi tín hiệu kết thúc cuộc gọi
            if (sendSignal) {
              socket.emit('end-call', {
                to: callerId,
                from: myUserId
              });
            }
            
            // Dừng các stream
            if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
            }
            
            // Đóng kết nối peer
            if (peer) {
              peer.destroy();
            }
            
            // Đóng socket
            socket.disconnect();
            
            // Đóng cửa sổ
            window.close();
          }
          
          // Khi cửa sổ đóng
          window.onbeforeunload = () => {
            endCall(true);
          };
          
          // Khởi tạo
          initialize();
        </script>
      </body>
      </html>
    `);
    
    videoCallWindow.document.close();
    
    // Đánh dấu đã xử lý cuộc gọi
    setIncomingCall(null);
  };
  
  const handleDeclineCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit('call-declined', {
        to: incomingCall.from,
        from: user?.id,
        reason: 'Người dùng từ chối cuộc gọi'
      });
    }
    
    setIncomingCall(null);
  };

  useEffect(() => {
    let ringtone: HTMLAudioElement | null = null;
    
    if (incomingCall) {
      // Tạo âm thanh chuông
      ringtone = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c19592.mp3');
      ringtone.loop = true;
      ringtone.play().catch(error => {
        console.warn('Không thể phát âm thanh do chính sách tự động phát:', error);
      });
    }
    
    return () => {
      if (ringtone) {
        ringtone.pause();
        ringtone = null;
      }
    };
  }, [incomingCall]);

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
                          onClick={() => {
                            handleSelectConversation(item);
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "12px 16px",
                            background: currentConversation?.id === item.id ? lightGray : "transparent",
                            transition: "background 0.3s",
                          }}
                          key={item.id}
                        >
                          <List.Item.Meta
                            avatar={
                              // <Badge 
                              //   count={unreadMessageCounts[item.id || ''] || 0} 
                              //   offset={[-5, 5]}
                              //   size="small"
                              //   style={{ 
                              //     display: unreadMessageCounts[item.id || ''] ? 'block' : 'none' 
                              //   }}
                              // >
                                <Avatar
                                  src={avatarUrl}
                                  size={48}
                                  style={{
                                    backgroundColor: !avatarUrl ? brandPrimary : undefined
                                  }}
                                >
                                  {!avatarUrl && avatarInitial}
                                </Avatar>
                              // </Badge>
                            }
                            title={<Text strong>{item.name}</Text>}
                            description={
                              <Text
                                type="secondary"
                                ellipsis
                                style={{
                                  maxWidth: '100%',
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
                              
                              {/* {unreadMessageCounts[item.id || ''] > 0 && (
                                // <Badge
                                //   count={unreadMessageCounts[item.id || '']}
                                //   size="small"
                                //   style={{ 
                                //     marginTop: 4,
                                //     backgroundColor: brandPrimary 
                                //   }}
                                // />
                              )} */}
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
                {currentConversation && (
                  <Button 
                    type="text" 
                    icon={<VideoCameraOutlined style={{ fontSize: 20 }} />} 
                    onClick={() => handleVideoCall(currentConversation)}
                    style={{ marginRight: 8 }}
                  />
                )}
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
                                key={`${msg.id || `temp-${msg.created_at}`}-${Date.now()}`}
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
                  />

                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    style={{ marginLeft: 8 }}
                    disabled={!messageText.trim() || messageText.length > 500}
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
        existingMembers={existingMembers}
      />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <VideoCameraOutlined style={{ color: brandPrimary, fontSize: 24, marginRight: 10 }} />
            <span>{localStrings.Messages.IncomingCall}</span>
          </div>
        }
        open={!!incomingCall}
        closable={false}
        footer={null}
        centered
        width={400}
      >
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Avatar
            src={incomingCall?.fromUser?.avatar_url}
            size={80}
            style={{
              backgroundColor: !incomingCall?.fromUser?.avatar_url ? brandPrimary : undefined,
              margin: '0 auto 15px'
            }}
          >
            {!incomingCall?.fromUser?.avatar_url && incomingCall?.fromUser?.name?.charAt(0)}
          </Avatar>
          <h2 style={{ marginBottom: 5 }}>
            {incomingCall?.fromUser 
              ? `${incomingCall.fromUser.family_name || ''} ${incomingCall.fromUser.name || ''}`.trim() 
              : localStrings.Messages.Unknown}
          </h2>
          <p style={{ color: '#666' }}>{localStrings.Messages.IsCallingYou}</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <Button
            type="primary"
            danger
            icon={<CloseOutlined />}
            size="large"
            onClick={handleDeclineCall}
            style={{ minWidth: '120px' }}
          >
            {localStrings.Messages.Decline}
          </Button>
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            size="large"
            onClick={handleAcceptCall}
            style={{ minWidth: '120px', backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            {localStrings.Messages.Accept}
          </Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default MessagesFeature