export interface GoogleLoginRequestModel {
  authorization_code?: string,
  platform?: "web" | "android" | "ios"
  redirect_url?: string
}