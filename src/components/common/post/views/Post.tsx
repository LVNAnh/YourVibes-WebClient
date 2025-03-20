"use client";
import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { PostResponseModel } from "@/api/features/post/models/PostResponseModel";
import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";
import {
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Menu,
  MenuProps,
  Modal,
  Popover,
  Row,
  Tooltip,
  Select,
  Input,
  Spin,
} from "antd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaGlobe,
  FaHeart,
  FaLock,
  FaRegComments,
  FaRegHeart,
} from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import { getTimeDiff } from "@/utils/helper/DateTransfer";
import { RiAdvertisementLine } from "react-icons/ri";
import { HiDotsVertical } from "react-icons/hi";
import { BsFillPeopleFill } from "react-icons/bs";
import { IoShareSocialOutline } from "react-icons/io5";
import EditPostViewModel from "@/components/features/editpost/viewModel/EditPostViewModel";
import { defaultPostRepo } from "@/api/features/post/PostRepo";
import MediaView from "@/components/foundation/MediaView";
import HomeViewModel from "@/components/screens/home/viewModel/HomeViewModel";
import { defaultNewFeedRepo } from "@/api/features/newFeed/NewFeedRepo";
import EditPostScreen from "@/components/features/editpost/view/EditPostScreen";
import PostDetailsScreen from "@/components/screens/postDetails/view/postDetailsScreen";
import PostDetailsViewModel from "@/components/screens/postDetails/viewModel/postDetailsViewModel";
import { LikeUsersModel } from "@/api/features/post/models/LikeUsersModel";
import ReportViewModel from "@/components/screens/report/ViewModel/reportViewModel";
import ReportScreen from "@/components/screens/report/views/Report";
import ProfileViewModel from "@/components/screens/profile/viewModel/ProfileViewModel";
import { t } from "i18next";

interface IPost {
  post?: PostResponseModel;
  isParentPost?: boolean;
  noFooter?: boolean;
  children?: React.ReactNode;
  noComment?: boolean;
  fetchUserPosts?: () => void;  
  onDeletePost?: (postId: string) => void;
  onDeleteNewFeed?: (postId: string) => void;
}

