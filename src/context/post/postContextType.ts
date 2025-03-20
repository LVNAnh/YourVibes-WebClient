import { Privacy } from "@/api/baseApiResponseModel/baseApiResponseModel";

export interface PostContextType {
  savedPostContent?: string;
  setSavedPostContent?: (postContent: string | undefined) => void;
  savedPrivacy?: Privacy;
  setSavedPrivacy?: (privacy: Privacy | undefined) => void;
  savedSelectedImageFiles?: any[];
  setSavedSelectedImageFiles?: (selectedImageFiles: any[] | undefined) => void;
  clearSavedPost?: () => void
}