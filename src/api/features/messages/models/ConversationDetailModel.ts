export interface CreateConversationDetailRequestModel {
    conversation_id?: string,
    last_mess?: string,
    user_id?: string,
}

export interface GetConversationDetailByIDRequestModel {
    userId?: string,
    conversationId?: string,
}

export interface GetConversationDetailByUserIDRequestModel {
    conversation_id?: string,
    limit?: number,
    page?: number,
}

export interface DeleteConversationDetailRequestModel {
    user_id?: string,
    conversation_id?: string,
}

export interface UpdateConversationDetail {
    conversation_id?: string,
    user_id?: string,
}

export interface ConversationDetailResponseModel {
    user_id?: string,
    conversation_id?: string,
    user?: {
        id?: string,
        family_name?: string,
        name?: string,
        avatar_url?: string,
    }
    conversation?: {
        id?: string,
        name?: string,
        image?: string,
        created_at?: string,
        updated_at?: string,
    }
    last_mess_status?: boolean,
    last_mess?: string,
}