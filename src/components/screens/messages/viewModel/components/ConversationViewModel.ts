import { useState, useEffect, useCallback, useRef } from "react";
import { message as antdMessage } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";

// Extended conversation type with members
export interface ConversationWithMembers extends ConversationResponseModel {
  members?: ConversationDetailResponseModel[];
  isGroup?: boolean;
}

export const useConversationViewModel = () => {
  const { user, localStrings } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMembers[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationWithMembers | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  
  const prevActiveIdRef = useRef<string | null>(null);

  // Fetch all conversations
  const fetchAllConversations = useCallback(async () => {
    if (!user?.id) {
      console.error("Cannot fetch conversations: user is not logged in");
      return;
    }
    
    setLoadingConversations(true);
    
    try {
      // Fetch conversations
      const response = await defaultMessagesRepo.getConversations({
        limit: 100,
        page: 1,
      });
      
      if (!response.data) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }
      
      const conversationList = Array.isArray(response.data) ? response.data : [response.data];
      
      // Create a map to store conversation details
      const conversationDetailsMap: { [key: string]: ConversationDetailResponseModel[] } = {};
      
      // Fetch details for each conversation
      for (const conversation of conversationList) {
        if (!conversation.id) continue;
        
        try {
          const detailsResponse = await defaultMessagesRepo.getConversationDetailByID({
            userId: user.id,
            conversationId: conversation.id,
          });
          
          if (detailsResponse.data) {
            const details = Array.isArray(detailsResponse.data) 
              ? detailsResponse.data 
              : [detailsResponse.data];
              
            conversationDetailsMap[conversation.id] = details;
          }
        } catch (error) {
          console.error(`Error fetching details for conversation ${conversation.id}:`, error);
        }
      }
      
      // Merge conversations with their details
      const enrichedConversations = conversationList.map(conversation => {
        const members = conversation.id ? conversationDetailsMap[conversation.id] || [] : [];
        const isGroup = members.length > 2;
        
        // If it's a direct message (not a group), set the name to the other user's name
        let conversationName = conversation.name;
        if (!isGroup && members.length === 2) {
          const otherMember = members.find(m => m.user_id !== user.id);
          if (otherMember && otherMember.user) {
            conversationName = otherMember.user.name || conversationName;
          }
        }
        
        return {
          ...conversation,
          name: conversationName,
          members,
          isGroup
        };
      });
      
      setConversations(enrichedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversationError("Failed to load conversations");
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  // Get a conversation by ID
  const getConversationById = useCallback((conversationId: string) => {
    return conversations.find(c => c.id === conversationId) || null;
  }, [conversations]);

  // Create a new conversation
  const createConversation = useCallback(async (userIds: string[], name?: string) => {
    if (!user?.id) {
      console.error("Cannot create conversation: user is not logged in");
      return null;
    }
    
    if (!userIds.length) {
      console.error("Cannot create conversation: no users selected");
      return null;
    }
    
    try {
      // Create the conversation
      const isGroup = userIds.length > 1;
      const conversationName = isGroup 
        ? (name || `Group with ${userIds.length + 1} members`)
        : undefined;
        
      const response = await defaultMessagesRepo.createConversation({
        name: conversationName,
        image: undefined, // Could set a default group image for groups
      });
      
      if (!response.data || !response.data.id) {
        throw new Error("No conversation data returned");
      }
      
      const conversationId = response.data.id;
      
      // Add the current user to the conversation
      await defaultMessagesRepo.createConversationDetail({
        conversation_id: conversationId,
        user_id: user.id,
      });
      
      // Add all other users to the conversation
      for (const userId of userIds) {
        if (userId === user.id) continue; // Skip if current user is in the list
        
        await defaultMessagesRepo.createConversationDetail({
          conversation_id: conversationId,
          user_id: userId,
        });
      }
      
      // Refresh conversations list
      fetchAllConversations();
      
      return response.data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      setConversationError("Failed to create conversation");
      return null;
    }
  }, [user?.id, fetchAllConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return false;
    
    try {
      await defaultMessagesRepo.deleteConversation({
        conversation_id: conversationId,
      });
      
      // Remove from state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If this was the active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setActiveConversation(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setConversationError("Failed to delete conversation");
      return false;
    }
  }, [activeConversationId]);

  // Effect to update activeConversation when activeConversationId changes
  useEffect(() => {
    if (activeConversationId && activeConversationId !== prevActiveIdRef.current) {
      const conversation = getConversationById(activeConversationId);
      if (conversation) {
        setActiveConversation(conversation);
      }
      prevActiveIdRef.current = activeConversationId;
    } else if (!activeConversationId && prevActiveIdRef.current) {
      setActiveConversation(null);
      prevActiveIdRef.current = null;
    }
  }, [activeConversationId, getConversationById]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchAllConversations();
    }
  }, [user?.id, fetchAllConversations]);

  return {
    conversations,
    loadingConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    setActiveConversation,
    conversationError,
    fetchAllConversations,
    createConversation,
    deleteConversation,
    getConversationById,
    isLoadingConversations: loadingConversations,
  };
};