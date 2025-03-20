import { UserModel } from "../../authenticate/model/LoginModel";

export interface SearchRequestModel {
  name?: string;
  email?: string;
  phone_number?: string;
  birthday?: string;
  created_at?: string;
  sort_by?: keyof UserModel;
  isDescending?: boolean;
  limit?: number;
  page?: number;
}