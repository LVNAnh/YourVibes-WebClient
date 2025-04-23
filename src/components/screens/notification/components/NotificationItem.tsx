import { NotificationResponseModel } from '@/api/features/notification/models/NotifiCationModel'
import { useAuth } from '@/context/auth/useAuth';
import { getTimeDiff } from '@/utils/helper/DateTransfer';
import { Avatar, List } from 'antd';
import { useRouter } from 'next/navigation';
import { on } from 'node:process';
import React from 'react'
import { IoArrowRedoCircle, IoChatbubbleEllipses, IoHeartCircle, IoNotificationsCircle, IoPersonCircle } from 'react-icons/io5';

const NotificationItem = ({ notifications, onUpdate, onClickModal  }: { notifications: NotificationResponseModel, onUpdate: () => void, onClickModal: ()=>void}) => {
    const router = useRouter();
    const {from, from_url, content, created_at, notification_type = '', status, content_id} = notifications;
    const {localStrings} = useAuth();
    const typeMap: Record<string, { icon: React.ReactNode; color: string; type: string }> = {
        like_post: { icon: <IoHeartCircle />, color: "text-red-500", type: `${localStrings.Notification.Items.LikePost}`},
        new_share: { icon: <IoArrowRedoCircle />, color: "text-blue-500", type: `${localStrings.Notification.Items.SharePost}` },
        new_comment: { icon: <IoChatbubbleEllipses />, color: "text-green-500", type: `${localStrings.Notification.Items.CommentPost}` },
        friend_request: { icon: <IoPersonCircle />, color: "text-gray-600", type: `${localStrings.Notification.Items.Friend}` },
        accept_friend_request: { icon: <IoPersonCircle />, color: "text-gray-600", type: `${localStrings.Notification.Items.AcceptFriend}` },
        new_post: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.NewPost}` },
        like_comment: { icon: <IoHeartCircle />, color: "text-red-500", type: `${localStrings.Notification.Items.LikeComment}` },
        new_post_personal: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.NewPostPersonal}` },
        block_create_post: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.BlockCreatePost}` },
        deactivate_post: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.DeactivatePostContent}` },
        activace_post: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.ActivacePostContent}` },
        deactivate_comment: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.DeactivateCommentContent}` },
        activace_comment: { icon: <IoNotificationsCircle />, color: "text-black", type: `${localStrings.Notification.Items.ActivaceCommentContent}` },
      };
    
      const notificationDetails = typeMap[notification_type] || {
        icon: <IoNotificationsCircle />,
        color: "text-black",
        type:  `${localStrings.Notification.Notification}`
      };
    
      const handleClick = () => {
        onUpdate();
        onClickModal();
        if (notification_type === "friend_request" || notification_type === "accept_friend_request") {
          router.push(`/user/${content_id}`);
        } else if (
          ["like_post", "new_comment", "new_share", "new_post", "new_post_personal"].includes(
            notification_type
          )
        ) {
          router.push(`/postDetails?postId=${content_id}`);
        }
      };

      const getDescription = (content: string) => {
        if (content.includes("violence")) {
          return localStrings.Notification.Items.violence;
      }
      if (content.includes("nsfw")) {
          return localStrings.Notification.Items.nsfw;
      }
      if (content.includes("political")) {
          return localStrings.Notification.Items.political;
      }
      return content;
      }

    
      return (
        <List.Item
          onClick={handleClick}
          className={`${status ? "bg-white" : "bg-gray-100"}`}
        >
          <div className="flex items-center">
            {/* Avatar with Icon */}
            <div className="relative mr-4">
              <Avatar
                src={from_url}
                size={40}
                className="bg-gray-300"
              />
              <div
                className={`absolute bottom-[-5px] right-[-2px] text-lg ${notificationDetails.color}`}
              >
                {notificationDetails.icon}
              </div>
            </div>
    
            {/* Notification Content */}
            <div className="flex-1">
              <span className="text-sm text-gray-800">
                <span className="font-semibold">{from}</span>{" "}
                {notificationDetails.type}
              </span>
              {content && (
                <p
                  className="text-sm text-gray-600 truncate"
                >
                  {getDescription(content)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {getTimeDiff(created_at, localStrings)}
              </p>
            </div>
          </div>
        </List.Item>
      );
    };
export default NotificationItem