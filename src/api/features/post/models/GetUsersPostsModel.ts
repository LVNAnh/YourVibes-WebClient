import { PostResponseModel } from "./PostResponseModel"

export interface GetUsersPostsRequestModel {
  user_id?: string
  title?: string
  content?: string
  location?: string
  is_advertisement?: boolean
  created_at?: string
  sort_by?: keyof PostResponseModel
  isDescending?: boolean
  limit?: number
  page?: number
}