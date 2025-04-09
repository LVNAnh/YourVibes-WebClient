"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, List, Avatar, Spin, message, Checkbox, Upload } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import useColor from "@/hooks/useColor";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

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

export default NewConversationModal;