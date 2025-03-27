"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, List, Avatar, Spin, message, Checkbox } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import useColor from "@/hooks/useColor";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";

interface NewConversationModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreateConversation: (name: string, image?: string) => Promise<any>;
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

  // Fetch user's friends when modal is opened
  useEffect(() => {
    if (visible && user?.id) {
      fetchFriends();
    }
  }, [visible, user?.id]);

  // Fetch friends list
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
      message.error(localStrings.Public.ErrorFetchingFriends);
    } finally {
      setLoading(false);
    }
  };

  // Create new conversation with selected friends
  const handleCreateConversation = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      if (selectedFriends.length === 0) {
        message.warning(localStrings.Public.SelectAtLeastOneFriend);
        return;
      }
      
      setCreating(true);
      
      // Get selected friends
      const selectedUsers = selectedFriends.map(id => 
        friends.find(friend => friend.id === id)
      ).filter(Boolean) as FriendResponseModel[];
      
      // Create conversation name based on selected friends if not provided
      let conversationName = values.name;
      if (!conversationName && selectedUsers.length > 0) {
        conversationName = selectedUsers
          .map(user => `${user.family_name || ''} ${user.name || ''}`.trim())
          .join(", ");
      }
      
      // Create conversation
      const newConversation = await onCreateConversation(conversationName);
      
      if (newConversation && newConversation.id) {
        // Add selected friends to the conversation
        for (const friendId of selectedFriends) {
          try {
            await defaultMessagesRepo.createConversationDetail({
              conversation_id: newConversation.id,
              user_id: friendId
            });
          } catch (error) {
            console.error(`Error adding friend ${friendId} to conversation:`, error);
          }
        }
        
        // Note: Current user is now added to the conversation in the createConversation function
        // to ensure they always see their own conversations
        
        // Reset form
        form.resetFields();
        setSelectedFriends([]);
        
        // Close modal
        onCancel();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setCreating(false);
    }
  };

  // Toggle friend selection
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
      title={localStrings.Public.NewConversation || "New Conversation"}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {localStrings.Public.Cancel || "Cancel"}
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          onClick={handleCreateConversation} 
          loading={creating}
          disabled={selectedFriends.length === 0}
        >
          {localStrings.Public.Create || "Create"}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="name" 
          label={localStrings.Public.ConversationName || "Conversation Name"}
        >
          <Input placeholder={localStrings.Public.OptionalGroupName || "Optional Group Name"} />
        </Form.Item>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            {localStrings.Public.SelectFriends || "Select Friends"}
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
              locale={{ emptyText: localStrings.Public.NoFriendsFound || "No friends found" }}
            />
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default NewConversationModal;