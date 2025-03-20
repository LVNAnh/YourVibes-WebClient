import { ForgotPasswordRepo } from "@/api/features/forgotPassword/ForgotPasswordRepo";
import {ForgotPasswordResponseModel } from "@/api/features/forgotPassword/models/ForgotPassword";
import { VnLocalizedStrings } from "@/utils/localizedStrings/vietnam";
import { message } from "antd";
import { Content } from "antd/es/layout/layout";
import { useAuth } from "@/context/auth/useAuth";

const {localStrings} = useAuth();
        

export class ForgotPasswordViewModel {
  private repo: ForgotPasswordRepo; 
        
  constructor() {
    this.repo = new ForgotPasswordRepo();
  }

  // Yêu cầu OTP
  public async requestOTP(email: string, otp: string): Promise<void> {
    try {
      if (!email) { 
        message.error(localStrings.Form.RequiredMessages.EmailRequiredMessage);
        return;
      }
      await this.repo.verifyOTP({ email });
      message.success(localStrings.SignUp.OTPSuccess); 
    } catch (error) {
      message.error(localStrings.SignUp.OTPFailed);
    }
  }

  // Đặt lại mật khẩu
  public async resetPassword(request: ForgotPasswordResponseModel): Promise<void> {
    try {
      const { email, new_password, otp } = request;
      if (!email || !new_password || !otp) {
        message.error(localStrings.Form.TypeMessage.PleaseInformationDifferent);
        return;
      }
      await this.repo.resetPassword({ email, new_password, otp });
      message.success(localStrings.PostDetails.Success);
    } catch (error) {
      message.error(localStrings.PostDetails.Error);
    }
  }
}