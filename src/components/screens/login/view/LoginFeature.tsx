"use client";
import React, { useEffect } from "react";
import { Form, Input, Button, message, Row, Col, Spin } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import LoginViewModel from "../viewModel/loginViewModel";
import { AuthenRepo } from "@/api/features/authenticate/AuthenRepo";
import "antd/dist/reset.css";
import { useAuth } from "@/context/auth/useAuth";
import { useState } from "react";

const LoginPage = () => {
  const { localStrings, changeLanguage } = useAuth();
  const router = useRouter();
  const loginViewModel = LoginViewModel(new AuthenRepo());
  const { login, loading, getGoogleLoginUrl, googleLoading, addObserver, removeObserver } = loginViewModel;
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLanguageChange = () => {
    changeLanguage();
  };

  const handleGoogleLoginClick = () => {
    setIsLoggingIn(true); 
    router.push(getGoogleLoginUrl);
  };

  useEffect(() => {
    const loginObserver = {
      onLoginStateChanged: (isLoading: boolean, error?: string) => {
        setIsLoggingIn(isLoading); 
        if (isLoading) {
          message.loading({
            content: `${localStrings.Public.LoginLoading}`,
            key: "login",
            duration: 0,
          });
        } else {
          message.destroy("login");
          if (error) {
            message.error(error);
          }
        }
      },
      onLoginSuccess: (data: any) => {
        setIsLoggingIn(false); 
      },
    };

    addObserver(loginObserver);
    return () => removeObserver(loginObserver);
  }, [addObserver, removeObserver, localStrings, router]);

  const onFinish = async (values: any) => {
    await login(values);
  };

  return (
    <Row className="min-h-screen" align={"middle"} justify={"center"}>
      <Col xs={0} lg={10} className="h-fit">
        <div className="flex justify-center">
          <img
            src="/image/yourvibes_black.png"
            alt="YourVibes"
            className="font-cursive text-black"
            width={300}
          />
        </div>
      </Col>
      <Col xs={20} lg={10} className="h-fit">
        <Row justify="center" align={"middle"} className="w-full h-full">
          <div
            className="w-full p-6 border border-gray-300 rounded-lg shadow-lg bg-white"
            style={{ boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
          >
            <Spin spinning={isLoggingIn} tip={localStrings.Public.LoginLoading}>
              <Form name="login" layout="vertical" onFinish={onFinish} className="w-full" disabled={isLoggingIn}>
                <Col span={24} className="h-fit pb-4">
                  <div className="flex justify-center">
                    <img
                      src="/image/yourvibes_black.png"
                      alt="YourVibes"
                      className="font-cursive text-black w-[60%] sm:w-[50%] md:w-[40%] lg:hidden block"
                    />
                  </div>
                </Col>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: localStrings.Form.RequiredMessages.EmailRequiredMessage },
                    { type: "email", message: localStrings.Form.TypeMessage.EmailTypeMessage },
                  ]}
                >
                  <Input
                    placeholder="Email"
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: localStrings.Form.RequiredMessages.PasswordRequiredMessage },
                  ]}
                >
                  <Input.Password
                    placeholder={localStrings.Form.Label.Password}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Item>
                <div className="mb-4 text-center text-xs">
                  <a href="/forgotPassword" className="text-blue-500 hover:underline">
                    {localStrings.Login.ForgotPasswordText}
                  </a>
                </div>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800"
                    loading={loading}
                    disabled={isLoggingIn} 
                  >
                    {localStrings.Login.LoginButton}
                  </Button>
                </Form.Item>
                <div className="text-center text-sm">
                  <span>
                    {localStrings.Login.DontHaveAccout}{" "}
                    <a href="/register" className="text-blue-500 hover:underline">
                      {localStrings.Login.SignUpNow}
                    </a>
                  </span>
                </div>
                <div className="mt-4 text-center text-sm font-semibold">{localStrings.Login.Or}</div>
                <div className="mt-4 text-center">
                  <Button
                    type="default"
                    icon={<GoogleOutlined />}
                    className="w-full flex items-center justify-center"
                    onClick={handleGoogleLoginClick} 
                    loading={googleLoading}
                    disabled={isLoggingIn}
                  >
                    Google
                  </Button>
                </div>
              </Form>
            </Spin>
            <Button
              type="primary"
              onClick={handleLanguageChange}
              className="w-full mt-4 bg-black text-white py-2 rounded-md hover:bg-gray-800"
              disabled={isLoggingIn}
            >
              {localStrings.Login.changeLanguage}
            </Button>
          </div>
        </Row>
      </Col>
    </Row>
  );
};

export default LoginPage;