"use client";
import { ApiPath } from "@/api/ApiPath";
import { defaultNotificationRepo } from "@/api/features/notification/NotifiCationRepo";
import MainLayout from "@/components/common/MainLayouts/MainLayout";
import { useAuth } from "@/context/auth/useAuth";
import { Button, message, notification, Skeleton } from "antd";
import { Suspense, useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user, localStrings } = useAuth();
  const [statusNotifi, setStatusNotifi] = useState(false);

  const mapNotifiCationContent = (type: string) => {
    switch (type) {
      case 'like_post':
        return localStrings?.Notification?.Items?.LikePost || 'Like Post';
      case 'new_share':
        return localStrings?.Notification?.Items?.SharePost || 'Share Post';
      case 'new_comment':
        return localStrings?.Notification?.Items?.CommentPost || 'Comment Post';
      case 'friend_request':
        return localStrings?.Notification?.Items?.Friend || 'Friend Request';
      case 'accept_friend_request':
        return localStrings?.Notification?.Items?.AcceptFriend || 'Friend Request Accepted';
      case 'new_post':
        return localStrings?.Notification?.Items?.NewPost || 'New Post';
      case 'like_comment':
        return localStrings?.Notification?.Items?.LikeComment || 'Like Comment';
      default:
        return 'notifications';
    }
  };

  // const connectWebSocket = () => {
  //   const ws = new WebSocket(`${ApiPath.CONNECT_TO_WEBSOCKET}${user?.id}`);

  //   ws.onmessage = (e) => {
  //     const message = JSON.parse(e.data);
  //     // const { from: userName, content, notification_type: type } = notificationData;
  //     // const {content, name: name, family_name: family_name} = message
  //     const name = message?.user?.name
  //     const family_name = message?.user?.family_name
  //     const content = message?.content


  //     setStatusNotifi(true);

  //     // const mappedType = mapNotifiCationContent(type);

  //     const key = `open${Date.now()}`;

  //     notification.open({
  //       message: `${family_name} ${name}`,
  //       description: content,
  //       placement: "topRight",
  //       key,
  //     });
  //   };

  //   return () => {
  //     ws.close();
  //   };
  // };

//   const fetchData = async () => {
//     const token = document.cookie.replace(/(?:(?:^|.*;\s*)accesstoken\s*=\s*([^;]*).*$)|^.*$/, "$1");

//     const response = await fetch(`
// https://yourvibes.duckdns.org:8080/v1/2024/users/${user?.id}`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//       },
//     });

//     // Nếu nhận được lỗi 401 hoặc 403, điều hướng về trang login
//     if (response.status === 401 || response.status === 403) {
//       window.location.href = '/login';
//       message.error(localStrings.Public.LoginStatus);
//     } else {
//       const data = await response.json();
//       // Xử lý dữ liệu nếu không có lỗi
//     }
//   };

  // useEffect(() => {
  //   if (user?.id) {
  //     const closeWebSocket = connectWebSocket();
  //     { }
  //     return () => {
  //       closeWebSocket();
  //     };
  //   }
  // }, [user]);

  return (
    <Suspense fallback={<Skeleton paragraph={{ rows: 10 }} active />}>
      <div className="mb-10">
        <MainLayout>{children}</MainLayout>
      </div>
    </Suspense>
  );
}
