import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"

export interface NewFeedRequestModel {
    limit?: number,
    page?: number
}

export interface NewFeedResponseModel {
    id?: string
    parent_id?: string,
    parent_post?: NewFeedResponseModel,
    content?: string,
    created_at?: string,
    updated_at?: string,
    user_id?: string,
    user?: {
        id?: string,
        family_name?: string,
        name?: string,
        avatar_url?: string
    },
    like_count?: number,
    comment_count?: number,
    privacy?: Privacy,
    status?: boolean,
    location?: string,
    is_advertisement?: boolean,
    is_liked?: boolean,
    media?: NewFeedMediaModel[]
}
export interface NewFeedMediaModel {
    post_id?: string,
    media_url?: string,
    created_at?: string
    status?: boolean
    id?: number
}