import { VnLocalizedStrings } from "@/utils/localizedStrings/vietnam";
import { ENGLocalizedStrings } from "@/utils/localizedStrings/english";
import { UserModel } from "../../api/features/authenticate/model/LoginModel";

export interface AuthContextType {
  onLogin: (user: any) => void;
  onUpdateProfile: (user: any) => void;
  onLogout: () => void;
  localStrings: typeof VnLocalizedStrings | typeof ENGLocalizedStrings; 
  changeLanguage: () => void;
  language: "vi" | "en";
  setLanguage: (lng: "vi" | "en") => void;
  user: UserModel | null;
  isAuthenticated: boolean;
  isLoginUser: (userId: string) => boolean;
}