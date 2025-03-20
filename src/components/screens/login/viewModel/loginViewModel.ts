import { AuthenRepo } from "@/api/features/authenticate/AuthenRepo";
import { LoginRequestModel } from "@/api/features/authenticate/model/LoginModel";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { useSearchParams } from "next/navigation";
import { message } from "antd";

const LoginViewModel = (repo: AuthenRepo) => {
  const { onLogin, localStrings } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const code = useMemo(() =>
    searchParams.get("code"),
    [searchParams, searchParams.get("code")]
  );

  const error = useMemo(() =>
    searchParams.get("error"),
    [searchParams, searchParams.get("error")]
  );

  const login = async (data: LoginRequestModel) => {
    try {
      setLoading(true);
      const res = await repo.login(data);
      if (res?.data) {
        onLogin(res.data); // Gọi onLogin từ useAuth
      } else { 
        message.error(localStrings.Login.LoginFailed);
      }
    } catch (error: any) {
      message.error(localStrings.Login.LoginFailed);
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
      const res = await repo.googleLogin({ 
        authorization_code: code, 
        platform: "web" ,
        redirect_url: `${window.location.origin}/login`
      });
      if (res?.data) {
        onLogin(res.data);
      } else { 
        message.error(localStrings.Login.LoginFailed);
      }
    } catch (error: any) { 
      message.error(localStrings.Login.LoginFailed);
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
      message.error(localStrings.Login.LoginFailed);
    }
  }, [error]);

  return {
    login,
    loading,
    getGoogleLoginUrl,
    googleLoading,
  };
};

export default LoginViewModel;