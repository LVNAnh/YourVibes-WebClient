import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";

import {
  CreateConversationRequestModel,
  GetCoversationRequestModel,
  GetConversationByIDRequestModel,
  DeleteConversationByIDRequestModel,
  ConversationResponseModel,
  UpdateConversationRequestModel // Import the existing update model
} from "./models/ConversationModel";

import {
  CreateConversationDetailRequestModel,
  GetConversationDetailByIDRequestModel,
  GetConversationDetailByUserIDRequestModel,
  DeleteConversationDetailRequestModel,
  ConversationDetailResponseModel,
  UpdateConversationDetail // Import the existing update model
} from "./models/ConversationDetailModel";

import {
  CreateMessageRequestModel,
  GetMessagesByConversationIdRequestModel,
  GetMessageByIDRequestModel,
  DeleteMessageRequestModel,
  MessageResponseModel
} from "./models/MessageModel";

// Updated interface for repo of messages
interface IMessagesRepo {
  // Conversation methods
  createConversation(data: CreateConversationRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  getConversations(params: GetCoversationRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  getConversationById(params: GetConversationByIDRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>;
  deleteConversation(data: DeleteConversationByIDRequestModel): Promise<BaseApiResponseModel<any>>;
  updateConversation(data: UpdateConversationRequestModel): Promise<BaseApiResponseModel<ConversationResponseModel>>; // New method

  // Conversation Detail methods
  createConversationDetail(data: CreateConversationDetailRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  getConversationDetailByID(data: GetConversationDetailByIDRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  getConversationDetailByUserID(data: GetConversationDetailByUserIDRequestModel): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>;
  deleteConversationDetail(data: DeleteConversationDetailRequestModel): Promise<BaseApiResponseModel<any>>;
  updateConversationDetail(data: UpdateConversationDetail): Promise<BaseApiResponseModel<ConversationDetailResponseModel>>; // New method

  // Message methods
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

  async updateConversation(
    data: UpdateConversationRequestModel
  ): Promise<BaseApiResponseModel<ConversationResponseModel>> {
    return client.patch(`${ApiPath.UPDATE_CONVERSATION}${data.conversation_id}`, {
      name: data.name,
      image: data.image
    });
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

  async deleteConversationDetail(
    data: DeleteConversationDetailRequestModel
  ): Promise<BaseApiResponseModel<any>> {
    return client.delete(`${ApiPath.DELETE_CONVERSATION_DETAIL}${data.user_id}/${data.conversation_id}`);
  }

  async updateConversationDetail(
    data: UpdateConversationDetail
  ): Promise<BaseApiResponseModel<ConversationDetailResponseModel>> {
    return client.patch(ApiPath.UPDATE_CONVERSATION_DETAIL, {
      conversation_id: data.conversation_id,
      user_id: data.user_id
    });
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
    return client.get(ApiPath.GET_MESSAGES_BY_CONVERSATION_ID, data);
  }

  async getMessageByID(
    data: GetMessageByIDRequestModel
  ): Promise<BaseApiResponseModel<MessageResponseModel>> {
    return client.get(`${ApiPath.GET_MESSAGE_BY_ID}${data.messageId}`);
  }

  async deleteMessage(
    data: DeleteMessageRequestModel
  ): Promise<BaseApiResponseModel<any>> {
    return client.delete(`${ApiPath.DELETE_MESSAGE}${data.message_id}`);
  }
}

export const defaultMessagesRepo = new MessagesRepo();