export interface LikeUsersModel {
  id: string
  family_name: string
  name: string
  avatar_url: string
}

export interface LikeUsersResponseModel {
  postId?: string
  page?: number
  limit?: number
}