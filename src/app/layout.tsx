import { PostProvider } from "@/context/post/usePostContext";
import { AuthProvider } from "../context/auth/useAuth";
import { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";
import { ConfigProvider } from "antd";
import useColor from "@/hooks/useColor";
import { WebSocketProvider } from "@/context/socket/useSocket";


export const metadata: Metadata = {
  title: "YourVibes",
  description: "...",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brandPrimary } = useColor();
  return (
    <html lang="en">
      <AntdRegistry>
        <ConfigProvider
          theme={{
            token: { colorPrimary: brandPrimary },
            components: {
              Select: {
                optionSelectedColor: "#fff",
              }
            }
          }}
        >
          <AuthProvider>
            <WebSocketProvider>
                <PostProvider>
                  <body>{children}</body>
                </PostProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ConfigProvider>
      </AntdRegistry>
    </html>
  );
}