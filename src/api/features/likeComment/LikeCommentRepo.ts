import { ApiPath } from "../../ApiPath"; 
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { PostLikeCommentRequestModel } from "./models/PostLikeCommentRequestModel";
import { GetLikeCommentModel } from "./models/GetLikeCommentRequestModel";

interface ILikeCommentRepo {
    postLikeComment(data: PostLikeCommentRequestModel): Promise<BaseApiResponseModel<any>> 
    getLikeComment(data: GetLikeCommentModel): Promise<BaseApiResponseModel<any>>
}

export class LikeCommentRepo implements ILikeCommentRepo {
    postLikeComment(data: PostLikeCommentRequestModel): Promise<BaseApiResponseModel<any>> {
        return client.post(`${ApiPath.POST_LIKE_COMMENT}${data.commentId}`, data);
      } 
    getLikeComment(data: GetLikeCommentModel): Promise<BaseApiResponseModel<any>> {
        return client.get(ApiPath.GET_LIKE_COMMENT, data);
    }
}

export const defaultLikeCommentRepo = new LikeCommentRepo();