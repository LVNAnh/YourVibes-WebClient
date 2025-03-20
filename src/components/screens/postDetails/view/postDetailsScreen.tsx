import React, { useEffect, useRef, useState } from "react";
import Post from "@/components/common/post/views/Post";
import { Avatar, Button, Col, Row, Typography } from "antd";
import {
  FaEdit,
  FaHeart,
  FaReply,
  FaTrash,
  FaFlag,
  FaArrowLeft,
} from "react-icons/fa";
import PostDetailsViewModel from "@/components/screens/postDetails/viewModel/postDetailsViewModel";
import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";
import { PostResponseModel } from "@/api/features/post/models/PostResponseModel";
import { defaultPostRepo } from "@/api/features/post/PostRepo";
import ReportViewModel from "@/components/screens/report/ViewModel/reportViewModel";
import { Modal } from "antd";
import ReportScreen from "../../report/views/Report";
import EmojiPicker from "emoji-picker-react";
import { useRouter } from "next/navigation";
import CommentItem from "@/components/screens/postDetails/components/CommentItem";

interface CommentsScreenProps {
  postId?: string;
  isModal?: boolean;
}

const { brandPrimaryTap } = useColor();
const { Text } = Typography;

const PostDetailsScreen: React.FC<CommentsScreenProps> = ({
  postId,
  isModal,
}) => {
  const {
    comments,
    replyMap,
    likeCount,
    newComment,
    isEditModalVisible,
    editCommentContent,
    handleLike,
    handleDelete,
    setEditCommentContent,
    replyContent,
    setReplyContent,
    handlePostAction,
    handleTextChange,
    replyToCommentId,
    replyToReplyId,
    fetchReplies,
    setEditModalVisible,
    handleUpdate,
    toggleRepliesVisibility,
    handleReplyClick,
    handleShowEditModal,
    handleOutsideClick,
    setVisibleReplies,
    visibleReplies,
    fetchComments,
    heartColors,
    setLikedComment,
    likedComment,
    setNewComment,
  } = PostDetailsViewModel(postId || "", defaultPostRepo);

  const [post, setPost] = useState<PostResponseModel | null>(null);
  const [loading, setLoading] = useState(false);
  const { localStrings } = useAuth();
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [isReplyModalVisible, setReplyModalVisible] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const { showModal, setShowModal } = ReportViewModel();
  const [currentCommentId, setCurrentCommentId] = useState<string>("");
  const reportComment = (commentId: string) => {
    setCurrentCommentId(commentId);
    setShowModal(true);
  };
  const [editCommnetId, setEditCommentId] = useState<string>("");

  const [showEmojiPicker, setShowEmojiPicker] = useState({
    reply: false,
    comment: false,
    editCommet: false,
  });
  const emojiPickerRefReply = useRef(null);
  const emojiPickerRefComment = useRef(null);
  const emojiPickerRefEditComment = useRef(null);

  const handleEmojiClick = (emojiObject: any) => {
    setNewComment((prevComment) => prevComment + emojiObject.emoji);
  };

  const handleEmojiClickReply = (emojiObject: any) => {
    setReplyContent((prevComment) => prevComment + emojiObject.emoji);
  };
  const handleEmojiClickEdit = (emojiObject: any) => {
    setEditCommentContent((prevComment) => prevComment + emojiObject.emoji);
  };
  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const post = await defaultPostRepo.getPostById(postId);
      if (!post.error) {
        setPost(post.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPost(postId);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      comments.forEach((comment) => {
        fetchReplies(postId, comment.id);
      });
    }
  }, [postId, comments]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      showEmojiPicker.reply &&
      emojiPickerRefReply.current &&
      !(emojiPickerRefReply.current as HTMLElement).contains(
        event.target as Node
      )
    ) {
      setShowEmojiPicker((prev) => ({ ...prev, reply: false }));
    }
    if (
      showEmojiPicker.comment &&
      emojiPickerRefComment.current &&
      !(emojiPickerRefComment.current as HTMLElement).contains(
        event.target as Node
      )
    ) {
      setShowEmojiPicker((prev) => ({ ...prev, comment: false }));
    }
    if (
      showEmojiPicker.editCommet &&
      emojiPickerRefEditComment.current &&
      !(emojiPickerRefEditComment.current as HTMLElement).contains(
        event.target as Node
      )
    ) {
      setShowEmojiPicker((prev) => ({ ...prev, editCommet: false }));
    }
  };

  useEffect(() => {
    if (
      showEmojiPicker.reply ||
      showEmojiPicker.comment ||
      showEmojiPicker.editCommet
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="p-2.5">
      {isModal === false && (
        <div className="mb-2 flex items-center">
          <Button
            icon={<FaArrowLeft />}
            type="text"
            onClick={() => router.back()}
          />
          <Text strong style={{ fontSize: "18px", marginLeft: "10px" }}>
            {localStrings.Public.Post}
          </Text>
        </div>
      )}
      <div className="container mx-auto flex flex-col xl:flex-row gap-6">
        {/* Cột hiển thị bài viết */}
        <div className="post-container flex-1 bg-white p-6 rounded-lg shadow-md">
          <Post noComment={true} post={post || undefined}>
            {post?.parent_post && (
              <Post post={post?.parent_post} isParentPost />
            )}
          </Post>
        </div>

        {/* Cột hiển thị bình luận */}
        <div className="comments-container flex-1 bg-white p-6 rounded-lg shadow-md">
          <span className="text-lg font-semibold text-gray-800">
            {localStrings.Public.Comment}
          </span>
          {/* Danh sách bình luận */}
          <div className="comments-list space-y-6 max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replyMap={replyMap}
                heartColors={heartColors}
                handleLike={handleLike}
                handleDelete={handleDelete}
                handleShowEditModal={handleShowEditModal}
                handleReplyClick={handleReplyClick}
                fetchReplies={fetchReplies}
                fetchComments={fetchComments}
                toggleRepliesVisibility={toggleRepliesVisibility}
                visibleReplies={visibleReplies}
                setLikedComment={setLikedComment}
                likedComment={likedComment}
                reportComment={reportComment}
                setReplyModalVisible={setReplyModalVisible}
                setSelectedCommentId={setSelectedCommentId}
                postId={postId || ""}
              />
            ))}
          </div>

          {/* Phản hồi đến bình luận */}
          <div className="add-comment mt-2">
            {/* Container của textarea và emoji button */}
            <div className="relative">
              <textarea
                className="comment-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10"
                placeholder={
                  replyToCommentId || replyToReplyId
                    ? `${localStrings.Public.ReplyClick}`
                    : `${localStrings.Public.CommentClick}`
                }
                value={newComment}
                onChange={handleTextChange}
              />
              {/* Nút Emoji nằm trong góc dưới phải của textarea */}
              <button
                type="button"
                onClick={() =>
                  setShowEmojiPicker((prev) => ({
                    ...prev,
                    comment: !prev.comment,
                  }))
                }
                className="absolute right-3 top-4 text-lg bg-gray-200 rounded-full hover:bg-gray-300 p-1"
              >
                😊
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker.comment && (
              <div
                ref={emojiPickerRefComment}
                className="absolute bottom-1 xl:top-1 right-3 z-10 bg-white border border-gray-300 rounded-lg shadow-md"
              >
                <EmojiPicker
                  onEmojiClick={(emojiObject) => handleEmojiClick(emojiObject)}
                  width={250}
                  height={400}
                />
              </div>
            )}

            <button
              onClick={handlePostAction}
              className="post-btn mt-4 w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-800"
            >
              {localStrings.Public.Comment ||
                (replyToCommentId || replyToReplyId ? "Reply" : "Post")}
            </button>
          </div>
          {/*Modal Reply*/}
          {isReplyModalVisible && (
            <Modal
              title={`${localStrings.Public.Reply}`}
              centered
              visible={isReplyModalVisible}
              onCancel={() => setReplyModalVisible(false)}
              onOk={() => {
                handlePostAction();
                setReplyModalVisible(false);
                setVisibleReplies((prev) => ({
                  ...prev,
                  ...Object.keys(prev).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {}
                  ),
                }));
              }}
            >
              <div className="relative">
                <textarea
                  className="comment-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={replyContent}
                  placeholder={`${localStrings.Public.ReplyClick}`}
                  onChange={(e) => setReplyContent(e.target.value)}
                  style={{ border: "0.5px solid gray", width: "100%" }}
                />
                {/* Nút Emoji nằm trong góc dưới phải của textarea */}
                <button
                  type="button"
                  onClick={() =>
                    setShowEmojiPicker((prev) => ({
                      ...prev,
                      reply: !prev.reply,
                    }))
                  }
                  className="absolute right-3 top-4 text-lg bg-gray-200 rounded-full hover:bg-gray-300 p-1"
                >
                  😊
                </button>
              </div>
              {/* Emoji Picker */}
              {showEmojiPicker.reply && (
                <div
                  ref={emojiPickerRefReply}
                  className="absolute left-5 z-10 bg-white border border-gray-300 rounded-lg shadow-md"
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObject) =>
                      handleEmojiClickReply(emojiObject)
                    }
                    width={400}
                    height={320}
                  />
                </div>
              )}
            </Modal>
          )}

          {/* Modal Edit */}
          {isEditModalVisible && (
            <Modal
              title={`${localStrings.PostDetails.EditComment}`}
              centered
              visible={isEditModalVisible}
              onCancel={() => setEditModalVisible(false)}
              onOk={() => {
                handleUpdate(
                  editCommnetId,
                  editCommentContent,
                  replyToCommentId || ""
                );
                setEditModalVisible(false);
                console.log("Edit", editCommnetId, editCommentContent);
              }}
            >
              <div className="relative">
                <textarea
                  className="comment-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  style={{ border: "1px solid gray", width: "100%" }}
                />
                {/* Nút Emoji nằm trong góc dưới phải của textarea */}
                <button
                  type="button"
                  onClick={() =>
                    setShowEmojiPicker((prev) => ({
                      ...prev,
                      editCommet: !prev.editCommet,
                    }))
                  }
                  className="absolute right-3 top-4 text-lg bg-gray-200 rounded-full hover:bg-gray-300 p-1"
                >
                  😊
                </button>
              </div>
              {showEmojiPicker.editCommet && (
                <div
                  ref={emojiPickerRefEditComment}
                  className="absolute left-5 z-10 bg-white border border-gray-300 rounded-lg shadow-md"
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObject) =>
                      handleEmojiClickEdit(emojiObject)
                    }
                    width={400}
                    height={320}
                  />
                </div>
              )}
            </Modal>
          )}
          {/* Modal hiển thị khi nhấn FaFlag */}
          <Modal
            centered
            title={localStrings.Public.ReportFriend}
            open={showModal}
            onCancel={() => setShowModal(false)}
            footer={null}
          >
            <ReportScreen
              commentId={currentCommentId}
              setShowModal={setShowModal}
            />
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PostDetailsScreen;