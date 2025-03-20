"use client";
import React from "react";
import { Button, Checkbox, DatePicker, Form, Input, message } from "antd";
import { ForgotPasswordRepo } from "@/api/features/forgotPassword/ForgotPasswordRepo";
import { useAuth } from "@/context/auth/useAuth";
import {
  ForgotPasswordResponseModel,
  VerifyOTPRequestModel,
} from "@/api/features/forgotPassword/models/ForgotPassword";
import { useRouter } from "next/navigation";
 const ForgotPasswordFeature: React.FC = () => {
  const [form] = Form.useForm();
  const repo = new ForgotPasswordRepo(); 
  const { language, localStrings } = useAuth();
  const router = useRouter();
  const onRequestOTP = async () => {
    try {
      const email = form.getFieldValue("email");
      if (!email) {
        message.error(localStrings.Form.RequiredMessages.EmailRequiredMessage);
        return;
      }
      await repo.verifyOTP({ email });
      message.success(localStrings.SignUp.OTPSuccess);
    } catch (error) {
      message.error(localStrings.SignUp.OTPFailed);
    }
  };

  function onForgotPassword(values: any): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-lg p-8 border border-gray-300 rounded-lg shadow-md bg-white">
        {/* Title */}
        <h1 className="text-lg font-bold text-gray-600 mb-6 text-center">
          {localStrings.Login.ForgotPasswordText}
        </h1>

        {/* Form */}
        <Form form={form} layout="vertical" onFinish={onForgotPassword}>
          {/* Email and OTP */}
          <div className="grid grid-cols-3 gap-4">
            <Form.Item
              name="email"
              className="col-span-2"
              rules={[
                {
                  required: true,
                  message:
                    localStrings.Form.RequiredMessages.EmailRequiredMessage,
                },
              ]}
            >
              <Input placeholder="Email" className="w-full" />
            </Form.Item>
            <Button
              block
              type="default"
              className="bg-black text-white rounded"
              onClick={onRequestOTP}
            >
              {localStrings.Form.Label.GetOTP}
            </Button>
          </div>

          {/* Password */}
          <Form.Item
            name="new_password"
            rules={[
              {
                required: true,
                message:
                  localStrings.Form.RequiredMessages.PasswordRequiredMessage,
              },
              {
                min: 8,
                message: localStrings.Form.TypeMessage.PasswordTypeMessage,
              },
            ]}
          >
            <Input.Password
              placeholder={localStrings.Form.Label.Password}
              className="w-full"
            />
          </Form.Item>

          {/* Confirm Password */}
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              {
                required: true,
                message:
                  localStrings.Form.RequiredMessages
                    .ConfirmPasswordRequiredMessage,
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    localStrings.Form.TypeMessage.ConfirmPasswordTypeMessage
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={localStrings.Form.Label.ConfirmPassword}
              className="w-full"
            />
          </Form.Item>

          {/* Confirm OTP */}
          <Form.Item
            name="otp"
            rules={[
              {
                required: true,
                message: localStrings.Form.RequiredMessages.OTPRequiredMessage,
              },
            ]}
          >
            <Input
              placeholder={localStrings.Form.Label.OTP}
              className="w-full"
            />
          </Form.Item>

          {/* Submit Button */}
          <Button
            type="default"
            block
            size="large"
            htmlType="submit"
            className="mt-4 font-bold bg-black text-white rounded"
            onClick={async () => {
              try {
                const values = await form.validateFields();
                await repo.resetPassword(values as ForgotPasswordResponseModel);
                message.success(
                  localStrings.ChangePassword.ChangePasswordSuccess
                ); 
                router.push('/login'); 
              } catch (error) {
                message.error(localStrings.ChangePassword.ChangePasswordFailed);
              } 
            }}
          >
            {localStrings.Form.Label.ConfirmPassword}
          </Button>

          {/* Additional Links */}
          <div className="mt-4 text-center">
            <span>
              {localStrings.SignUp.AlreadyHaveAccount}{" "}
              <a href="/login" className="text-blue-500">
                {localStrings.SignUp.LoginNow}
              </a>
            </span>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ForgotPasswordFeature;