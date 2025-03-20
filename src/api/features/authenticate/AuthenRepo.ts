import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { GoogleLoginRequestModel } from "./model/GoogleLoginModel";
import { LoginRequestModel, LoginResponseModel, UserModel } from "./model/LoginModel";
import { RegisterRequestModel } from "./model/RegisterModel";
import { VerifyOTPRequestModel } from "./model/VerifyOTPModel";

interface IAuthenRepo {
  login(data: LoginRequestModel): Promise<BaseApiResponseModel<LoginResponseModel>>;
  register(data: RegisterRequestModel): Promise<BaseApiResponseModel<UserModel>>;
  verifyOTP(data: VerifyOTPRequestModel): Promise<BaseApiResponseModel<any>>;
  googleLogin(data: GoogleLoginRequestModel): Promise<BaseApiResponseModel<LoginResponseModel>>
}

export class AuthenRepo implements IAuthenRepo {
  async login(data: LoginRequestModel): Promise<BaseApiResponseModel<LoginResponseModel>> {
    return client.post(ApiPath.LOGIN, data);
  }

  async register(data: RegisterRequestModel): Promise<BaseApiResponseModel<UserModel>> {
    return client.post(ApiPath.REGISTER, data);
  }

  async verifyOTP(data: VerifyOTPRequestModel): Promise<BaseApiResponseModel<any>> {
    return client.post(ApiPath.VERIFIED_EMAIL, data);
  }

  async googleLogin(data: GoogleLoginRequestModel): Promise<BaseApiResponseModel<LoginResponseModel>> {
    return client.post(ApiPath.GOOGLE_LOGIN, data);
  }
}

export const defaultAuthenRepo = new AuthenRepo();