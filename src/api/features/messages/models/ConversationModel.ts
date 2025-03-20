export interface CreateConversationRequestModel {
    name?: string,
    image?: string,
}

export interface GetCoversationRequestModel {
    limit?: number,
    page?: number,
}

export interface GetConversationByIDRequestModel {
    conversation_id?: string,
}

export interface DeleteConversationByIDRequestModel {
    conversation_id?: string,
}

export interface ConversationResponseModel {
    id?: string,
    name?: string,
    image?: string,
    created_at?: string,
    updated_at?: string,
}
