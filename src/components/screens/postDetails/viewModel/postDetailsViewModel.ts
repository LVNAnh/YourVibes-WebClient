import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
//Comments
import { CommentsResponseModel } from "@/api/features/comment/models/CommentResponseModel";
import { defaultCommentRepo } from "@/api/features/comment/CommentRepo";
import { CreateCommentsRequestModel } from "@/api/features/comment/models/CreateCommentsModel"; 
//LikeComments
import { defaultLikeCommentRepo } from "@/api/features/likeComment/LikeCommentRepo";
import { LikeCommentResponseModel } from "@/api/features/likeComment/models/LikeCommentResponses";
//UserLikePost
import { defaultPostRepo, PostRepo } from "@/api/features/post/PostRepo";
import { LikeUsersModel } from "@/api/features/post/models/LikeUsersModel";
import { Modal } from "antd"; 

const PostDetailsViewModel = (
  postId: string,
  repo: PostRepo,
) => {
  const [comments, setComments] = useState<CommentsResponseModel[]>([]);
  const [replyMap, setReplyMap] = useState<{
    [key: string]: CommentsResponseModel[];
  }>({});

  const [likeCount, setLikeCount] = useState<{ [key: string]: number }>({});
  const [userLikes, setUserLikes] = useState<{ [key: string]: boolean }>({});
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [heartColors, setHeartColors] = useState<{ [key: string]: string }>({});
  const [likedComment, setLikedComment] = useState({ is_liked: false }
  );

  const [newComment, setNewComment] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToReplyId, setReplyToReplyId] = useState<string | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [currentCommentId, setCurrentCommentId] = useState("");
  const [userLikePost, setUserLikePost] = useState<LikeUsersModel[]>([]);
  const { user, localStrings } = useAuth();
  const [replyContent, setReplyContent] = useState("");   
  const [visibleReplies, setVisibleReplies] = useState<{
    [key: string]: boolean;
  }>({}); 

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
    }
  };

  const fetchReplies = async (postId: string, parentId: string) => {
    try {
      const replies = await defaultCommentRepo.getReplies(postId, parentId);
      if (replies && replies.data) { 
        setReplyMap((prevReplyMap) => {
          return {
            ...prevReplyMap,
            [parentId]: replies.data,
          };
        });
      }
    } catch (error) { 
      message.error(localStrings.PostDetails.CommentFailed);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);
 
  
  const handleLike = async (commentId: string) => {
    const isLike = isLiked[commentId] === undefined ? true : !isLiked[commentId];
  
    try {
      const response = await defaultLikeCommentRepo.postLikeComment({
        commentId,
        isLike,
      });
  
      if (response && response.data) {
        const likeCommentResponse: LikeCommentResponseModel = response.data;
        setIsLiked((prevIsLiked) => ({ ...prevIsLiked, [commentId]: likeCommentResponse.is_liked ?? false }));
        setLikeCount((prevLikeCount) => ({ ...prevLikeCount, [commentId]: likeCommentResponse.like_count }));
        setHeartColors((prevHeartColors) => ({ ...prevHeartColors, [commentId]: isLike ? 'red' : 'gray' }));
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };
  const handleEditComment = async (commentId: string) => {
    if (!currentCommentId || !editCommentContent) {
      console.error("Invalid comment ID or content");
      return;
    }

    await handleUpdate(currentCommentId, editCommentContent, commentId);
    setEditModalVisible(false); // Close modal
    setEditCommentContent("");
    setCurrentCommentId("");
  };

  const [lastChange, setLastChange] = useState(false);
  useEffect(() => {
    if (!lastChange) {
      setLastChange(true);
    }
  }, [editCommentContent]);

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

      const response = await defaultCommentRepo.updateComment(
        commentId,
        updateCommentData
      );

      if (response && response.data) {
        if (isReply) {
          // Cập nhật reply mới
          setReplyMap((prevReplyMap) => {
            const updatedReplies = prevReplyMap[parentId].map((reply) => {
              if (reply.id === commentId) {
                return { ...reply, content: updatedContent };
              }
              return reply;
            });
            return { ...prevReplyMap, [parentId]: updatedReplies };
          });
          // Hiển thị reply mới 
          setComments((prev) => [...prev, { ...response.data, replies: [] }]);
        } else {
          // Cập nhật comment
          const updatedComments = comments.map((comment) => {
            if (comment.id === commentId) {
              return { ...comment, content: updatedContent };
            }
            return comment;
          });
          setComments(updatedComments);
        }
        fetchComments();
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (isEditModalVisible) { 
    }
  }, [isEditModalVisible]);

  const handleDelete = (commentId: string) => {
    Modal.confirm({
      title: `${localStrings.PostDetails.DeleteComment}`,
      content: "",
      okText: `${localStrings.PostDetails.Yes}`,
      cancelText: `${localStrings.PostDetails.No}`,
      onCancel: () => {},
      onOk: () => {
        defaultCommentRepo.deleteComment(commentId)
          .then(() => {
            // Cập nhật trạng thái comments
            setComments((prevComments) =>
              prevComments.filter((comment) => comment.id !== commentId)
            );
            // Cập nhật trạng thái replyMap
            if (replyMap[commentId]) {
              setReplyMap((prevReplyMap) => {
                const updatedReplies = prevReplyMap[commentId].filter(
                  (reply) => reply.id !== commentId
                );
                return { ...prevReplyMap, [commentId]: updatedReplies };
              });
            }
  
            // Fetch comments and replies
            fetchComments();
            fetchReplies(postId || "", commentId);
          })
          .then(() => {
            // Hiển thị thông báo khi xóa thành công
            message.success({
              content: localStrings.PostDetails.DeleteCommentSusesfully,
            });
          })
          .catch((error) => {
            // Hiển thị thông báo khi xóa thất bại
            message.error({
              content: localStrings.PostDetails.DeleteCommentFailed,
            });
            console.error(error);
          });
      },
    });
  };
  
  useEffect(() => {
    if (replyMap && comments) {  
    }
  }, [replyMap, comments]);

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
          setComments((prev) => [...prev, newComment]); // Cập nhật lại state comments
          fetchComments(); // Gọi lại hàm fetchComments để cập nhật lại danh sách comment
          message.success({
            content: localStrings.PostDetails.CommentSuccess,
          });
        } else {
          message.error({
            content: localStrings.PostDetails.CommentFailed,
          });
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        message.error({
          content: localStrings.PostDetails.CommentFailed,
        });
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
          setComments((prev) => {
            const parentComment = prev.find(
              (comment) => comment.id === parentId
            );
            return [...prev];
          });
          // Cập nhật lại danh sách reply cho comment cha
          const updatedReplies = [
            ...(replyMap[parentId || ""] || []),
            newComment,
          ];
          setReplyMap((prevReplyMap) => ({
            ...prevReplyMap,
            [parentId || ""]: updatedReplies,
          }));
          fetchComments(); // Gọi lại hàm fetchComments để cập nhật lại danh sách comment
          fetchReplies(postId || "", parentId || ""); // Gọi lại hàm fetchReplies để cập nhật lại danh sách reply
          message.success({
            content: localStrings.PostDetails.ReplySuccess,
          });
        } else {
          message.error({
            content: localStrings.PostDetails.ReplyFailed,
          });
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        message.error({
          content: localStrings.PostDetails.ReplyFailed,
        });
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
    userLikes,
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