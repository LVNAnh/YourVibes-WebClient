import { AuthenRepo } from "@/api/features/authenticate/AuthenRepo";
import { LoginRequestModel } from "@/api/features/authenticate/model/LoginModel";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useSearchParams } from "next/navigation"; 

interface LoginObserver {
  onLoginStateChanged: (isLoading: boolean, error?: string) => void;
  onLoginSuccess: (data: any) => void;
}

const LoginViewModel = (repo: AuthenRepo) => {
  const { onLogin, localStrings } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [observers] = useState<LoginObserver[]>([]);

  const addObserver = (observer: LoginObserver) => {
    observers.push(observer);
  };

  const removeObserver = (observer: LoginObserver) => {
    const index = observers.indexOf(observer);
    if (index !== -1) {
      observers.splice(index, 1);
    }
  };

  const notifyLoading = (isLoading: boolean, error?: string) => {
    observers.forEach(observer => observer.onLoginStateChanged(isLoading, error));
  };

  const notifySuccess = (data: any) => {
    observers.forEach(observer => observer.onLoginSuccess(data));
  };

  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const error = useMemo(() => searchParams.get("error"), [searchParams]);

  const login = async (data: LoginRequestModel) => {
    try {
      setLoading(true);
      notifyLoading(true);
      const res = await repo.login(data);
      if (res?.data) {
        onLogin(res.data);
        notifyLoading(false);
        notifySuccess(res.data);
      } else {
        notifyLoading(false, localStrings.Login.LoginFailed);
      }
    } catch (error: any) {
      notifyLoading(false, localStrings.Login.LoginFailed);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleLoginUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}&redirect_uri=${window.location.origin}/login&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
  }, [process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID]);

  const handleGoogleLogin = async (code: string) => {
    try {
      setGoogleLoading(true);
      notifyLoading(true);  
      const res = await repo.googleLogin({
        authorization_code: code,
        platform: "web",
        redirect_url: `${window.location.origin}/login`,
      });
      if (res?.data) {
        onLogin(res.data);
        notifyLoading(false);
        notifySuccess(res.data);
      } else {
        notifyLoading(false, localStrings.Login.LoginFailed);
      }
    } catch (error: any) {
      notifyLoading(false, localStrings.Login.LoginFailed);
    } finally {
      setGoogleLoading(false); 
    }
  };

  useEffect(() => {
    if (code) {
      handleGoogleLogin(code);
    }
  }, [code]);

  useEffect(() => {
    if (error) {
      notifyLoading(false, localStrings.Login.LoginFailed);
    }
  }, [error]);

  return {
    login,
    loading,
    getGoogleLoginUrl,
    googleLoading,
    addObserver,
    removeObserver,
  };
};

export default LoginViewModel;