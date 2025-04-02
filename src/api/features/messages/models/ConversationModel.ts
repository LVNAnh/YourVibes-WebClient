export interface CreateConversationRequestModel {
    name?: string,
    image?: File | string, 
    user_ids: string[],
}

export interface GetCoversationRequestModel {
    name?: string,
    created_at?: string,
    sort_by?: string,
    isDescending?: boolean,
    limit?: number,
    page?: number,
}

export interface GetConversationByIDRequestModel {
    conversation_id?: string,
}

export interface DeleteConversationByIDRequestModel {
    conversation_id?: string,
}

export interface UpdateConversationRequestModel {
    conversation_id?: string,
    name?: string,
    image?: string,
}

export interface ConversationResponseModel {
    id?: string,
    name?: string,
    image?: string,
    user_id?: string,
    created_at?: string,
    updated_at?: string,
}
