import { FriendStatus, Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel"


export interface LoginRequestModel {
  email?: string
  password?: string
}

export interface LoginResponseModel {
  accesstoken?: string
  user?: UserModel
}

export interface UserModel {
  id?: string,
  family_name?: string,
  name?: string,
  biography?: string,
  email?: string,
  phone_number?: string,
  birthday?: string,
  avatar_url?: string,
  capwall_url?: string,
  privacy?: Privacy,
  auth_type?: string,
  auth_google_id?: string,
  post_count?: number,
  friend_count?: number,
  status?: boolean,
  created_at?: string,
  updated_at?: string,
  friend_status?: FriendStatus
}