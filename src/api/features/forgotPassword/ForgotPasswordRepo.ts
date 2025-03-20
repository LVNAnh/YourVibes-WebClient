import client from "../../client";
import { ApiPath } from "@/api/ApiPath";
import {
  ForgotPasswordResponseModel,
  VerifyOTPRequestModel,
} from "@/api/features/forgotPassword/models/ForgotPassword";

export class ForgotPasswordRepo {
  private readonly apiPath = ApiPath.FORGOT_PASSWORD;

  public async verifyOTP(
    request: VerifyOTPRequestModel
  ): Promise<ForgotPasswordResponseModel> {
    try {
      const response = await client.post(ApiPath.GET_OTP_FORGOOT_PASSWORD, request);
      console.log(response); // xem thông tin chi tiết về response
      return response.data as ForgotPasswordResponseModel;
    } catch (error) {
      console.error(error); // xem thông tin chi tiết về lỗi
      throw error;
    }
  }

  public async resetPassword(
    request: ForgotPasswordResponseModel
  ): Promise<ForgotPasswordResponseModel> {
    const response = await client.post(
      ApiPath.FORGOT_PASSWORD,
      request
    );
    return response.data as ForgotPasswordResponseModel;
  }
}

export const defaultForgotPasswordRepo = new ForgotPasswordRepo();