import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";
import { useAuth } from "@/context/auth/useAuth";
import { useState, useCallback, useEffect, useRef } from "react";

export interface ConversationWithMembers extends ConversationResponseModel {
  members?: ConversationDetailResponseModel[];
  isGroup?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export const useConversationViewModel = () => {
    const { user } = useAuth();
    // Use useRef to ensure we have a stable reference to the activeConversationId
    const activeConversationIdRef = useRef<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeConversation, setActiveConversation] = useState<ConversationWithMembers | null>(null);
    const [conversations, setConversations] = useState<ConversationWithMembers[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);

    // Ensure the ref stays in sync with the state
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const fetchAllConversations = useCallback(async () => {
        if (!user?.id) return;

        try {
            setIsLoadingConversations(true);
            const conversationsRes = await defaultMessagesRepo.getConversations({
                limit: 100,
                page: 1
            });

            if (!conversationsRes.data) {
                setConversations([]);
                return;
            }

            const userConversations = Array.isArray(conversationsRes.data) 
                ? conversationsRes.data 
                : [conversationsRes.data];
            const conversationsWithDetails: ConversationWithMembers[] = [];

            for (const conversation of userConversations) {
                if (!conversation.id) continue;

                try {
                    // Use getConversationDetailByUserID instead of getConversationDetailByID
                    const membersRes = await defaultMessagesRepo.getConversationDetailByUserID({ 
                        conversation_id: conversation.id
                    });

                    if (!membersRes.data) continue;

                    const members = Array.isArray(membersRes.data) 
                        ? membersRes.data 
                        : [membersRes.data];

                    let lastMessage = "";
                    let lastMessageTime = "";
                    let unreadCount = 0;

                    try {
                        const messagesRes = await defaultMessagesRepo.getMessagesByConversationId({
                            conversation_id: conversation.id,
                            limit: 1,
                            page: 1
                        });

                        if (messagesRes.data) {
                            const messages = Array.isArray(messagesRes.data) ? messagesRes.data : [messagesRes.data];
                            if (messages.length > 0) {
                                lastMessage = messages[0].content || "";
                                lastMessageTime = messages[0].created_at || "";
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching messages for conversation:", error);
                    }
                    conversationsWithDetails.push({
                        ...conversation,
                        members,
                        isGroup: members.length > 2,
                        unreadCount,
                        lastMessage,
                        lastMessageTime
                    });
                } catch (error) {
                    console.error("Error fetching conversation details:", error);
                }
            }
            const sortedConversations = conversationsWithDetails.sort((a, b) => {
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
            });

            setConversations(sortedConversations);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user?.id]);
    
    useEffect(() => {
        if (user?.id) {
            fetchAllConversations();
        }
    }, [user?.id, fetchAllConversations]);

    // Enhanced setter for activeConversationId to ensure synchronization
    const setActiveConversationIdSafe = useCallback((id: string | null) => {
        console.log("Setting active conversation ID:", id);
        activeConversationIdRef.current = id;
        setActiveConversationId(id);
    }, []);

    // Enhanced setter for activeConversation to ensure ID is also set
    const setActiveConversationSafe = useCallback((conversation: ConversationWithMembers | null) => {
        console.log("Setting active conversation:", conversation?.id);
        setActiveConversation(conversation);
        if (conversation && conversation.id) {
            setActiveConversationIdSafe(conversation.id);
        } else if (!conversation) {
            setActiveConversationIdSafe(null);
        }
    }, [setActiveConversationIdSafe]);
    
    // Set active conversation when ID changes
    useEffect(() => {
        if (activeConversationId) {
            console.log("Looking for conversation with ID:", activeConversationId);
            const conversation = conversations.find(c => c.id === activeConversationId);
            if (conversation) {
                console.log("Found matching conversation:", conversation.name);
                setActiveConversation(conversation);
            } else {
                console.warn("No matching conversation found for ID:", activeConversationId);
            }
        } else {
            setActiveConversation(null);
        }
    }, [activeConversationId, conversations]);

    const getExistingConversation = useCallback(async (userId: string, friendId: string): Promise<string | null> => {
        try {
            const userRes = await defaultMessagesRepo.getConversationDetailByUserID({ user_id: userId });
            const friendRes = await defaultMessagesRepo.getConversationDetailByUserID({ user_id: friendId });
        
            if (userRes.data && friendRes.data) {
                const userConvos = Array.isArray(userRes.data) ? userRes.data : [userRes.data];
                const friendConvos = Array.isArray(friendRes.data) ? friendRes.data : [friendRes.data];
        
                const commonConvo = userConvos.find(uc => {
                    const ucId = uc.conversation_id || (uc.conversation && uc.conversation.id);
                    return friendConvos.some(fc => {
                        const fcId = fc.conversation_id || (fc.conversation && fc.conversation.id);
                        return ucId === fcId;
                    });
                });
            
                if (commonConvo) {
                    const conversationId = commonConvo.conversation_id || (commonConvo.conversation && commonConvo.conversation.id);
                    return conversationId || null;
                }
            }
        } catch (err) {
            console.error("Error finding existing conversation:", err);
        }
        return null;
    }, []);

    return {
        getExistingConversation,
        activeConversation,
        setActiveConversation: setActiveConversationSafe,
        activeConversationId,
        setActiveConversationId: setActiveConversationIdSafe,
        conversations,
        fetchAllConversations,
        isLoadingConversations
    };
};