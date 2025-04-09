"use client";
import {
  Button,
  Form,
  Input,
  Avatar,
  Typography,
  Upload,
  Spin,
  Image,
  Select,
} from "antd";
import { 
  PlusOutlined, 
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth/useAuth";
import { usePostContext } from "@/context/post/usePostContext";
import AddPostViewModel from "../viewModel/AddpostViewModel";
import { defaultPostRepo } from "@/api/features/post/PostRepo";
import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { UploadFile, UploadProps } from "antd/es/upload";
import { useEffect } from "react";

const { TextArea } = Input;
const { Text } = Typography;

interface AddPostScreenProps {
  onPostSuccess?: () => void;
  fetchNewFeeds?: () => void;
  fetchUserPosts?: () => void;
}

const AddPostScreen = ({ onPostSuccess, fetchNewFeeds, fetchUserPosts }: AddPostScreenProps) => {
  const { user, localStrings } = useAuth();
  const savedPost = usePostContext();
  const router = useRouter();
  const viewModel = AddPostViewModel(defaultPostRepo, router);
  const pathname = usePathname();

  const PostUpdateObserver = {
    update: () => {
      if (pathname === "/home" && fetchNewFeeds) {
        fetchNewFeeds();
      } else if (pathname === "/profile" && fetchUserPosts) {
        fetchUserPosts();
      }
      if (onPostSuccess) {
        onPostSuccess();
      }
    }
  };

  useEffect(() => {
    viewModel.registerObserver(PostUpdateObserver); 
  }, [viewModel]);  

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>{localStrings.AddPost.UploadImage}</div>
    </button>
  );

  const isContentLengthValid = () => {
    const contentLength = viewModel.postContent.trim().length;
    return contentLength >= 2 && contentLength <= 10000;
  };

  const handleSubmit = async () => {
    if (!isContentLengthValid() && viewModel.fileList.length === 0) {
      return;
    }
    await viewModel.handleSubmitPost();
  };

  const currentCharCount = viewModel.postContent.length;

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: "20px",
        }}
      >
        <Avatar
          src={
            user?.avatar_url ||
            "https://res.cloudinary.com/dfqgxpk50/image/upload/v1712331876/samples/look-up.jpg"
          }
          size={{ xs: 40, sm: 40, md: 50, lg: 50, xl: 50, xxl: 50 }}
        />
        <div style={{ marginLeft: "10px", flex: 1 }}>
          <Text strong>
            {user?.family_name + " " + user?.name ||
              localStrings.Public.UnknownUser}
          </Text>
          <Form.Item>
            <TextArea
              placeholder={localStrings.AddPost.WhatDoYouThink}
              autoSize={{ minRows: 3, maxRows: 5 }}
              value={viewModel.postContent}
              onChange={(e) => viewModel.setPostContent(e.target.value)}
            />
            <Text type={currentCharCount > 10000 ? "danger" : "secondary"} style={{ float: "right" }}>
              {currentCharCount}/{localStrings.Post.CharacterLimit}
            </Text>
          </Form.Item>
        </div>
      </div>

      <Upload
        className="pt-4"
        accept=".jpg, .jpeg, .gif, .png, .svg, .mp4, .mov"
        listType="picture-card"
        fileList={viewModel.fileList}
        onChange={viewModel.handleChange}
        onPreview={viewModel.handlePreview}
        beforeUpload={() => false}
      >
        {viewModel.fileList.length >= 8 ? null : uploadButton}
      </Upload>

      {viewModel.previewImage && (
        <Image
          wrapperStyle={{ display: "none" }}
          preview={{
            visible: viewModel.previewOpen,
            onVisibleChange: (visible) => viewModel.setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && viewModel.setPreviewImage(""),
          }}
          src={viewModel.previewImage}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          marginTop: "10px",
        }}
      >
        <Text>{localStrings.AddPost.PrivacyText}: </Text>
        <Select
          value={viewModel.privacy}
          onChange={(value) => viewModel.setPrivacy(value)}
          style={{ width: 120, marginLeft: "10px" }}
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

        <Button
          style={{ marginLeft: "auto" }}
          type="primary"
          onClick={handleSubmit}
          disabled={!isContentLengthValid() && viewModel.selectedMediaFiles.length === 0}
          loading={viewModel.createLoading}
        >
          {viewModel.createLoading
            ? viewModel.createLoading && <Spin style={{ color: "white" }} />
            : localStrings.AddPost.PostNow}
        </Button>
      </div>
    </div>
  );
};

export default AddPostScreen;