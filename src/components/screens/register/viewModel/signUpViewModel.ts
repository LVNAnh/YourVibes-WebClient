import { AuthenRepo } from "@/api/features/authenticate/AuthenRepo";
import { useState } from "react"; 
import { RegisterRequestModel } from "@/api/features/authenticate/model/RegisterModel";
import { VerifyOTPRequestModel } from "@/api/features/authenticate/model/VerifyOTPModel";
import dayjs from 'dayjs'; 
import { useAuth } from "@/context/auth/useAuth";
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat)  

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
        birthday: (dayjs(data?.birthday, "DD/MM/YYYY").format('YYYY-MM-DDT00:00:00') + "Z").toString(),
        otp: data?.otp,
      }
      const response = await repo.register(params);
      
      if (response && !response?.error) {
      }
    } catch (error) {
      console.error("Error:", error);

    } finally {
      setLoading(false);
    }
  }; 
  // Kiểm tra gửi OTP 
  const verifyOTP = async (data: VerifyOTPRequestModel) => {
    try {
      setOtpLoading(true);
      const response = await repo.verifyOTP(data);

      if (!response?.error) {
      }
    } catch (error) {
      console.error(error);

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