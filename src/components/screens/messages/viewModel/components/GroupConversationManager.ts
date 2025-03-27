import { useState, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useConversationViewModel } from './ConversationViewModel';
import { message as antdMessage } from 'antd';

export interface FriendUser {
  id: string;
  name: string;
  family_name?: string;
  avatar_url?: string;
}

export const useGroupConversationManager = () => {
  const { user, localStrings } = useAuth();
  const { createConversation } = useConversationViewModel();
  
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<FriendUser[]>([]);
  const [availableFriends, setAvailableFriends] = useState<FriendUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Reset the group creation state
  const resetGroupCreation = useCallback(() => {
    setIsCreatingGroup(false);
    setGroupError(null);
    setSelectedFriends([]);
    setSearchTerm('');
  }, []);
  
  // Toggle friend selection
  const toggleFriendSelection = useCallback((friend: FriendUser) => {
    setSelectedFriends(prev => {
      const isAlreadySelected = prev.some(f => f.id === friend.id);
      
      if (isAlreadySelected) {
        // Remove friend
        return prev.filter(f => f.id !== friend.id);
      } else {
        // Add friend
        return [...prev, friend];
      }
    });
  }, []);
  
  // Handle group creation
  const handleGroupCreation = useCallback(async (name?: string) => {
    if (!user?.id) {
      setGroupError(localStrings.Messages.UserNotLoggedIn || "Please login");
      return null;
    }
    
    if (selectedFriends.length < 2) {
      setGroupError(localStrings.Messages.GroupMinimumMembers || "Group chat must have at least 3 members (including you)");
      return null;
    }
    
    setIsCreatingGroup(true);
    
    try {
      const userIds = selectedFriends.map(f => f.id);
      const groupName = name || `${user.name}'s group with ${selectedFriends.map(f => f.name).join(', ')}`;
      
      const newConversation = await createConversation(userIds, groupName);
      
      if (newConversation) {
        resetGroupCreation();
        antdMessage.success("Group created successfully");
        return newConversation;
      } else {
        throw new Error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      setGroupError(localStrings.Messages.GroupCreationFailed || "Failed to create group chat");
      return null;
    } finally {
      setIsCreatingGroup(false);
    }
  }, [user, selectedFriends, createConversation, resetGroupCreation, localStrings]);
  
  // Filter available friends based on search term
  const filteredFriends = useCallback(() => {
    if (!searchTerm.trim()) {
      return availableFriends;
    }
    
    const term = searchTerm.toLowerCase();
    return availableFriends.filter(friend => 
      friend.name.toLowerCase().includes(term) || 
      (friend.family_name && friend.family_name.toLowerCase().includes(term))
    );
  }, [availableFriends, searchTerm]);
  
  return {
    isCreatingGroup,
    setIsCreatingGroup,
    groupError,
    setGroupError,
    selectedFriends,
    setSelectedFriends,
    availableFriends,
    setAvailableFriends,
    searchTerm,
    setSearchTerm,
    filteredFriends: filteredFriends(),
    toggleFriendSelection,
    handleGroupCreation,
    resetGroupCreation,
  };
};