export interface CreateMessageRequestModel {
    content?: string,
    conversation_id?: string,
    parent_id?: string,
    parent_content?: string,
    user?:{
        avatar_url?: string,
        family_name?: string,
        id?: string,
        name?: string,
    }
}

export interface GetMessagesByConversationIdRequestModel {
    conversation_id?: string,
    page?: number,
    limit?: number
}

export interface GetMessageByIDRequestModel {
    messageId?: string,
}

export interface DeleteMessageRequestModel {
    message_id?: string,
}

export interface MessageResponseModel {
    id?: string,
    user_id?: string,
    user?: {
        id?: string,
        family_name?: string,
        name?: string,
        avatar_url?: string,
    }
    conversation_id?: string,
    parent_id?: string,
    content?: string,
    created_at?: string,
    updated_at?: string,
    deleted_at?: string,
    
    text?: string,                
    isTemporary?: boolean,        
    reply_to?: MessageResponseModel 
}