import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";

import {
  CreateConversationRequestModel,
  GetCoversationRequestModel,
  GetConversationByIDRequestModel,
  DeleteConversationByIDRequestModel,
  ConversationResponseModel
} from "./models/ConversationModel";

import {
  CreateConversationDetailRequestModel,
  GetConversationDetailByIDRequestModel,
  GetConversationDetailByUserIDRequestModel,
  DeleteConversationDetailRequestModel,
  ConversationDetailResponseModel
} from "./models/ConversationDetailModel";

import {
  CreateMessageRequestModel,
  GetMessagesByConversationIdRequestModel,
  GetMessageByIDRequestModel,
  DeleteMessageRequestModel,
  MessageResponseModel
} from "./models/MessageModel";

// Định nghĩa interface cho repo của tin nhắn
interface IMessagesRepo {
  // Các phương thức liên quan đến Conversation
  createConversation(data: CreateConversationRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  getConversations(params: GetCoversationRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  getConversationById(params: GetConversationByIDRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  deleteConversation(data: DeleteConversationByIDRequestModel): Promise<BaseApiResponseModel<any>>;

  // Các phương thức liên quan đến Conversation Detail
  createConversationDetail(data: CreateConversationDetailRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  getConversationDetailByID(data: GetConversationDetailByIDRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  getConversationDetailByUserID(data: GetConversationDetailByUserIDRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  deleteConversationDetail(data: DeleteConversationDetailRequestModel): Promise<BaseApiResponseModel<any>>;

  // Các phương thức liên quan đến Message
  createMessage(data: CreateMessageRequestModel): Promise<BaseApiResponseModel<MessageResponseModel>>;
  getMessagesByConversationId(data: GetMessagesByConversationIdRequestModel): Promise<BaseApiResponseModel<MessageResponseModel>>;
  getMessageByID(data: GetMessageByIDRequestModel): Promise<BaseApiResponseModel<MessageResponseModel>>;
  deleteMessage(data: DeleteMessageRequestModel): Promise<BaseApiResponseModel<any>>;
}

export class MessagesRepo implements IMessagesRepo {
  // Conversation methods
  async createConversation(
    data: CreateConversationRequestModel
  ): Promise<BaseApiResponseModel<ConversationResponseModel>> {
    return client.post(ApiPath.CREATE_CONVERSATION, data);
  }

  async getConversations(
    params: GetCoversationRequestModel
  ): Promise<BaseApiResponseModel<ConversationResponseModel>> {
    return client.get(ApiPath.GET_CONVERSATION, params);
  }

  async getConversationById(
    params: GetConversationByIDRequestModel
  ): Promise<BaseApiResponseModel<ConversationResponseModel>> {
    return client.get(`${ApiPath.GET_CONVERSATION}${params.conversation_id}`);
  }

  async deleteConversation(
    data: DeleteConversationByIDRequestModel
  ): Promise<BaseApiResponseModel<any>> {
    return client.delete(`${ApiPath.DELETE_CONVERSATION}${data.conversation_id}`);
  }

  // Conversation Detail methods
  async createConversationDetail(
    data: CreateConversationDetailRequestModel
  ): Promise<BaseApiResponseModel<ConversationDetailResponseModel>> {
    return client.post(ApiPath.CREATE_CONVERSATION_DETAIL, data);
  }

  async getConversationDetailByID(
    data: GetConversationDetailByIDRequestModel
  ): Promise<BaseApiResponseModel<ConversationDetailResponseModel>> {
    return client.get(`${ApiPath.GET_CONVERSATION_DETAIL_BY_ID}/${data.userId}/${data.conversationId}`);
  }

  async getConversationDetailByUserID(
    data: GetConversationDetailByUserIDRequestModel
  ): Promise<BaseApiResponseModel<ConversationDetailResponseModel>> {
    return client.get(ApiPath.GET_CONVERSATION_DETAIL_BY_USER_ID, data);
  }

  async deleteConversationDetail(data: DeleteConversationDetailRequestModel): Promise<BaseApiResponseModel<any>> {
      return client.delete(`${ApiPath.DELETE_CONVERSATION_DETAIL}${data.user_id}/${data.conversation_id}`);
  }

  // Message methods
  async createMessage(
    data: CreateMessageRequestModel
  ): Promise<BaseApiResponseModel<MessageResponseModel>> {
    return client.post(ApiPath.CREATE_MESSAGE, data);
  }

  async getMessagesByConversationId(
    data: GetMessagesByConversationIdRequestModel
  ): Promise<BaseApiResponseModel<MessageResponseModel>> {
    console.log("API call - getMessagesByConversationId with params:", data);
    
    if (!data.conversation_id) {
      console.error("Missing conversation_id in getMessagesByConversationId call");
      throw new Error("conversation_id is required");
    }
    
    try {
      const response = await client.get(
        `${ApiPath.GET_MESSAGES_BY_CONVERSATION_ID}?conversation_id=${data.conversation_id}&page=${data.page || 1}&limit=${data.limit || 100}`
      );
      
      console.log("API response received:", response);
      return response;
    } catch (error) {
      console.error("Error in getMessagesByConversationId:", error);
      throw error;
    }
  }

  async getMessageByID(
    data: GetMessageByIDRequestModel
  ): Promise<BaseApiResponseModel<MessageResponseModel>> {
    return client.get(`${ApiPath.GET_MESSAGE_BY_ID}${data.messageId}`);
  }

  async deleteMessage(data: DeleteMessageRequestModel): Promise<BaseApiResponseModel<any>> {
      return client.delete(`${ApiPath.DELETE_MESSAGE}${data.message_id}`)
  }
}

export const defaultMessagesRepo = new MessagesRepo();
