"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, List, Avatar, Spin, message, Checkbox } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import useColor from "@/hooks/useColor";

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

export default AddMemberModal;