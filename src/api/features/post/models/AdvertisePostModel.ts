export interface AdvertisePostRequestModel {
  post_id?: string;
  start_date?: string;
  end_date?: string;
  redirect_url?: string;
  voucher_code?: string;
  day_remaining?: number;
}

export interface GetAdvertiseRequestModel {
  post_id?: string;
  page?: number;
  limit?: number;
}

export interface StatisticEntry {
  post_id: string;
  reach: number;
  clicks: number;
  impression: number;
  aggregation_date: string;
}

export interface AdStatisticsModel {
  total_reach: number;
  total_clicks: number;
  total_impression: number;
  statistics: StatisticEntry[];
}

export interface UserModel {
  id: string;
  family_name: string;
  name: string;
  email: string;
  phone_number: string;
  birthday: string;
  avatar_url: string;
  capwall_url: string;
  privacy: string;
  biography: string;
  post_count: number;
  friend_count: number;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaModel {
  id: number;
  post_id: string;
  media_url: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostModel {
  id: string;
  user_id: string;
  user: UserModel;
  parent_id: string | null;
  parent_post: any | null; 
  content: string;
  like_count: number;
  comment_count: number;
  privacy: string;
  location: string;
  is_advertisement: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  media: MediaModel[];
}

export interface BillModel {
  id?: string;
  advertise_id?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
  status?: boolean;
}

export interface AdvertisePostResponseModel {
  media?: MediaModel[];
  content?: string;
  id?: string;
  post_id?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  day_remaining?: number;
  bill?: BillModel;
  post?: PostModel;
  total_reach?: number;
  total_clicks?: number;
  total_impression?: number;
  statistics?: StatisticEntry[];
  is_advertisement?: number;
  status?: string;
}