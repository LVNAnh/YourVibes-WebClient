import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"

export interface PostResponseModel {
  id?: string
  parent_id?: string,
  parent_post?: PostResponseModel,
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
  media?: PostMediaModel[]
}

export interface PostMediaModel {
  post_id?: string,
  media_url?: string,
  created_at?: string
  status?: boolean
  id?: number
}