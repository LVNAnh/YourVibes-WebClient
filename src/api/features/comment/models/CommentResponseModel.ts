export interface CommentsResponseModel {
    id: string;
    postId: string;
    parent_id?: string;
    content: string;
    like_count: number;
    rep_comment_count: number;
    created_at: string;
    user: {
        id?: string;
        avatar_url?: string;
        family_name?: string;
        name?: string;
    };
    is_liked?: boolean;
}