import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { CommentsResponseModel } from "@/api/features/comment/models/CommentResponseModel";
import { defaultCommentRepo } from "@/api/features/comment/CommentRepo";
import { CreateCommentsRequestModel } from "@/api/features/comment/models/CreateCommentsModel";
import { defaultLikeCommentRepo } from "@/api/features/likeComment/LikeCommentRepo";
import { LikeCommentResponseModel } from "@/api/features/likeComment/models/LikeCommentResponses";
import { defaultPostRepo, PostRepo } from "@/api/features/post/PostRepo";
import { LikeUsersModel } from "@/api/features/post/models/LikeUsersModel";
import { Modal } from "antd";

const PostDetailsViewModel = (postId: string, repo: PostRepo) => {
  const [comments, setComments] = useState<CommentsResponseModel[]>([]);
  const [replyMap, setReplyMap] = useState<{ [key: string]: CommentsResponseModel[] }>({});
  const [likeCount, setLikeCount] = useState<{ [key: string]: number }>({});
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [heartColors, setHeartColors] = useState<{ [key: string]: string }>({});
  const [likedComment, setLikedComment] = useState({ is_liked: false });
  const [newComment, setNewComment] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToReplyId, setReplyToReplyId] = useState<string | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [currentCommentId, setCurrentCommentId] = useState("");
  const [userLikePost, setUserLikePost] = useState<LikeUsersModel[]>([]);
  const { user, localStrings } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [visibleReplies, setVisibleReplies] = useState<{ [key: string]: boolean }>({});

  const toggleRepliesVisibility = (commentId: string) => {
    setVisibleReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReplyClick = (commentId: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyToReplyId(commentId);
    } else {
      setReplyToCommentId(commentId);
    }
    setReplyContent("");
    fetchReplies(postId || "", commentId);
  };

  const handleShowEditModal = (commentId: string, content: string) => {
    setEditCommentContent(content);
    setCurrentCommentId(commentId);
    setEditModalVisible(true);
  };

  const handleOutsideClick = () => {
    if (replyToCommentId || replyToReplyId) {
      setReplyToCommentId(null);
      setReplyToReplyId(null);
      setReplyContent("");
    }
  };

  const fetchComments = async () => {
    const response = await defaultCommentRepo.getComments({
      PostId: postId,
      page: 1,
      limit: 10,
    });
    if (response && response?.data) {
      setComments(response?.data);
      const initialLikeCount: { [key: string]: number } = {};
      const initialIsLiked: { [key: string]: boolean } = {};
      const initialHeartColors: { [key: string]: string } = {};
      response.data.forEach((comment) => {
        initialLikeCount[comment.id] = comment.like_count || 0;
        initialIsLiked[comment.id] = comment.is_liked || false;
        initialHeartColors[comment.id] = comment.is_liked ? "red" : "gray";
      });
      setLikeCount(initialLikeCount);
      setIsLiked(initialIsLiked);
      setHeartColors(initialHeartColors);
    }
  };

  const fetchReplies = async (postId: string, parentId: string) => {
    try {
      const replies = await defaultCommentRepo.getReplies(postId, parentId);
      if (replies && replies.data) {
        setReplyMap((prevReplyMap) => ({
          ...prevReplyMap,
          [parentId]: replies.data,
        }));
      }
    } catch (error) {
      message.error(localStrings.PostDetails.CommentFailed);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleLike = async (commentId: string) => {
    const currentIsLiked = isLiked[commentId] ?? false;
    const newIsLiked = !currentIsLiked;

    try {
      const response = await defaultLikeCommentRepo.postLikeComment({
        commentId,
        isLike: newIsLiked,
      });

      if (response && response.data) {
        // Kiểm tra xem response.data có phải là mảng và có phần tử đầu tiên không
        const likeCommentResponse = Array.isArray(response.data) && response.data[0] ? response.data[0] : null;
        if (likeCommentResponse && typeof likeCommentResponse.like_count === "number") {
          const newLikeCount = likeCommentResponse.like_count;

          setIsLiked((prev) => ({ ...prev, [commentId]: newIsLiked }));
          setLikeCount((prev) => ({ ...prev, [commentId]: newLikeCount }));
          setHeartColors((prev) => ({ ...prev, [commentId]: newIsLiked ? "red" : "gray" }));
          setLikedComment({ is_liked: newIsLiked });
        } else {
          // Fallback: Tăng/giảm thủ công nếu API không trả về like_count
          setLikeCount((prev) => ({
            ...prev,
            [commentId]: newIsLiked ? (prev[commentId] || 0) + 1 : (prev[commentId] || 0) - 1,
          }));
          setIsLiked((prev) => ({ ...prev, [commentId]: newIsLiked }));
          setHeartColors((prev) => ({ ...prev, [commentId]: newIsLiked ? "red" : "gray" }));
          setLikedComment({ is_liked: newIsLiked });
          console.warn("API response missing like_count, using fallback logic");
        }
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      message.error("Failed to like/unlike comment");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!currentCommentId || !editCommentContent) {
      console.error("Invalid comment ID or content");
      return;
    }
    await handleUpdate(currentCommentId, editCommentContent, commentId);
    setEditModalVisible(false);
    setEditCommentContent("");
    setCurrentCommentId("");
  };

  const handleUpdate = async (
    commentId: string,
    updatedContent: string,
    parentId: string,
    isReply = false
  ) => {
    try {
      const updateCommentData = {
        comments_id: commentId,
        content: updatedContent,
      };
      const response = await defaultCommentRepo.updateComment(commentId, updateCommentData);
      if (response && response.data) {
        if (isReply) {
          setReplyMap((prevReplyMap) => {
            const updatedReplies = prevReplyMap[parentId].map((reply) =>
              reply.id === commentId ? { ...reply, content: updatedContent } : reply
            );
            return { ...prevReplyMap, [parentId]: updatedReplies };
          });
          setComments((prev) => [...prev, { ...response.data, replies: [] }]);
        } else {
          const updatedComments = comments.map((comment) =>
            comment.id === commentId ? { ...comment, content: updatedContent } : comment
          );
          setComments(updatedComments);
        }
        fetchComments();
      }
    } catch (error) {}
  };

  const handleDelete = async (commentId: string) => {
    Modal.confirm({
      title: `${localStrings.PostDetails.DeleteComment}`,
      content: "",
      okText: `${localStrings.PostDetails.Yes}`,
      cancelText: `${localStrings.PostDetails.No}`,
      onCancel: () => {},
      onOk: async () => {
        try {
          await defaultCommentRepo.deleteComment(commentId);
          const isTopLevelComment = comments.some((c) => c.id === commentId);
          if (isTopLevelComment) {
            setComments((prevComments) => prevComments.filter((comment) => comment.id !== commentId));
          } else {
            const parentId = Object.keys(replyMap).find((key) =>
              replyMap[key].some((reply) => reply.id === commentId)
            );
            if (parentId) {
              setReplyMap((prevReplyMap) => ({
                ...prevReplyMap,
                [parentId]: prevReplyMap[parentId].filter((reply) => reply.id !== commentId),
              }));
              await fetchReplies(postId || "", parentId);
            }
          }
          await fetchComments();
          message.success({ content: localStrings.PostDetails.DeleteCommentSusesfully });
        } catch (error) {
          message.error({ content: localStrings.PostDetails.DeleteCommentFailed });
          console.error(error);
        }
      },
    });
  };

  const handleAddComment = async (comment: string) => {
    if (comment.trim()) {
      const commentData: CreateCommentsRequestModel = {
        post_id: postId,
        content: comment,
      };
      try {
        const response = await defaultCommentRepo.createComment(commentData);
        if (!response.error) {
          const newComment = { ...response.data, replies: [] };
          setComments((prev) => [...prev, newComment]);
          fetchComments();
          message.success({ content: localStrings.PostDetails.CommentSuccess });
        } else {
          message.error({ content: localStrings.PostDetails.CommentFailed });
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        message.error({ content: localStrings.PostDetails.CommentFailed });
      } finally {
        setNewComment("");
      }
    }
  };

  const handleAddReply = async (comment: string, id: string) => {
    if (comment.trim()) {
      const parentId = replyToReplyId || replyToCommentId;
      const commentData: CreateCommentsRequestModel = {
        post_id: postId,
        content: comment,
        parent_id: parentId,
      };
      try {
        const response = await defaultCommentRepo.createComment(commentData);
        if (!response.error) {
          const newComment = { ...response.data, replies: [] };
          setComments((prev) => [...prev]);
          const updatedReplies = [...(replyMap[parentId || ""] || []), newComment];
          setReplyMap((prevReplyMap) => ({
            ...prevReplyMap,
            [parentId || ""]: updatedReplies,
          }));
          fetchComments();
          fetchReplies(postId || "", parentId || "");
          message.success({ content: localStrings.PostDetails.ReplySuccess });
        } else {
          message.error({ content: localStrings.PostDetails.ReplyFailed });
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        message.error({ content: localStrings.PostDetails.ReplyFailed });
      } finally {
        setNewComment("");
        setReplyToReplyId(null);
      }
    }
  };

  const fetchUserLikePosts = async (postId: string) => {
    const response = await defaultPostRepo.getPostLikes({
      postId: postId,
      page: 1,
      limit: 10,
    });
    setUserLikePost(response?.data);
  };

  useEffect(() => {
    fetchUserLikePosts(postId);
  }, [postId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (replyToCommentId) {
      setReplyContent(e.target.value);
    } else {
      setNewComment(e.target.value);
    }
  };

  const handlePostAction = () => {
    if (replyToCommentId) {
      handleAddReply(replyContent, replyToCommentId);
      setReplyToCommentId(null);
      setReplyContent("");
    } else {
      handleAddComment(newComment);
      setNewComment("");
    }
  };

  return {
    comments,
    replyMap,
    likeCount,
    newComment,
    isEditModalVisible,
    editCommentContent,
    handleLike,
    handleDelete,
    handleEditComment,
    setEditCommentContent,
    replyContent,
    setReplyContent,
    handlePostAction,
    handleTextChange,
    setReplyToCommentId,
    setReplyToReplyId,
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
  };
};

export default PostDetailsViewModel;