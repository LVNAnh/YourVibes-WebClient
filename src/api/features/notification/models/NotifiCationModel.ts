export interface NotificationUserModel {
    id?: string
    family_name?: string
    name?: string
    avatar_url?: string
}

export interface GetNotifiCationRequestModel {
    from?: string
    notification_type?: string
    created_at?: string
    sort_by?: keyof GetNotifiCationRequestModel
    isDescending?: boolean
    limit?: number
    page?: number
    }
export interface NotificationResponseModel {
    id?: string
    from?: string
    from_url?: string
    users?: NotificationUserModel
    notification_type?: string
    content?: string
    created_at?: string
    status?: boolean
    content_id?: string
}