"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AuthContextType } from "./authContextType";
import { VnLocalizedStrings } from "@/utils/localizedStrings/vietnam";
import { ENGLocalizedStrings } from "@/utils/localizedStrings/english";
import translateLanguage from "../../utils/i18n/translateLanguage";
import { useRouter } from "next/navigation";
import { UserModel } from "../../api/features/authenticate/model/LoginModel";
import { jwtDecode } from "jwt-decode";

class AuthManager {
  private static instance: AuthManager;
  private localStrings: any = VnLocalizedStrings;
  private language: "vi" | "en" = "vi";
  private user: UserModel | null = null;
  private isAuthenticated: boolean = false;
  private router: any;
  private listeners: Array<() => void> = [];

  private constructor(router: any) { 
    if (!AuthManager.instance) {
      AuthManager.instance = this;  
    }
    this.router = router;
  }

  public static getInstance(router?: any): AuthManager { 
    if (!AuthManager.instance && router)
      return new AuthManager(router);
    return AuthManager.instance!;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getLocalStrings() {
    return this.localStrings;
  }

  public getLanguage() {
    return this.language;
  }

  public getUser() {
    return this.user;
  }

  public getIsAuthenticated() {
    return this.isAuthenticated;
  }

  public checkLanguage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedLanguage = localStorage.getItem("language");
      if (storedLanguage === "vi") {
        this.language = "vi";
        this.localStrings = VnLocalizedStrings;
      } else {
        this.language = "en";
        this.localStrings = ENGLocalizedStrings;
      }
    }
    this.notifyListeners();
  }

  public changeLanguage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const lng = this.language === "vi" ? "en" : "vi";
      translateLanguage(lng).then(() => {
        localStorage.setItem("language", lng);
        this.language = lng;
        this.localStrings = lng === "vi" ? VnLocalizedStrings : ENGLocalizedStrings;
        this.notifyListeners();
      });
    }
  }

  public onLogin(user: any) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem("user", JSON.stringify(user.user));
      localStorage.setItem("accesstoken", user.access_token);

      const decodedToken: any = jwtDecode(user.access_token);
      const expiresAt = new Date(decodedToken.exp * 1000);
      document.cookie = `accesstoken=${user.access_token}; path=/; ${
        window.location.protocol === 'http:'
          ? 'SameSite=Lax'
          : 'SameSite=None; Secure'
      }; expires=${expiresAt.toUTCString()}`;
    }

    this.isAuthenticated = true;
    this.user = user.user;
    this.notifyListeners();
    this.router.push("/home");
  }

  public onUpdateProfile(user: any) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem("user");
      localStorage.setItem("user", JSON.stringify(user));
    }

    this.isAuthenticated = true;
    this.user = user;
    this.notifyListeners();
  }

  public async onLogout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem("user");
      localStorage.removeItem("accesstoken");
      document.cookie =
        "accesstoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    this.isAuthenticated = false;
    this.user = null;
    this.notifyListeners();
    this.router.push("/login");
  }

  public isLoginUser(userId: string) {
    return this.user?.id === userId;
  }

  public checkAuthStatus() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUser = localStorage.getItem("user");
      const storedAccessToken = localStorage.getItem("accesstoken");

      try {
        if (storedUser && storedAccessToken) {
          this.user = JSON.parse(storedUser);
          this.isAuthenticated = true;
        } else {
          this.isAuthenticated = false;
        }
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("user");
        this.isAuthenticated = false;
      }
    }
    this.notifyListeners();
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const authManager = AuthManager.getInstance(router);  

  const [state, setState] = useState({});

  useEffect(() => {
    const unsubscribe = authManager.subscribe(() => {
      setState({});
    });
    return unsubscribe;
  }, [authManager]);

  useEffect(() => {
    authManager.checkLanguage();  
    authManager.checkAuthStatus(); 
  }, []);

  return (
    <AuthContext.Provider
      value={{
        onLogin: authManager.onLogin.bind(authManager),
        onLogout: authManager.onLogout.bind(authManager),
        localStrings: authManager.getLocalStrings(),
        changeLanguage: authManager.changeLanguage.bind(authManager),
        language: authManager.getLanguage(),
        setLanguage: () => { },  
        isAuthenticated: authManager.getIsAuthenticated(),
        user: authManager.getUser(),
        onUpdateProfile: authManager.onUpdateProfile.bind(authManager),
        isLoginUser: authManager.isLoginUser.bind(authManager),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