const Post: React.FC<IPost> = React.memo(
  ({
    post,
    isParentPost = false,
    noFooter = false,
    children,
    noComment = false,
    fetchUserPosts,
    onDeletePost = () => {},
    onDeleteNewFeed = () => {},
  }) => {
    const router = useRouter();
    const { brandPrimary, brandPrimaryTap, lightGray, backgroundColor } =
      useColor();
    const { user, localStrings } = useAuth();
    const [shareForm] = Form.useForm();
    const { showModal, setShowModal } = ReportViewModel();
    const pathname = usePathname();
    // const {fetchUserPosts} = ProfileViewModel();
    const {
      likePost,
      likedPost,
      setLikedPost,
      sharePost,
      shareLoading,
      deletePost,
      fetchUserLikePosts,
      userLikePost,
    } = EditPostViewModel(defaultPostRepo, post?.id || "", post?.id || "");
    const { deleteNewFeed } = HomeViewModel(defaultNewFeedRepo);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [sharePostPrivacy, setSharePostPrivacy] = useState(Privacy.PUBLIC);
    const [shareContent, setShareContent] = useState("");
    const renderPrivacyIcon = () => {
      switch (likedPost?.privacy) {
        case Privacy.PUBLIC:
          return <FaGlobe size={12} color={brandPrimaryTap} />;
        case Privacy.FRIEND_ONLY:
          return <BsFillPeopleFill size={12} color={brandPrimaryTap} />;
        case Privacy.PRIVATE:
          return <FaLock size={12} color={brandPrimaryTap} />;
        default:
          return null;
      }
    };
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLikeClick = useCallback(() => {
      if (likedPost?.id) {
        likePost(likedPost.id);
      }
    }, [likedPost?.id, likePost]);

    const handleSubmitShare = useCallback(() => {
      if (likedPost) {
        // Gọi hàm sharePost để chia sẻ bài viết
        sharePost(likedPost.id!, {
          privacy: sharePostPrivacy,
          content: shareContent,
        })
          .then(() => {
            setIsShareModalVisible(false);
            setShareContent("");
            +       likedPost && (likedPost.privacy = sharePostPrivacy);
          })
          .catch((error) => {
            console.error("Error sharing post:", error);
            // Xử lý lỗi nếu cần
          });
      }
    }, [likedPost, sharePostPrivacy, shareContent, pathname]);

    const renderLikeIcon = () => {
      if (likedPost?.is_liked) {
        return <FaHeart size={24} color={"red"} onClick={handleLikeClick} />;
      } else {
        return (
          <FaRegHeart
            size={24}
            color={brandPrimaryTap}
            onClick={handleLikeClick}
          />
        );
      }
    };

    const items: MenuProps["items"] = useMemo(() => {
      if (user?.id === likedPost?.user?.id)
        return [
          {
            key: "1",
            label: localStrings.Post.EditPost,
            type: "item",
            onClick: async () => {
              if (post && post.id) {
                setIsEditModalVisible(true);
              }
            },
          },
          {
            key: "2",
            label: localStrings.Post.DeletePost,
            type: "item",
            onClick: () => {
              Modal.confirm({
                centered: true,
                title: localStrings.Public.Confirm,
                content: localStrings.DeletePost.DeleteConfirm,
                okText: localStrings.Public.Confirm,
                cancelText: localStrings.Public.Cancel,
                onOk: async () => {
                  await onDeletePost(post?.id as string);
                },
                
                
              });
            },
          },
          {
            key: "3",
            label: localStrings.Post.Advertisement,
            type: "item",
            onClick: () => {
              router.push(`/ads/${post?.id}`);
            },
          },
        ];
      else
        return [
          {
            key: "1",
            label: localStrings.Post.ReportPost,
            type: "item",
            onClick: () => {
              setShowModal(true);
            },
          },
          {
            key: "2",
            label: localStrings.Post.DeleteNewFeed,
            type: "item",
            onClick: () => {
              Modal.confirm({
                centered: true,
                title: localStrings.Public.Confirm,
                content: localStrings.DeletePost.DeleteConfirm,
                okText: localStrings.Public.Confirm,
                cancelText: localStrings.Public.Cancel,
                onOk: () => {onDeleteNewFeed(post?.id as string);},
              });
            },
          },
        ];
    }, [user, likedPost]);

    useEffect(() => {
      setLikedPost(post);
    }, [post]);

    const renderLikedUserItem = useCallback(
      (like: LikeUsersModel) => {
        return (
          <div
            key={like.id}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 10,
              paddingBottom: 10,
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <button
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
              onClick={() => {
                router.push(`/user/${like.id}`);
              }}
            >
              <img
                src={like.avatar_url}
                style={{
                  marginLeft: 10,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#e0e0e0",
                  marginRight: 10,
                }}
                alt={`${like.family_name} ${like.name}`}
              />
              <span style={{ fontSize: 16, color: "black" }}>
                {like.family_name} {like.name}
              </span>
            </button>
          </div>
        );
      },
      [userLikePost]
    );

    useEffect(() => {
      if (isVisible) {
        setIsLoading(true);
        fetchUserLikePosts(likedPost!.id as string).finally(() => {
          setIsLoading(false);
        });
      }
    }, [isVisible, likedPost]);

    return (
      <Card
        style={{
          marginTop: 10,
          borderColor: isParentPost ? brandPrimary : "white",
          maxWidth: 600,
          width: "100%",
        }}
        title={
          <Row
            gutter={[8, 8]}
            className="m-2"
          >
            <Col
              xs={4}
              md={3}
              className="hover:cursor-pointer"
              onClick={() => router.push(`/user/${likedPost?.user?.id}`)}
            >
              <Avatar src={likedPost?.user?.avatar_url} shape="circle" size={{ xs: 40, sm: 40, md: 50, lg: 50, xl: 50, xxl: 50 }} />
            </Col>
            <Col xs={18} md={20}>
              <Row>
                <Col
                  span={24}
                  className="hover:cursor-pointer hover:underline"
                  onClick={() => router.push(`/user/${likedPost?.user?.id}`)}
                >
                  <span style={{ fontWeight: "bold", fontSize: 14 }}>
                    {likedPost?.user?.family_name} {likedPost?.user?.name}
                  </span>
                </Col>
                <Col span={24}>
                  {likedPost?.is_advertisement ? (
                    <div className="flex flex-row items-center">
                      <span
                        style={{
                          color: brandPrimaryTap,
                          fontSize: 12,
                          opacity: 0.5,
                          marginRight: 10,
                        }}
                      >
                        {localStrings.Post.Sponsor}
                      </span>
                      <RiAdvertisementLine size={24} color={brandPrimaryTap} />
                    </div>
                  ) : (
                    <div className="flex flex-row items-center">
                      <span
                        style={{
                          color: brandPrimaryTap,
                          fontSize: 12,
                          opacity: 0.5,
                          marginRight: 10,
                        }}
                      >
                        {getTimeDiff(likedPost?.created_at, localStrings)}
                      </span>
                      {renderPrivacyIcon()}
                    </div>
                  )}
                </Col>
              </Row>
            </Col>
            {isParentPost || noFooter ? null : (
              <Col
                xs={2}
                md={1}
                className="hover:cursor-pointer"
              // onClick={showAction}
              >
                <Dropdown trigger={["click"]} menu={{ items }}>
                  <HiDotsVertical size={16} />
                </Dropdown>
                <Modal
                  centered
                  title={localStrings.Public.ReportFriend}
                  open={showModal}
                  onCancel={() => setShowModal(false)}
                  footer={null}
                >
                  <ReportScreen postId={post?.id} setShowModal={setShowModal} />
                </Modal>
              </Col>
            )}
          </Row>
        }
        actions={
          isParentPost || noFooter
            ? undefined
            : [
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Row align={"middle"} justify={"center"}>
                  {renderLikeIcon()}
                  <span
                    style={{ color: brandPrimary }}
                    className="ml-2"
                    onClick={() => {
                      fetchUserLikePosts(likedPost!.id as string);
                      setIsVisible(true);
                    }}
                  >
                    {likedPost?.like_count}
                  </span>
                </Row>

                {!noComment && (
                  <Row align={"middle"} justify={"center"}>
                    <FaRegComments
                      size={24}
                      color={brandPrimary}
                      onClick={() => setIsCommentModalVisible(true)}
                    />
                    <span style={{ color: brandPrimary }} className="ml-2">
                      {likedPost?.comment_count}
                    </span>
                  </Row>
                )}

                <Row align={"middle"} justify={"center"}>
                  <IoShareSocialOutline
                    size={24}
                    color={brandPrimary}
                    onClick={() => setIsShareModalVisible(true)}
                  />
                </Row>
              </div>,
            ]
        }
      >
        <Row gutter={[8, 8]} className="mx-2"
         // vào post details
         onClick={() => {
          setIsCommentModalVisible(false);
          router.push(`/postDetails?postId=${likedPost?.id}`);}}>
          {!isParentPost && children ? (
            <Col span={24}>
              {likedPost?.content && (
                <span className="pl-2">{likedPost?.content}</span>
              )}
              {children}
            </Col>
          ) : likedPost?.content && likedPost?.parent_id ? (
            <div>
              <div style={{ paddingLeft: 10 }}>
                <span>{likedPost?.content}</span>
              </div>
              <div style={{ paddingLeft: 5, paddingRight: 5 }}>
                <div
                  style={{
                    padding: 10,
                    borderColor: "#000",
                    borderWidth: 1,
                    borderRadius: 5,
                  }}
                >
                  <span
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {localStrings.Post.NoContent}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Col span={24}>
              {likedPost?.content && (
                <span className="pl-0.3">{likedPost?.content}</span>
              )}
              {likedPost?.media && likedPost?.media?.length > 0 && (
                <MediaView mediaItems={likedPost?.media} />
              )}
            </Col>
          )}
        </Row>
        {/* Modal for edit post */}
        <Modal
          visible={isEditModalVisible}
          centered
          width={800}
          footer={null}
          closable={true}
          onCancel={() => setIsEditModalVisible(false)}
        >
          {post?.id ? (
            <EditPostScreen id={post.id} postId={post.id} onEditPostSuccess={() => setIsEditModalVisible(false)} fetchUserPosts={fetchUserPosts} />
          ) : (
            <div>No post ID available</div>
          )}
        </Modal>
        {/* Modal for comments */}
        <Modal
          visible={isCommentModalVisible}
          centered
          footer={null}
          closable={true}
          onCancel={() => setIsCommentModalVisible(false)}
          width="90vw" // Điều chỉnh chiều rộng modal bằng phần trăm của màn hình
          style={{
            maxWidth: '1200px', // Giới hạn chiều rộng tối đa
          }}
          bodyStyle={{
            maxHeight: '80vh', // Giới hạn chiều cao
            overflowY: 'auto', // Thêm thanh cuộn dọc nếu cần
          }}
        >
          <PostDetailsScreen postId={likedPost?.id} isModal={true}/>
        </Modal>


        {/* Modal for share Post */}
        <Modal
          visible={isShareModalVisible}
          centered
          onCancel={() => setIsShareModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setIsShareModalVisible(false)}>
              {localStrings.Public.Cancel}
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={shareLoading}
              onClick={handleSubmitShare}
            >
              {localStrings.Public.Conform}
            </Button>,
          ]}
        >
          <Form form={shareForm}>
            <Card
              style={{
                width: "100%",
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              <Row gutter={[8, 8]}>
                <Col xs={5} md={4} className="hover:cursor-pointer">
                  <Avatar src={likedPost?.user?.avatar_url} shape="circle" size={{ xs: 40, sm: 40, md: 50, lg: 50, xl: 50, xxl: 50 }}/>
                </Col>
                <Col xs={16} md={19}>
                  <Row>
                    <Col
                      span={24}
                      className="hover:cursor-pointer hover:underline"
                    >
                      <span style={{ fontWeight: "bold", fontSize: 14 }}>
                        {likedPost?.user?.family_name} {likedPost?.user?.name}
                      </span>
                    </Col>
                    <Col span={24}>
                      {likedPost?.is_advertisement ? (
                        <div className="flex flex-row items-center">
                          <span
                            style={{
                              color: brandPrimaryTap,
                              fontSize: 12,
                              opacity: 0.5,
                              marginRight: 10,
                            }}
                          >
                            {localStrings.Post.Sponsor}
                          </span>
                          <RiAdvertisementLine
                            size={24}
                            color={brandPrimaryTap}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-row items-center">
                          <span
                            style={{
                              color: brandPrimaryTap,
                              fontSize: 12,
                              opacity: 0.5,
                              marginRight: 10,
                            }}
                          >
                            {getTimeDiff(likedPost?.created_at, localStrings)}
                          </span>
                          {renderPrivacyIcon()}
                        </div>
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
              {likedPost?.content && (
                <Form.Item>
                  <span>{likedPost?.content}</span>
                </Form.Item>
              )}
              {likedPost?.media && likedPost?.media?.length > 0 && (
                <Form.Item>
                  <MediaView mediaItems={likedPost?.media} />
                </Form.Item>
              )}
              <Form.Item>
                <Input.TextArea
                  value={shareContent}
                  onChange={(e) => setShareContent(e.target.value)}
                  placeholder={localStrings.Post.ShareContent}
                />
              </Form.Item>
            </Card>

            <Form.Item
              name="sharePostPrivacy"
              label={localStrings.ObjectPostPrivacy.PostPrivacy}
            >
              <Select
                value={sharePostPrivacy}
                onChange={(value) => setSharePostPrivacy(value)}
                style={{ width: 120 }}
                defaultValue={Privacy.PUBLIC}
              >
                <Select.Option value={Privacy.PUBLIC}>
                  {localStrings.Public.Everyone}
                </Select.Option>
                <Select.Option value={Privacy.FRIEND_ONLY}>
                  {localStrings.Public.Friend}
                </Select.Option>
                <Select.Option value={Privacy.PRIVATE}>
                  {localStrings.Public.Private}
                </Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
        {/* Modal for User Like Post */}
        <Modal
          title={
            <div style={{ textAlign: "center" }}>
              <span style={{ fontWeight: "bold" }}>
                {localStrings.Public.UserLikePost}
              </span>
            </div>
          }
          visible={isVisible}
          onCancel={() => setIsVisible(false)}
          footer={null}
          width={500}
          centered
        >
          <div
            style={{
              maxHeight: 500,
              overflowY: "auto",
              padding: 20,
            }}
          >
            {isLoading ? (
              <Spin />
            ) : userLikePost && userLikePost.length > 0 ? (
              <div>
                {userLikePost.map((like) => (
                  <div key={like.id}>{renderLikedUserItem(like)}</div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <span style={{ marginLeft: 10, fontSize: 16 }}>
                  {localStrings.Public.NoUserLikePost}
                </span>
              </div>
            )}
          </div>
        </Modal>
      </Card>
    );
  }
);

export default Post;