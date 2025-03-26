import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { UserModel } from "@/api/features/authenticate/model/LoginModel";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { useAuth } from "@/context/auth/useAuth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useMessageViewModel } from "../MessagesViewModel";

export interface GroupMember {
  id: string;
  name?: string;
  family_name?: string;
  avatar_url?: string;
}

export interface GroupChatInfo {
  id: string;
  name: string;
  image?: string;
  isGroup: boolean;
  members: GroupMember[];
}

export const useGroupConversationManager = () => {
  const { user, localStrings } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [conversationMembers, setConversationMembers] = useState<UserModel[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupChatInfo | null>(null);
  const { setActiveFriend, findFriendByConversationId } = useMessageViewModel();

  useEffect(() => {
    const members = searchParams?.get("members");
    const conversation = searchParams?.get("conversation");
    
    if (members) {
      handleGroupCreation(members.split(","));
    } else if (conversation) {
      loadExistingGroupConversation(conversation);
    }
  }, [searchParams]);

  const fetchConversationMembers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const conversationsRes = await defaultMessagesRepo.getConversations({
        limit: 100,
        page: 1
      });

      if (!conversationsRes.data) return;

      const conversations = Array.isArray(conversationsRes.data) 
        ? conversationsRes.data 
        : [conversationsRes.data];

      const uniqueUserIds = new Set<string>();

      for (const conversation of conversations) {
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

          members.forEach(member => {
            if (member.user_id && member.user_id !== user.id) {
              uniqueUserIds.add(member.user_id);
            }
          });
        } catch (error) {
        }
      }

      const members: UserModel[] = [];
      for (const userId of uniqueUserIds) {
        try {
          const userRes = await defaultProfileRepo.getProfile(userId);
          if (userRes?.data) {
            members.push(userRes.data);
          }
        } catch (error) {
        }
      }

      setConversationMembers(members);
    } catch (error) {
    }
  }, [user?.id]);

  const loadExistingGroupConversation = async (conversationId: string) => {
    if (!user?.id) return;
    
    try {
      setIsCreatingGroup(true);
      
      const conversation = await getConversationDetails(conversationId);
      
      if (conversation) {
        const isGroup = await checkIfGroupConversation(conversationId);
        
        if (isGroup) {
          const members = await fetchGroupMembers(conversationId);
          setGroupMembers(members);
          
          const groupInfo: GroupChatInfo = {
            id: conversationId,
            name: conversation.name || "Group Chat",
            image: conversation.image || "https://via.placeholder.com/40",
            isGroup: true,
            members: members
          };
          
          setActiveGroup(groupInfo);
          
          const virtualFriend: FriendResponseModel = {
            id: conversationId,
            name: conversation.name || "Group Chat",
            family_name: "",
            avatar_url: conversation.image || "https://via.placeholder.com/40"
          };
          
          Object.defineProperty(virtualFriend, 'isGroup', { value: true });
          Object.defineProperty(virtualFriend, 'groupMembers', { value: members });
          
          setActiveFriend(virtualFriend);
        } else {
          const friend = await findFriendByConversationId(conversationId);
          if (friend) {
            setActiveFriend(friend);
          }
        }
      }
    } catch (error) {
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const getConversationDetails = async (conversationId: string) => {
    try {
      const response = await defaultMessagesRepo.getConversationById({
        conversation_id: conversationId
      });
      
      if (response.data) {
        return response.data;
      }
    } catch (error) {
    }
    
    return null;
  };

  const checkIfGroupConversation = async (conversationId: string) => {
    try {
      const response = await defaultMessagesRepo.getConversationDetailByUserID({
        conversation_id: conversationId
      });
      
      if (response.data) {
        const members = Array.isArray(response.data) ? response.data : [response.data];
        return members.length > 2;
      }
    } catch (error) {
    }
    
    return false;
  };

  const fetchGroupMembers = async (conversationId: string): Promise<GroupMember[]> => {
    try {
      const response = await defaultMessagesRepo.getConversationDetailByUserID({
        conversation_id: conversationId
      });
      
      if (response.data) {
        const details = Array.isArray(response.data) ? response.data : [response.data];
        const members: GroupMember[] = [];
        
        for (const detail of details) {
          if (detail.user_id) {
            try {
              const userResponse = await defaultProfileRepo.getProfile(detail.user_id);
              
              if (userResponse.data) {
                members.push({
                  id: userResponse.data.id || "",
                  name: userResponse.data.name,
                  family_name: userResponse.data.family_name,
                  avatar_url: userResponse.data.avatar_url
                });
              }
            } catch (error) {
            }
          }
        }
        
        return members;
      }
    } catch (error) {
    }
    
    return [];
  };

  useEffect(() => {
    if (user?.id) {
      fetchConversationMembers();
    }
  }, [user?.id, fetchConversationMembers]);

  const handleGroupCreation = useCallback(async (memberIds: string[]) => {
    if (!user?.id) {
      return;
    }

    if (memberIds.length < 3) {
      setGroupError(localStrings.Messages.GroupMinimumMembers || "Group chat must have at least 3 members");
      return;
    }

    try {
      setIsCreatingGroup(true);
      setGroupError(null);

      const sortedMemberIds = [...memberIds].sort();

      const existingGroupId = await findExistingGroupConversation(sortedMemberIds);
      
      if (existingGroupId) {
        router.push(`/messages?conversation=${existingGroupId}`);
        return;
      }

      const conversationId = await createNewGroupConversation(sortedMemberIds);
      
      if (conversationId) {
        router.push(`/messages?conversation=${conversationId}`);
      } else {
        setGroupError(localStrings.Messages.GroupCreationFailed || "Failed to create group chat");
      }
    } catch (error) {
      setGroupError(localStrings.Messages.GroupCreationFailed || "Failed to create group chat");
    } finally {
      setIsCreatingGroup(false);
      
      const newUrl = pathname;
      router.replace(newUrl);
    }
  }, [user, router, pathname, localStrings]);

  const findExistingGroupConversation = async (memberIds: string[]): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const userConversationsRes = await defaultMessagesRepo.getConversations({
        limit: 100,
        page: 1
      });

      if (!userConversationsRes.data) return null;

      const userConversations = Array.isArray(userConversationsRes.data) 
        ? userConversationsRes.data 
        : [userConversationsRes.data];

      for (const conversation of userConversations) {
        if (!conversation.id) continue;

        const membersRes = await defaultMessagesRepo.getConversationDetailByID({
          conversationId: conversation.id,
          userId: user.id
        });

        if (!membersRes.data) continue;

        const conversationMembers = Array.isArray(membersRes.data) 
          ? membersRes.data 
          : [membersRes.data];

        const memberUserIds = conversationMembers
          .map(member => member.user_id)
          .filter(Boolean) as string[];

        if (memberIds.length === memberUserIds.length) {
          const allMembersMatch = memberIds.every(id => 
            memberUserIds.includes(id)
          );
          
          if (allMembersMatch) {
            return conversation.id;
          }
        }
      }
    } catch (error) {
    }

    return null;
  };

  const createNewGroupConversation = async (memberIds: string[]): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      let memberNames: string[] = [];
      const memberProfiles: GroupMember[] = [];
      
      for (const id of memberIds) {
        if (id === user.id) {
          memberNames.push(`${localStrings.Messages.You}`);
          memberProfiles.push({
            id: user.id,
            name: user.name,
            family_name: user.family_name,
            avatar_url: user.avatar_url
          });
          continue;
        }
        
        try {
          const profileRes = await defaultProfileRepo.getProfile(id);
          if (profileRes?.data) {
            memberNames.push(`${profileRes.data.family_name || ""} ${profileRes.data.name || ""}`.trim());
            memberProfiles.push({
              id: profileRes.data.id || "",
              name: profileRes.data.name,
              family_name: profileRes.data.family_name,
              avatar_url: profileRes.data.avatar_url
            });
          }
        } catch (error) {
          memberNames.push(localStrings.Public.UnknownUser || "Unknown User");
        }
      }

      let groupName = "";
      if (memberNames.length <= 3) {
        groupName = memberNames.join(", ");
      } else {
        groupName = `${memberNames.slice(0, 3).join(", ")} ${localStrings.Public.More || "and more"}...`;
      }

      if (groupName.length > 50) {
        groupName = groupName.substring(0, 47) + "...";
      }

      const conversationRes = await defaultMessagesRepo.createConversation({
        name: groupName,
        image: "https://via.placeholder.com/40"
      });

      if (!conversationRes.data?.id) {
        throw new Error("Could not create group conversation");
      }

      const conversationId = conversationRes.data.id;

      for (const memberId of memberIds) {
        await defaultMessagesRepo.createConversationDetail({
          conversation_id: conversationId,
          user_id: memberId
        });
      }
      
      setGroupMembers(memberProfiles);
      
      return conversationId;
    } catch (error) {
      return null;
    }
  };

  return {
    isCreatingGroup,
    groupError,
    handleGroupCreation,
    findExistingGroupConversation,
    conversationMembers,
    fetchConversationMembers,
    groupName,
    setGroupName,
    groupMembers,
    setGroupMembers,
    loadExistingGroupConversation,
    fetchGroupMembers,
    activeGroup
  };
};