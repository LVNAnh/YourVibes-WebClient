// src/components/screens/messages/viewModel/ConversationDetailViewModel.ts
import { useState, useEffect, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";

export const useConversationDetailViewModel = () => {
  const { user, localStrings } = useAuth();

  const [existingMembersLoading, setExistingMembersLoading] = useState(false);
  const [conversationMembersMap, setConversationMembersMap] = useState<Record<string, FriendResponseModel[]>>({});

  // Đánh dấu conversation đã đọc
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    try {
      await defaultMessagesRepo.updateConversationDetail({
        conversation_id: conversationId,
        user_id: user.id
      });
    } catch (error) {
      // Silent error handling
      console.error("Error marking conversation as read:", error);
    }
  }, [user?.id]);

  // Thêm thành viên vào conversation
  const addConversationMembers = useCallback(async (conversationId: string, userIds: string[]) => {
    if (!user?.id || !conversationId || !userIds.length) return null;
    
    try {
      // Tạo promise để thêm từng user
      const createPromises = userIds.map(userId => 
        defaultMessagesRepo.createConversationDetail({
          conversation_id: conversationId,
          user_id: userId
        })
      );
      
      // Thực hiện song song
      await Promise.all(createPromises);
      
      // Refresh members list
      await fetchConversationMembers(conversationId);
      
      return true;
    } catch (error) {
      console.error("Error adding members to conversation:", error);
      throw error;
    }
  }, [user?.id]);

  // Rời khỏi conversation
  const leaveConversation = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    try {
      await defaultMessagesRepo.deleteConversationDetail({
        user_id: user.id,
        conversation_id: conversationId
      });
      
      return true;
    } catch (error) {
      console.error("Error leaving conversation:", error);
      throw error;
    }
  }, [user?.id]);

  // Fetch thành viên của conversation
  const fetchConversationMembers = useCallback(async (conversationId: string): Promise<FriendResponseModel[]> => {
    if (!conversationId) return [];
    
    setExistingMembersLoading(true);
    
    try {
      const response = await defaultMessagesRepo.getConversationDetailByUserID({
        conversation_id: conversationId
      });
  
      if (response.data) {
        const members = Array.isArray(response.data) ? response.data : [response.data];
        
        const membersWithDetails = members.filter(member => member.user && member.user.id);
        
        if (membersWithDetails.length > 0) {
          const memberProfiles = membersWithDetails.map(member => ({
            id: member.user?.id,
            name: member.user?.name,
            family_name: member.user?.family_name,
            avatar_url: member.user?.avatar_url
          }));
          
          const membersList = memberProfiles as FriendResponseModel[];
          
          // Cache kết quả
          setConversationMembersMap(prev => ({
            ...prev,
            [conversationId]: membersList
          }));
          
          return membersList;
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching conversation members:", error);
      return [];
    } finally {
      setExistingMembersLoading(false);
    }
  }, []);

  // Lấy thành viên cho conversation cụ thể
  const getMembersForConversation = useCallback((conversationId: string): FriendResponseModel[] => {
    return conversationMembersMap[conversationId] || [];
  }, [conversationMembersMap]);

  return {
    // State
    existingMembersLoading,
    conversationMembersMap,
    
    // Actions
    markConversationAsRead,
    addConversationMembers,
    leaveConversation,
    fetchConversationMembers,
    getMembersForConversation,
  };
};