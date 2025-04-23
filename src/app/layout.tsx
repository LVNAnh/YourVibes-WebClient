import { PostProvider } from "@/context/post/usePostContext";
import { AuthProvider } from "../context/auth/useAuth";
import { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";
import { ConfigProvider } from "antd";
import useColor from "@/hooks/useColor";
import { WebSocketProvider } from "@/context/socket/useSocket";
import { VideoChatProvider } from '@/context/videoChat/videoChatContext';
import IncomingCallModal from "@/components/common/VideoChat/IncomingCallModal";
import VideoCallModal from "@/components/common/VideoChat/VideoCallModal";
import MessengerVideoCallModal from "@/components/common/VideoChat/MessengerVideoCallModal";


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
              <VideoChatProvider>
                  <PostProvider>
                    <body>{children}</body>
                  </PostProvider>
                  <IncomingCallModal />
                  <MessengerVideoCallModal />
              <VideoCallModal />
              </VideoChatProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ConfigProvider>
      </AntdRegistry>
    </html>
  );
}