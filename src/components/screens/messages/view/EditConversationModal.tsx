"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Upload } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import useColor from "@/hooks/useColor";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

interface EditConversationModalProps {
  visible: boolean;
  onCancel: () => void;
  onUpdateConversation: (name: string, image?: File | string) => Promise<any>;
  currentConversation: ConversationResponseModel | null;
}

const EditConversationModal: React.FC<EditConversationModalProps> = ({ 
  visible, 
  onCancel, 
  onUpdateConversation,
  currentConversation
}) => {
  const { localStrings } = useAuth();
  const { brandPrimary } = useColor();
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  const [conversationImage, setConversationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentConversation) {
      form.setFieldsValue({
        name: currentConversation.name
      });
      
      if (currentConversation.image) {
        setImagePreview(currentConversation.image);
      } else {
        setImagePreview(null);
      }
    }
  }, [visible, currentConversation, form]);

  const handleImageUpload = (info: any) => {
    const file = info.file;
    
    if (!file) {
      console.error("Không tìm thấy file:", info);
      return false;
    }
    
    const isImage = file.type.startsWith('image/');
    const isLt5M = file.size / 1024 / 1024 < 5;
    
    if (!isImage) {
      message.error(localStrings.Messages.OnlyImageFiles);
      return false;
    }
    
    if (!isLt5M) {
      message.error(localStrings.Messages.ImageMustSmallerThan5M);
      return false;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setImagePreview(previewUrl);
    };
    reader.readAsDataURL(file);
    
    setConversationImage(file);
    return false; 
  };

  const removeImage = () => {
    setConversationImage(null);
    setImagePreview(null);
  };

  const handleUpdateConversation = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setUpdating(true);
      
      let imageToSend: File | string | undefined = undefined;
      
      if (conversationImage) {
        imageToSend = conversationImage;
      } else if (imagePreview && (!currentConversation?.image || imagePreview !== currentConversation.image)) {
        imageToSend = imagePreview;
      }
      
      await onUpdateConversation(values.name, imageToSend);
      
      form.resetFields();
      setConversationImage(null);
      setImagePreview(null);
      
      onCancel();
    } catch (error) {
      console.error("Error updating conversation:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={localStrings.Messages.EditConversation}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {localStrings.Public.Cancel}
        </Button>,
        <Button 
          key="update" 
          type="primary" 
          onClick={handleUpdateConversation} 
          loading={updating}
        >
          {localStrings.Messages.Update}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="name" 
          label={localStrings.Messages.ConversationName}
          rules={[{ required: true, message: localStrings.Messages.ConversationNameRequired}]}
        >
          <Input placeholder={localStrings.Messages.GroupName} />
        </Form.Item>
        
        {/* Image Upload Section */}
        <Form.Item 
          name="image" 
          label={localStrings.Messages?.ConversationImage}
        >
          <Dragger
            name="avatar"
            multiple={false}
            showUploadList={false}
            beforeUpload={() => false}
            onChange={(info) => {
              handleImageUpload(info);
            }}
            accept="image/*"
          >
            {imagePreview ? (
              <div style={{ 
                position: 'relative',
                width: '100%',
                height: '200px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={imagePreview} 
                  alt="Conversation" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    objectFit: 'contain' 
                  }} 
                />
                <Button 
                  type="text" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  style={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {localStrings.Messages.Remove}
                </Button>
              </div>
            ) : (
              <div>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {localStrings.Messages?.ClickOrDragImageToUpload}
                </p>
                <p className="ant-upload-hint">
                  {localStrings.Messages?.SupportSingleImageUpload}
                </p>
              </div>
            )}
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditConversationModal;