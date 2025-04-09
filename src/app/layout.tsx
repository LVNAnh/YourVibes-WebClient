import { PostProvider } from "@/context/post/usePostContext";
import { AuthProvider } from "../context/auth/useAuth";
import { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";
import { ConfigProvider } from "antd";
import useColor from "@/hooks/useColor";
import { WebSocketNotiProvider } from "@/context/notiSocket/useNotiSocket";
import { WebSocketMessageProvider } from "@/context/websocket/useWebSocket";

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
            <WebSocketNotiProvider>
              <WebSocketMessageProvider>
                <PostProvider>
                  <body>{children}</body>
                </PostProvider>
              </WebSocketMessageProvider>
            </WebSocketNotiProvider>
          </AuthProvider>
        </ConfigProvider>
      </AntdRegistry>
    </html>
  );
}
