import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"

// Interface cho Suggestion
export interface SuggestionUserModel {
    id?: string;
    family_name?: string;
    name?: string;
    avatar_url?: string;
    is_send_friend_request?: boolean;
}

export interface SuggestionResponseModel {
    code: number;
    message: string;
    data: SuggestionUserModel[];
    paging: {
        limit: number;
        page: number;
        total: number;
    };
}

// Interface cho NewFeed
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
    is_advertisement?: number,
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