export interface UpdateProfileRequestModel {
  family_name?: string
  name?: string
  email?: string
  phone_number?: string
  birthday?: string
  avatar_url?: {
    uri?: string
    name?: string
    type?: string
  }
  capwall_url?: {
    uri?: string
    name?: string
    type?: string
  }
  privacy?: string
  biography?: string
  language_setting?: string
}