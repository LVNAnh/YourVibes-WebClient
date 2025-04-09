"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Avatar, Button, Card, Dropdown, Menu, Modal, Spin, message } from "antd";
import { useRouter } from "next/navigation";
import { UsergroupAddOutlined, MoreOutlined } from "@ant-design/icons";
import { defaultNewFeedRepo } from "@/api/features/newFeed/NewFeedRepo";
import { SuggestionUserModel, NewFeedRequestModel } from "@/api/features/newFeed/Model/NewFeedModel";
import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
import { useAuth } from "@/context/auth/useAuth";
import { FriendStatus } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { FaUserPlus, FaUserCheck } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";

interface FriendSuggestionsProps {
  postIndex: number;
}

interface FriendSuggestionWithStatus extends SuggestionUserModel {
  friendStatus: FriendStatus;
  hidden?: boolean;
}

const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ postIndex }) => {
  const router = useRouter();
  const { localStrings } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isWhyModalVisible, setIsWhyModalVisible] = useState(false);
  const [friendSuggestions, setFriendSuggestions] = useState<FriendSuggestionWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendRequestLoading, setFriendRequestLoading] = useState<Record<string, boolean>>({});

  // Lấy danh sách gợi ý khi component khởi tạo
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Memoized fetch function
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const requestData: NewFeedRequestModel = { limit: 10, page: 1 };
      const response = await defaultNewFeedRepo.getSuggestion(requestData);
      if (response.code === 20001) {
        const suggestionsWithStatus = response.data.map((suggestion: SuggestionUserModel) => ({
          ...suggestion,
          friendStatus: suggestion.is_send_friend_request
            ? FriendStatus.SendFriendRequest
            : (suggestion as any).friend_status || FriendStatus.NotFriend,
          hidden: false,
        }));
        setFriendSuggestions(suggestionsWithStatus);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      message.error(error?.error?.message_detail || error?.message || "Failed to fetch suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized friend request handlers
  const handleFriendRequest = useCallback(
    async (userId: string, action: "send" | "cancel" | "accept" | "refuse") => {
      setFriendRequestLoading((prev) => ({ ...prev, [userId]: true }));
      try {
        let response;
        switch (action) {
          case "send":
            response = await defaultProfileRepo.sendFriendRequest(userId);
            if (response.code === 20001) {
              message.success(localStrings.Profile.Friend.SendRequestSuccess);
              setFriendSuggestions((prev) =>
                prev.map((s) =>
                  s.id === userId ? { ...s, friendStatus: FriendStatus.SendFriendRequest, is_send_friend_request: true } : s
                )
              );
            }
            break;
          case "cancel":
            response = await defaultProfileRepo.cancelFriendRequest(userId);
            if (response.code === 20001) {
              message.success(`${localStrings.Public.CancelFriendRequest} success`);
              setFriendSuggestions((prev) =>
                prev.map((s) =>
                  s.id === userId ? { ...s, friendStatus: FriendStatus.NotFriend, is_send_friend_request: false } : s
                )
              );
            }
            break;
          case "accept":
            response = await defaultProfileRepo.acceptFriendRequest(userId);
            if (response.code === 20001) {
              message.success("Friend request accepted");
              setFriendSuggestions((prev) =>
                prev.map((s) => (s.id === userId ? { ...s, friendStatus: FriendStatus.IsFriend } : s))
              );
            }
            break;
          case "refuse":
            response = await defaultProfileRepo.refuseFriendRequest(userId);
            if (response.code === 20001) {
              setFriendSuggestions((prev) =>
                prev.map((s) => (s.id === userId ? { ...s, hidden: true } : s))
              );
            }
            break;
        }
        if (response?.code !== 20001) throw new Error(response?.error?.message_detail || response?.message);
      } catch (error: any) {
        message.error(error?.message || "Action failed");
      } finally {
        setFriendRequestLoading((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [localStrings]
  );

  const handleRemoveSuggestion = useCallback((userId: string) => {
    setFriendSuggestions((prev) =>
      prev.map((suggestion) => (suggestion.id === userId ? { ...suggestion, hidden: true } : suggestion))
    );
  }, []);

  const renderFriendButton = useCallback(
    (suggestion: FriendSuggestionWithStatus) => {
      const userId = suggestion.id!;
      const isLoading = friendRequestLoading[userId];

      const buttonStyles = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        padding: "0 10px",
        whiteSpace: "nowrap",
      };

      switch (suggestion.friendStatus) {
        case FriendStatus.NotFriend:
          return (
            <Button
              type="primary"
              block
              loading={isLoading}
              onClick={() => handleFriendRequest(userId, "send")}
              style={{ height: "36px" }}
            >
              <div style={buttonStyles}>
                <FaUserPlus size={16} />
                <span>{localStrings.Suggested.AddFriend}</span>
              </div>
            </Button>
          );
        case FriendStatus.IsFriend:
          return (
            <Button
              type="primary"
              block
              disabled
              style={{ height: "36px" }}
            >
              <div style={buttonStyles}>
                <FaUserCheck size={16} />
                <span>{localStrings.Public.Friend}</span>
              </div>
            </Button>
          );
        case FriendStatus.SendFriendRequest:
          return (
            <Button
              type="default"
              block
              loading={isLoading}
              onClick={() => handleFriendRequest(userId, "cancel")}
              style={{ height: "36px" }}
            >
              <div style={buttonStyles}>
                <RxCross2 size={16} />
                <span>{localStrings.Public.CancelFriendRequest}</span>
              </div>
            </Button>
          );
        case FriendStatus.ReceiveFriendRequest:
          return (
            <div style={{ display: "flex", gap: "5px" }}>
              <Button
                type="primary"
                block
                loading={isLoading}
                onClick={() => handleFriendRequest(userId, "accept")}
                style={{ height: "36px" }}
              >
                {localStrings.Public.AcceptFriendRequest}
              </Button>
              <Button
                block
                onClick={() => handleFriendRequest(userId, "refuse")}
                style={{ height: "36px" }}
              >
                {localStrings.Public.RefuseFriendRequest}
              </Button>
            </div>
          );
        default:
          return null;
      }
    },
    [friendRequestLoading, localStrings, handleFriendRequest]
  );

  const menu = (
    <Menu
      onClick={({ key }) => {
        if (key === "1") setIsWhyModalVisible(true);
        if (key === "2") {
          setFriendSuggestions((prev) => prev.map((s) => ({ ...s, hidden: true })));
          fetchSuggestions();
        }
      }}
    >
      <Menu.Item key="1">{localStrings.Suggested.Why}</Menu.Item>
      <Menu.Item key="2">{localStrings.Suggested.Dont}</Menu.Item>
    </Menu>
  );

  if (postIndex >= 5 || (!loading && friendSuggestions.every((s) => s.hidden))) return null;

  return (
    <div className="friend-suggestions" style={{ padding: "15px", background: "#fff", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", marginTop: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UsergroupAddOutlined style={{ fontSize: "18px" }} />
          <h3 style={{ margin: 0, fontWeight: "bold" }}>{localStrings.Suggested.SuggestedFriends}</h3>
        </div>
        <Dropdown overlay={menu} trigger={["click"]}>
          <MoreOutlined style={{ fontSize: "20px", cursor: "pointer" }} />
        </Dropdown>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", overflowX: "auto", gap: "10px", paddingBottom: "10px" }}>
            {friendSuggestions
              .filter((s) => !s.hidden)
              .map((suggestion) => (
                <Card
                  key={suggestion.id}
                  hoverable
                  style={{ width: 175, textAlign: "center", borderRadius: "10px", padding: "10px", flexShrink: 0 }}
                >
                  <div
                    onClick={() => router.push(`/user/${suggestion.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Avatar
                      src={suggestion.avatar_url}
                      size={64}
                      style={{ marginBottom: "10px" }}
                    />
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: "5px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {suggestion.family_name} {suggestion.name}
                    </p>
                  </div>
                  {renderFriendButton(suggestion)}
                  <Button block style={{ marginTop: "5px" }} onClick={() => handleRemoveSuggestion(suggestion.id!)}>
                    {localStrings.Suggested.Hide}
                  </Button>
                </Card>
              ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <Button type="link" onClick={() => setIsModalVisible(true)}>
              {localStrings.Suggested.SeeMore}
            </Button>
          </div>

          <Modal
            title={localStrings.Suggested.SuggestedFriends}
            open={isModalVisible}
            onOk={() => setIsModalVisible(false)}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {friendSuggestions
                .filter((s) => !s.hidden)
                .map((suggestion) => (
                  <Card
                    key={suggestion.id}
                    hoverable
                    style={{ width: 175, textAlign: "center", borderRadius: "10px", padding: "10px" }}
                  >
                    <Avatar src={suggestion.avatar_url} size={64} style={{ marginBottom: "10px" }} />
                    <p style={{ fontWeight: "bold", margin: "5px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {suggestion.family_name} {suggestion.name}
                    </p>
                    {renderFriendButton(suggestion)}
                    <Button block style={{ marginTop: "5px" }} onClick={() => handleRemoveSuggestion(suggestion.id!)}>
                      {localStrings.Suggested.Hide}
                    </Button>
                  </Card>
                ))}
            </div>
          </Modal>

          <Modal
            title={localStrings.Suggested.Why}
            open={isWhyModalVisible}
            onOk={() => setIsWhyModalVisible(false)}
            onCancel={() => setIsWhyModalVisible(false)}
          >
            <p>{localStrings.Suggested.WhyExplanation}</p>
            <ul>
              <li>{localStrings.Suggested.WhyFactor1}</li>
              <li>{localStrings.Suggested.WhyFactor2}</li>
              <li>{localStrings.Suggested.WhyFactor3}</li>
            </ul>
            <p>{localStrings.Suggested.WhyConclusion}</p>
          </Modal>
        </>
      )}
    </div>
  );
};

export default FriendSuggestions;