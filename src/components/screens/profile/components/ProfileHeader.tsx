"use client";
import { UserModel } from "@/api/features/authenticate/model/LoginModel";
import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";
import React, { useCallback, useEffect, useState } from "react";
import UserProfileViewModel from "../viewModel/UserProfileViewModel";
import { FriendStatus } from "@/api/baseApiResponseModel/baseApiResponseModel";
import {
  Avatar,
  Button,
  Col,
  Dropdown,
  Image,
  MenuProps,
  Modal,
  Row,
} from "antd";
import { FaUserCheck, FaUserPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { useRouter } from "next/navigation";
import ReportViewModel from "../../report/ViewModel/reportViewModel";
import ReportScreen from "../../report/views/Report";
import { IoFlagSharp } from "react-icons/io5";
import UpdateProfileViewModel from "../../updateProfile/viewModel/UpdateProfileViewModel";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { MessageOutlined } from "@ant-design/icons";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { CreateConversationRequestModel } from "@/api/features/messages/models/ConversationModel";
import { 
  UpdateConversationDetailRequestModel, 
  GetConversationDetailByUserIDRequestModel 
} from "@/api/features/messages/models/ConversationDetailModel";

const ProfileHeader = ({
  total,
  user,
  friendCount,
  fetchUserProfile,
}: {
  total: number;
  user: UserModel;
  loading: boolean;
  friendCount: number;
  fetchUserProfile: (id: string) => void;
}) => {
  const { lightGray, brandPrimary, backgroundColor } = useColor();
  const { localStrings, language, isLoginUser, user: currentUser } = useAuth();
  const router = useRouter();
  const { showModal, setShowModal } = ReportViewModel();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { objectPosition, setObjectPosition } = UpdateProfileViewModel(defaultProfileRepo);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  useEffect(() => {
    const savedPosition = localStorage.getItem("capwallPosition");
    if (savedPosition) {
      setObjectPosition(savedPosition);
    }
  }, []);

  const {
    sendFriendRequest,
    sendRequestLoading,
    refuseFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    unFriend,
    newFriendStatus,
    setNewFriendStatus,
  } = UserProfileViewModel();

  const itemsFriend: MenuProps["items"] = [
    {
      key: "1",
      label: localStrings.Public.UnFriend,
      type: "item",
      onClick: () => {
        Modal.confirm({
          centered: true,
          title: localStrings.Public.Confirm,
          content: localStrings.Profile.Friend.UnfriendConfirm,
          okText: localStrings.Public.Confirm,
          cancelText: localStrings.Public.Cancel,
          onOk: async () => {
            await unFriend(user?.id as string);
            fetchUserProfile(user?.id as string);
          },
        });
      },
    },
    {
      key: "2",
      label: localStrings.Public.Cancel,
      type: "item",
      onClick: () => {},
    },
  ];

  const handleMessageClick = async () => {
    if (!currentUser?.id || !user?.id) return;

    setIsLoadingMessage(true);
    try { 
      const createConversationData: CreateConversationRequestModel = {
        name: `${currentUser.name} - ${user.name}`,
        user_ids: [currentUser.id, user.id],
      };

      const createResponse = await defaultMessagesRepo.createConversation(createConversationData);
      
      if (createResponse.code === 20001 && createResponse.data?.id) { 
        const updateConversationDetailData: UpdateConversationDetailRequestModel = {
          conversation_id: createResponse.data.id,
          user_id: currentUser.id,
        };
        await defaultMessagesRepo.updateConversationDetail(updateConversationDetailData);
 
        const getMessagesData: GetConversationDetailByUserIDRequestModel = {
          conversation_id: createResponse.data.id,
          limit: 20,
          page: 1,
        };
        const messagesResponse = await defaultMessagesRepo.getMessagesByConversationId({
          ...getMessagesData,
          sort_by: "created_at",
          is_descending: true,
        });
 
        router.push(`/messages?conversation_id=${createResponse.data.id}`);
      }
      else{
        if(createResponse?.error?.message === 'Conversation has already exist'){
          const existingConversationId = createResponse?.error?.message_detail;
          router.push(`/messages?conversation_id=${existingConversationId}`);
        }
      }
    } catch (error: any) {
      if (error.response?.data?.error?.code === 50028) { 
        const existingConversationId = error.response.data.error.message_detail;
        router.push(`/messages?conversation_id=${existingConversationId}`);
      } else {
        console.error("Error creating conversation:", error);
      }
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const renderFriendButton = useCallback(() => {
    switch (newFriendStatus) {
      case FriendStatus.NotFriend:
        return (
          <Button
            type="default"
            onClick={() => {
              sendFriendRequest(user?.id as string);
            }}
          >
            <div className="flex flex-row items-center">
              <FaUserPlus name="user-plus" size={16} color={brandPrimary} />
              <text
                style={{
                  color: brandPrimary,
                  fontSize: 16,
                  fontWeight: "bold",
                  marginLeft: 5,
                }}
              >
                {localStrings.Public.AddFriend}
              </text>
            </div>
          </Button>
        );
      case FriendStatus.IsFriend:
        return (
          <Dropdown menu={{ items: itemsFriend }} placement="bottom" arrow>
            <Button type="primary">
              <div className="flex flex-row items-center">
                <FaUserCheck
                  name="user-check"
                  size={16}
                  color={backgroundColor}
                />
                <text
                  style={{
                    color: backgroundColor,
                    fontSize: 16,
                    fontWeight: "bold",
                    marginLeft: 5,
                  }}
                >
                  {localStrings.Public.Friend}
                </text>
              </div>
            </Button>
          </Dropdown>
        );
      case FriendStatus.SendFriendRequest:
        return (
          <div className="flex flex-col items-center">
            <text
              style={{
                marginBottom: 10,
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              {localStrings.Profile.Friend.SendARequest}
            </text>
            <Button
              type="default"
              onClick={() => {
                cancelFriendRequest(user?.id as string);
              }}
              loading={sendRequestLoading}
            >
              <div className="flex flex-row items-center">
                <RxCross2 name="cross" size={24} color={brandPrimary} />
                <span>{localStrings.Public.CancelFriendRequest}</span>
              </div>
            </Button>
          </div>
        );
      case FriendStatus.ReceiveFriendRequest:
        return (
          <div style={{ marginTop: 10 }}>
            <text
              style={{
                marginBottom: 10,
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              {localStrings.Profile.Friend.SendYouARequest}
            </text>
            <div
              style={{
                flexDirection: "row",
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Button
                style={{ width: "48%" }}
                type="primary"
                onClick={async () => {
                  await acceptFriendRequest(user?.id as string);
                  fetchUserProfile(user?.id as string);
                }}
                loading={sendRequestLoading}
              >
                {localStrings.Public.AcceptFriendRequest}
              </Button>
              <Button
                style={{ width: "48%" }}
                type="default"
                onClick={() => {
                  refuseFriendRequest(user?.id as string);
                }}
              >
                {localStrings.Public.RefuseFriendRequest}
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <Button type="default" onClick={() => {}}>
            <text style={{ color: brandPrimary, fontSize: 16 }}>
              {localStrings.Public.AddFriend}
            </text>
          </Button>
        );
    }
  }, [newFriendStatus, localStrings, sendRequestLoading]);

  useEffect(() => {
    if (user) setNewFriendStatus(user?.friend_status);
  }, [user]);

  return (
    <div className="md:mx-16 xl:mx-32">
      <>
        {/* Cover Image */}
        <div style={{ backgroundColor: lightGray }}>
          <Image
            src={user?.capwall_url}
            alt="Cover"
            className="w-full md:max-h-[375px] max-h-[250px] object-cover"
            width="100%"
            style={{ objectPosition: objectPosition }}
          />
        </div>

        {/* Profile Image */}
        <Row className="mt-[-60px]">
          {/* Avatar */}
          <Col xs={24} md={18}>
            <Row justify={"space-between"}>
              <Col
                xs={24}
                md={10}
                xl={8}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Image.PreviewGroup
                  preview={{
                    visible: isPreviewOpen,
                    onVisibleChange: (visible) => setIsPreviewOpen(visible),
                  }}
                >
                  <Image
                    src={
                      user?.avatar_url ||
                      "https://static2.yan.vn/YanNews/2167221/202102/facebook-cap-nhat-avatar-doi-voi-tai-khoan-khong-su-dung-anh-dai-dien-e4abd14d.jpg"
                    }
                    style={{ display: "none" }}
                  />
                </Image.PreviewGroup>

                <Avatar
                  src={
                    user?.avatar_url ||
                    "https://static2.yan.vn/YanNews/2167221/202102/facebook-cap-nhat-avatar-doi-voi-tai-khoan-khong-su-dung-anh-dai-dien-e4abd14d.jpg"
                  }
                  alt="Profile"
                  shape="circle"
                  size={{
                    xs: 150,
                    sm: 150,
                    md: 200,
                    lg: 200,
                    xl: 200,
                    xxl: 200,
                  }}
                  style={{
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    border: "2px solid #f0f0f0",
                    cursor: "pointer",
                  }}
                  onClick={() => setIsPreviewOpen(true)}
                />
              </Col>
              <Col xs={24} md={14} xl={16} className="md:mt-[60px] mt-0 pl-4">
                <div className="md:text-left text-center mt-2">
                  <text className="text-lg font-bold">
                    {`${user?.family_name} ${user?.name}` ||
                      localStrings.Public.Username}
                  </text>
                  <p className="text-gray-500 mt-1 md:text-left text-center">
                    {user?.biography || localStrings.Public.Biography}
                  </p>
                  <div className="flex md:justify-start justify-center mt-2">
                    <text className="font-bold md:text-left text-center">
                      {total || user?.post_count} {localStrings.Public.Post}
                      {language === "en" &&
                      (total || user?.post_count) &&
                      ((total && total > 1) ||
                        (user?.post_count && user?.post_count > 1))
                        ? "s"
                        : ""}
                    </text>
                    <text className="font-bold md:text-left text-center ml-8">
                      {friendCount} {localStrings.Public.Friend}
                    </text>
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
          {/* User Information */}
          <Col xs={24} md={6} className="md:mt-[60px] mt-0 pt-2 flex items-end">
            <div className="w-full flex justify-center md:justify-end flex-row">
              {/* Friend Button */}
              {!isLoginUser(user?.id as string) ? (
                <>
                  <span className="mr-4">{renderFriendButton()}</span>

                  {/* Message Button */}
                  <Button
                    type="default"
                    onClick={handleMessageClick}
                    icon={<MessageOutlined />}
                    loading={isLoadingMessage}
                    style={{ marginRight: 8, border: "1px solid #ccc" }}
                  >
                    <span className="font-bold text-base">
                      {localStrings.Public.Message || "Message"}
                    </span>
                  </Button>

                  <Button
                    type="primary"
                    ghost
                    onClick={() => setShowModal(true)}
                    icon={<IoFlagSharp />}
                  >
                    <span className="font-bold text-base">
                      {localStrings.Public.ReportFriend}
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  type="primary"
                  ghost
                  onClick={() => router.push("/updateProfile")}
                >
                  <span className="font-bold text-base">
                    {localStrings.Public.EditProfile}
                  </span>
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </>
      <Modal
        centered
        title={localStrings.Public.ReportFriend}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
      >
        <ReportScreen userId={user?.id} setShowModal={setShowModal} />
      </Modal>
    </div>
  );
};

export default ProfileHeader;