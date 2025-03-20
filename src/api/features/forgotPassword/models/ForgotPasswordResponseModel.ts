import { BaseApiResponseModel } from "@/api/baseApiResponseModel/baseApiResponseModel";

export interface ForgotPasswordResponseModel extends BaseApiResponseModel<ForgotPasswordResponseModel> {
    message: string;
}
