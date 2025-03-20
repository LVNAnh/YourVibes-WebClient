import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationDetailResponseModel } from "@/api/features/messages/models/ConversationDetailModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { UserModel } from "@/api/features/authenticate/model/LoginModel";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { useAuth } from "@/context/auth/useAuth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export const useGroupConversationManager = () => {
  const { user, localStrings } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [conversationMembers, setConversationMembers] = useState<UserModel[]>([]);

  useEffect(() => {
    const members = searchParams?.get("members");
    if (members) {
      handleGroupCreation(members.split(","));
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
          console.error(`Lỗi khi lấy thành viên cho cuộc trò chuyện ${conversation.id}`, error);
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
          console.error(`Lỗi khi lấy thông tin người dùng ${userId}`, error);
        }
      }

      setConversationMembers(members);
      console.log(`Đã tìm thấy ${members.length} người dùng trong các cuộc trò chuyện`);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên các cuộc trò chuyện", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchConversationMembers();
    }
  }, [user?.id, fetchConversationMembers]);

  const handleGroupCreation = useCallback(async (memberIds: string[]) => {
    if (!user?.id) {
      console.error("Không thể tạo nhóm: Người dùng chưa đăng nhập");
      return;
    }

    if (memberIds.length < 3) {
      setGroupError(localStrings.Messages.GroupMinimumMembers || "Nhóm chat phải có ít nhất 3 thành viên");
      return;
    }

    try {
      setIsCreatingGroup(true);
      setGroupError(null);

      const sortedMemberIds = [...memberIds].sort();

      const existingGroupId = await findExistingGroupConversation(sortedMemberIds);
      
      if (existingGroupId) {
        console.log("Đã tìm thấy nhóm chat hiện có với các thành viên tương tự:", existingGroupId);
        router.push(`/messages?conversation=${existingGroupId}`);
        return;
      }

      const conversationId = await createNewGroupConversation(sortedMemberIds);
      
      if (conversationId) {
        console.log("Đã tạo nhóm chat mới với ID:", conversationId);
        router.push(`/messages?conversation=${conversationId}`);
      } else {
        setGroupError(localStrings.Messages.GroupCreationFailed || "Không thể tạo nhóm chat");
      }
    } catch (error) {
      console.error("Lỗi khi tạo nhóm chat:", error);
      setGroupError(localStrings.Messages.GroupCreationFailed || "Không thể tạo nhóm chat");
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

        const sortedConversationMemberIds = [...memberUserIds].sort();

        if (memberIds.length === sortedConversationMemberIds.length &&
            JSON.stringify(memberIds) === JSON.stringify(sortedConversationMemberIds)) {
          return conversation.id;
        }
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm cuộc trò chuyện nhóm hiện có:", error);
    }

    return null;
  };

  const createNewGroupConversation = async (memberIds: string[]): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      let memberNames: string[] = [];
      for (const id of memberIds) {
        if (id === user.id) {
          memberNames.push(`Bạn`);
          continue;
        }
        
        try {
          const profileRes = await defaultProfileRepo.getProfile(id);
          if (profileRes?.data) {
            memberNames.push(profileRes.data.name || "Người dùng");
          }
        } catch (error) {
          console.error(`Không thể lấy thông tin cho người dùng ${id}`, error);
          memberNames.push("Người dùng");
        }
      }

      let groupName = "";
      if (memberNames.length <= 3) {
        groupName = memberNames.join(", ");
      } else {
        groupName = `vip`;
      }

      if (groupName.length > 50) {
        groupName = groupName.substring(0, 47) + "...";
      }

      const conversationRes = await defaultMessagesRepo.createConversation({
        name: groupName
      });

      if (!conversationRes.data?.id) {
        throw new Error("Không thể tạo cuộc trò chuyện nhóm");
      }

      const conversationId = conversationRes.data.id;

      for (const memberId of memberIds) {
        await defaultMessagesRepo.createConversationDetail({
          conversation_id: conversationId,
          user_id: memberId
        });
      }

      return conversationId;
    } catch (error) {
      console.error("Lỗi khi tạo nhóm chat mới:", error);
      return null;
    }
  };

  return {
    isCreatingGroup,
    groupError,
    handleGroupCreation,
    findExistingGroupConversation,
    conversationMembers,
    fetchConversationMembers
  };
};