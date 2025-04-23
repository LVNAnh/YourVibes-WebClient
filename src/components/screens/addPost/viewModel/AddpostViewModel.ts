"use client";
import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { CreatePostRequestModel } from "@/api/features/post/models/CreatePostRequestModel";
import { PostRepo } from "@/api/features/post/PostRepo";
import { useAuth } from "@/context/auth/useAuth";
import { usePostContext } from "@/context/post/usePostContext";
import { useState } from "react";
import { UploadFile, UploadProps } from "antd/es/upload";
import { convertMediaToFiles } from "@/utils/helper/TransferToFormData";
import { message } from "antd";
import { RcFile } from "antd/es/upload";
 
interface PostObserver {
  update(): void;
}
 
class PostSubject {
  private observers: PostObserver[] = [];

  attach(observer: PostObserver) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  detach(observer: PostObserver) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  notify() {
    this.observers.forEach(observer => observer.update());
  }
}

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const AddPostViewModel = (repo: PostRepo,) => {
  const { localStrings } = useAuth();
  const { clearSavedPost } = usePostContext();
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [postContent, setPostContent] = useState("");
  const [privacy, setPrivacy] = useState<Privacy | undefined>(Privacy.PUBLIC);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<UploadFile[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  const postSubject = new PostSubject();

  const createPost = async (data: CreatePostRequestModel) => {
    try {
      setCreateLoading(true);
      const response = await repo.createPost(data);

      if (response?.error) { 
        message.error({
          content: localStrings.AddPost.CreatePostFailed,
        });
      } else {
        setPostContent("");
        setFileList([]);  
        clearSavedPost?.();
        message.loading({
          content: localStrings.AddPost.CensorPost,
        });
        postSubject.notify();  
      }
    } catch (error) { 
      message.error({
        content: localStrings.AddPost.CreatePostFailed,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!postContent.trim() && fileList.length === 0) return;

    const validFiles = fileList
      .map((file) => file.originFileObj)
      .filter((file): file is RcFile => !!file);

    const createPostRequestModel: CreatePostRequestModel = {
      content: postContent,
      privacy: privacy,
      media: validFiles,
    };

    await createPost(createPostRequestModel);
  };

  const handlePreview = async (file: UploadFile) => {
    let preview = file.url || file.preview;
    if (!preview && file.originFileObj) {
      preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(preview || "");
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = async ({ fileList: newFileList }) => {
    setFileList(newFileList);
    const validFiles = newFileList
      .map((file) => file.originFileObj)
      .filter((file): file is RcFile => !!file);
    const mediaFiles = await convertMediaToFiles(validFiles);
    setSelectedMediaFiles(mediaFiles);
  };

  const registerObserver = (observer: PostObserver) => {
    postSubject.attach(observer);
  };

  return {
    createLoading,
    createPost,
    postContent,
    setPostContent,
    privacy,
    setPrivacy,
    handleSubmitPost,
    selectedMediaFiles,
    setSelectedMediaFiles,
    image,
    setImage,
    handlePreview,
    handleChange,
    fileList,
    previewOpen,
    setPreviewOpen,
    previewImage,
    setPreviewImage,
    registerObserver,
  };
};

export default AddPostViewModel;