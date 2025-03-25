import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { useAuth } from "@/context/auth/useAuth";
import { useState, useCallback, useEffect } from "react";

export interface ConversationWithMembers extends ConversationResponseModel {
  members?: ConversationDetailResponseModel[];
  isGroup?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export const useConversationViewModel = () => {
    const { user } = useAuth();
    const [activeFriend, setActiveFriend] = useState<FriendResponseModel | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ConversationWithMembers[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);

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
                    const membersRes = await defaultMessagesRepo.getConversationDetailByID({
                        conversationId: conversation.id,
                        userId: user.id
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
                }
            }
            const sortedConversations = conversationsWithDetails.sort((a, b) => {
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
            });

            setConversations(sortedConversations);
        } catch (error) {
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user?.id]);
    useEffect(() => {
        if (user?.id) {
            fetchAllConversations();
        }
    }, [user?.id, fetchAllConversations]);

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
                } else {
                }
            }
        } catch (err) {
        }
        return null;
    }, []);

    return {
        getExistingConversation,
        activeFriend,
        setActiveFriend,
        activeConversationId,
        setActiveConversationId,
        conversations,
        fetchAllConversations,
        isLoadingConversations
    };
};