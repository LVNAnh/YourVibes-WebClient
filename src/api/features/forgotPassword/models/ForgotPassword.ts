export interface VerifyOTPRequestModel {
  email: string; 
}

export interface ForgotPasswordResponseModel {
  email: string;
  new_password: string;
  otp: string;
}