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

  // Khi component mount, kiểm tra xem có tham số members không
  useEffect(() => {
    const members = searchParams?.get("members");
    if (members) {
      handleGroupCreation(members.split(","));
    }
  }, [searchParams]);

  // Lấy danh sách tất cả người dùng trong các cuộc trò chuyện
  const fetchConversationMembers = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Lấy tất cả các cuộc trò chuyện của người dùng
      const conversationsRes = await defaultMessagesRepo.getConversations({
        limit: 100,
        page: 1
      });

      if (!conversationsRes.data) return;

      const conversations = Array.isArray(conversationsRes.data) 
        ? conversationsRes.data 
        : [conversationsRes.data];

      // Tạo set để lưu các ID người dùng duy nhất
      const uniqueUserIds = new Set<string>();

      // Lặp qua từng cuộc trò chuyện để lấy thành viên
      for (const conversation of conversations) {
        if (!conversation.id) continue;

        try {
          // Lấy chi tiết các thành viên
          const membersRes = await defaultMessagesRepo.getConversationDetailByID({
            conversationId: conversation.id,
            userId: user.id
          });

          if (!membersRes.data) continue;

          const members = Array.isArray(membersRes.data) 
            ? membersRes.data 
            : [membersRes.data];

          // Lưu ID của các thành viên (trừ người dùng hiện tại)
          members.forEach(member => {
            if (member.user_id && member.user_id !== user.id) {
              uniqueUserIds.add(member.user_id);
            }
          });
        } catch (error) {
          console.error(`Lỗi khi lấy thành viên cho cuộc trò chuyện ${conversation.id}`, error);
        }
      }

      // Lấy thông tin chi tiết của các thành viên
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

  // Lấy danh sách thành viên khi component mount
  useEffect(() => {
    if (user?.id) {
      fetchConversationMembers();
    }
  }, [user?.id, fetchConversationMembers]);

  // Xử lý tạo nhóm chat từ danh sách thành viên
  const handleGroupCreation = useCallback(async (memberIds: string[]) => {
    if (!user?.id) {
      console.error("Không thể tạo nhóm: Người dùng chưa đăng nhập");
      return;
    }

    // Kiểm tra xem có đủ thành viên không (ít nhất 3 người bao gồm người tạo)
    if (memberIds.length < 3) {
      setGroupError(localStrings.Messages.GroupMinimumMembers || "Nhóm chat phải có ít nhất 3 thành viên");
      return;
    }

    try {
      setIsCreatingGroup(true);
      setGroupError(null);

      // Sắp xếp ID thành viên để đảm bảo so sánh nhất quán
      const sortedMemberIds = [...memberIds].sort();

      // Kiểm tra xem đã có cuộc trò chuyện nhóm với các thành viên tương tự không
      const existingGroupId = await findExistingGroupConversation(sortedMemberIds);
      
      if (existingGroupId) {
        console.log("Đã tìm thấy nhóm chat hiện có với các thành viên tương tự:", existingGroupId);
        // Chuyển hướng đến nhóm chat hiện có
        router.push(`/messages?conversation=${existingGroupId}`);
        return;
      }

      // Tạo cuộc trò chuyện nhóm mới
      const conversationId = await createNewGroupConversation(sortedMemberIds);
      
      if (conversationId) {
        console.log("Đã tạo nhóm chat mới với ID:", conversationId);
        // Chuyển hướng đến nhóm chat mới
        router.push(`/messages?conversation=${conversationId}`);
      } else {
        setGroupError(localStrings.Messages.GroupCreationFailed || "Không thể tạo nhóm chat");
      }
    } catch (error) {
      console.error("Lỗi khi tạo nhóm chat:", error);
      setGroupError(localStrings.Messages.GroupCreationFailed || "Không thể tạo nhóm chat");
    } finally {
      setIsCreatingGroup(false);
      
      // Xóa tham số members khỏi URL để tránh tạo lại nhóm khi tải lại trang
      const newUrl = pathname;
      router.replace(newUrl);
    }
  }, [user, router, pathname, localStrings]);

  // Tìm kiếm cuộc trò chuyện nhóm hiện có với danh sách thành viên chính xác
  const findExistingGroupConversation = async (memberIds: string[]): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      // Lấy tất cả các cuộc trò chuyện của người dùng
      const userConversationsRes = await defaultMessagesRepo.getConversations({
        limit: 100,
        page: 1
      });

      if (!userConversationsRes.data) return null;

      // Đảm bảo dữ liệu trả về là mảng
      const userConversations = Array.isArray(userConversationsRes.data) 
        ? userConversationsRes.data 
        : [userConversationsRes.data];

      // Kiểm tra từng cuộc trò chuyện
      for (const conversation of userConversations) {
        if (!conversation.id) continue;

        // Lấy tất cả thành viên của cuộc trò chuyện này
        const membersRes = await defaultMessagesRepo.getConversationDetailByID({
          conversationId: conversation.id,
          userId: user.id
        });

        if (!membersRes.data) continue;

        // Đảm bảo dữ liệu trả về là mảng
        const conversationMembers = Array.isArray(membersRes.data) 
          ? membersRes.data 
          : [membersRes.data];

        // Lấy danh sách user_id của tất cả thành viên
        const memberUserIds = conversationMembers
          .map(member => member.user_id)
          .filter(Boolean) as string[];

        // Sắp xếp ID để so sánh nhất quán
        const sortedConversationMemberIds = [...memberUserIds].sort();

        // So sánh danh sách thành viên
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

  // Tạo nhóm chat mới
  const createNewGroupConversation = async (memberIds: string[]): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      // Lấy thông tin chi tiết của các thành viên để đặt tên nhóm
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

      // Tạo tên cho nhóm chat dựa trên tên của các thành viên
      let groupName = "";
      if (memberNames.length <= 3) {
        groupName = memberNames.join(", ");
      } else {
        // Nếu có quá nhiều thành viên, chỉ hiển thị 2 người đầu tiên + số người còn lại
        groupName = `vip`;
      }

      // Giới hạn độ dài tên nhóm
      if (groupName.length > 50) {
        groupName = groupName.substring(0, 47) + "...";
      }

      // Tạo cuộc trò chuyện mới
      const conversationRes = await defaultMessagesRepo.createConversation({
        name: groupName
      });

      if (!conversationRes.data?.id) {
        throw new Error("Không thể tạo cuộc trò chuyện nhóm");
      }

      const conversationId = conversationRes.data.id;

      // Thêm tất cả thành viên vào nhóm
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