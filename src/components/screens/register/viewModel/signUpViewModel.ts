import { AuthenRepo } from "@/api/features/authenticate/AuthenRepo";
import { useState } from "react";
import { RegisterRequestModel } from "@/api/features/authenticate/model/RegisterModel";
import { VerifyOTPRequestModel } from "@/api/features/authenticate/model/VerifyOTPModel";
import dayjs from "dayjs";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { CustomStatusCode } from "@/utils/helper/CustomStatus";
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

// Handle sign up
const SignUpViewModel = (repo: AuthenRepo) => {
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const { localStrings } = useAuth();

  const handleSignUp = async (data: RegisterRequestModel) => {
    try {
      setLoading(true);
      const params: RegisterRequestModel = {
        family_name: data?.family_name,
        name: data?.name,
        email: data?.email,
        password: data?.password,
        phone_number: data?.phone_number,
        birthday: (
          dayjs(data?.birthday, "DD/MM/YYYY").format("YYYY-MM-DDT00:00:00") +
          "Z"
        ).toString(),
        otp: data?.otp,
      };
      const response = await repo.register(params);

      if (response && !response?.error) {
        message.success(`${localStrings.SignUp.SignUpSuccess}`);
        return true; // Trả về true để báo hiệu thành công
      }else {
        if (response?.error?.code === CustomStatusCode.InvalidOTP){
          message.error(`${localStrings.SignUp.OTPExpired}`)}
          else if (response?.error?.code === CustomStatusCode.UserHasExists ){
            message.error(`${localStrings.SignUp.OTPFailedUserHasRegistered}`)}
          else{
            message.error(`${localStrings.SignUp.SignUpFailed}`)}
        return false; // Trả về false để báo hiệu thất bại
      }
    } catch (error: any) {
      console.error("Error:", error);
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message;
        throw new Error(errorMessage);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra gửi OTP
  const verifyOTP = async (data: VerifyOTPRequestModel) => {
    try {
      setOtpLoading(true);
      const response = await repo.verifyOTP(data);
console.log("response", response);

      if (!response?.error) {
        message.success(`${localStrings.SignUp.OTPSuccess}`);
        return true; // Trả về true để báo hiệu thành công
      }else {
        if (response?.error?.code === CustomStatusCode.UserHasExists){
        message.error(`${localStrings.SignUp.OTPFailedUserHasRegistered}`)}else if (response?.error?.code === CustomStatusCode.OtpNotExists){
          message.error(`${localStrings.SignUp.OTPEmail
          }`)}
        else{
          message.error(`${localStrings.SignUp.OTPFailed}`)}
        // return false; // Trả về false để báo hiệu thất bại
      }
    } catch (error: any) {
      console.error(error);
        const errorMessage = error.response?.data?.message;
        throw new Error(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  return {
    loading,
    otpLoading,
    handleSignUp,
    verifyOTP,
  };
};

export default SignUpViewModel;
