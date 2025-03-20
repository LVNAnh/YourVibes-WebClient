export interface GetCommentsRequestModel {
    PostId: string;
    parent_id?: string;
    page: number;
    limit: number;
}
