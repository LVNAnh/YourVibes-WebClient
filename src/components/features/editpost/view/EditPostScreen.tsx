"use client";
import {
  Button,
  Form,
  Input,
  Avatar,
  Typography,
  Upload,
  message,
  Select,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/auth/useAuth";
import { usePostContext } from "@/context/post/usePostContext";
import EditPostViewModel from "../viewModel/EditPostViewModel";
import { defaultPostRepo } from "@/api/features/post/PostRepo";
import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { useEffect, useState } from "react";
const { TextArea } = Input;
const { Text } = Typography;

interface EditPostScreenProps {
  id: string;
  postId: string;
  onEditPostSuccess?: () => void;
  fetchUserPosts?: () => void;
}

const EditPostScreen = ({
  id,
  postId,
  onEditPostSuccess,
  fetchUserPosts,
}: EditPostScreenProps) => {
  const { user, localStrings } = useAuth();
  const savedPost = usePostContext();

  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const {
    handlePreview,
    handleChange,
    updateLoading,
    postContent,
    setPostContent,
    privacy,
    setPrivacy,
    getDetailPost,
    fileList,
    handleSubmit,
    selectedMediaFiles,
    getNewFeed,
    setMediaIds,
    previewImage,
    setPreviewImage,
  } = EditPostViewModel(defaultPostRepo, id, postId);


  useEffect(() => {
    getDetailPost(id);
  }, [id]);

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  const handleSubmitEditPost = async () => {
   try {
    await handleSubmit();
    if (fetchUserPosts) {
      console.log("fetchUserPosts");
      
      fetchUserPosts(); // Fetch lại bài đăng của người dùng ở trang Profile
    }
    if (onEditPostSuccess) {
      onEditPostSuccess();
    }
  } catch (error) {
    console.error("Error submitting post:", error);
  }
  }



  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <Typography.Title level={4}>
          {localStrings.Post.EditPost}
        </Typography.Title>
      </div>

      {/* User Info */}
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
      >
        <Avatar src={user?.avatar_url} size="large" />
        <div style={{ marginLeft: "10px" }}>
          <Text strong>
            {user?.family_name + " " + user?.name ||
              localStrings.Public.UnknownUser}
          </Text>
        </div>
      </div>

      {/* Content Input */}
      <Form.Item>
        <TextArea
          rows={4}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={localStrings.AddPost.WhatDoYouThink}
        />
      </Form.Item>

      {/* Image/Media Upload */}
      <Upload
        listType="picture-card"
        fileList={fileList}
        accept=".jpg, .jpeg, .gif, .png, .svg, .mp4, .mov"
        onPreview={handlePreview}
        onChange={handleChange}
      >
        {uploadButton}
      </Upload>
      {previewImage && (
        <img
          src={previewImage}
          style={{ display: "block" }}
          onClick={() => setPreviewOpen(true)}
          
        />
      )}
      {previewOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setPreviewOpen(false)}
        >
          <img
            src={previewImage}
            style={{ maxWidth: "80%", maxHeight: "80%" }}
          />
        </div>
      )}

      {/* Privacy Text */}
      <div style={{ display: "flex" }}>
        <div style={{ marginRight: "auto", marginTop: "10px" }}>
          <Text style={{}}>{localStrings.AddPost.PrivacyText}: </Text>
          <Select
            value={privacy}
            onChange={(value) => setPrivacy(value)}
            style={{ width: 120 }}
          >
            <Select.Option value={Privacy.PUBLIC}>{localStrings.Public.Public}</Select.Option>
            <Select.Option value={Privacy.FRIEND_ONLY}>{localStrings.Public.Friend}</Select.Option>
            <Select.Option value={Privacy.PRIVATE}>{localStrings.Public.Private}</Select.Option>
          </Select>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Button
            type="primary"
            onClick={handleSubmitEditPost}
            // disabled={!postContent.trim() && selectedMediaFiles.length === 0}
            loading={updateLoading}
          >
            {localStrings.Public.Save}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditPostScreen; 
