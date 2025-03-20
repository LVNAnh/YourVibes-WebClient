import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";

export interface UpdatePostRequestModel {
  postId?: string;
  title?: string;
  content?: string;
  privacy?: Privacy;
  location?: string;
  media_ids?: string[];
  media?: {
    uri?: string;
    name?: string;
    type?: string;
  }[];
}
