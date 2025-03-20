"use client"
import React, { useEffect, useCallback } from 'react';
import {
  List,
  Avatar,
  Button,
  Spin,
  Typography,
  Space,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import NotificationItem from '../components/NotificationItem';
import useColor from '@/hooks/useColor';
import NotifiCationViewModel from '../viewModel/NotifiCationViewModel';
import { defaultNotificationRepo } from '@/api/features/notification/NotifiCationRepo';
import { useAuth } from '@/context/auth/useAuth';
import InfiniteScroll from 'react-infinite-scroll-component';


const NotificationScreen = ({setNotificationModal, notificationModal}:{setNotificationModal:React.Dispatch<React.SetStateAction<boolean>>, notificationModal:boolean }) => {
  const { brandPrimary, backgroundColor } = useColor();
  const { notifications, loading, fetchNotifications,  updateNotification,updateAllNotification, hasMore } = NotifiCationViewModel(defaultNotificationRepo);
  const { localStrings } = useAuth();

  useEffect(() => {
    console.log("🔄 Danh sách thông báo cập nhật:", notifications.length);
    console.log("Has More:", hasMore);
  }, [hasMore, notifications]);
  
  const loadMoreNotifi = async () => {
    console.log("Gọi API loadMoreNotifi...");
    await fetchNotifications();
  };

  

  useEffect(() => {
    if (notificationModal) {
      fetchNotifications();
    }
  }, [notificationModal]);
  
  const isToday = (create_at: string) => {
    const today = new Date();
    const createAt = new Date(create_at);
    return today.getDate() === createAt.getDate() && today.getMonth() === createAt.getMonth() && today.getFullYear() === createAt.getFullYear();
  }

  const todayNotification = notifications.filter((item) => item.created_at && isToday(item.created_at));
  const oldNotification = notifications.filter((item) => item.created_at && !isToday(item.created_at));

  // Render footer for loading state
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <div className="py-4 flex justify-center">
        <Spin size="large" style={{ color: brandPrimary }} />
      </div>
    );
  };

  return (
    <div>
        {/* <div className='border rounded-md border-solidborder-gray-900'> */}
            {/* Header */}
            {/* <div
                className="w-full py-3 px-4 flex justify-between items-center"
                style={{ backgroundColor }}
            >

                <Button
                type="text"
                icon={<CheckOutlined />}
                onClick={updateAllNotification}
                />
            </div> */}

            {/* Content */}
            <div className="flex-grow overflow-auto border-t border-gray-300">
                <div className="h-full overflow-auto">
                {/* <List
                    dataSource={notifications}
                    renderItem={(item) => (
                    <NotificationItem
                        notifications={item}
                        onUpdate={() => updateNotification(item)}
                        onClickModal={()=>setNotificationModal(false)}
                    />
                    )}
                    className="h-full"
                /> */}
                {/* {notifications?.length > 0 ? (
                 <div id="notification-container" className="h-full overflow-auto">
                 <InfiniteScroll
                   dataLength={notifications.length}
                   next={loadMoreNotifi}
                   hasMore={hasMore}
                   loader={<Spin indicator={<LoadingOutlined spin />} size="large" />}
                   scrollableTarget="notification-container" // ✅ Chỉ định đúng container cuộn
                 >
                   {notifications.map((item) => (
                     <div key={item?.id} style={{ width: "100%", maxWidth: "600px" }}>
                       <NotificationItem
                         notifications={item}
                         onUpdate={() => updateNotification(item)}
                         onClickModal={() => setNotificationModal(false)}
                       />
                     </div>
                   ))}
                 </InfiniteScroll>
               </div>
               
                ):
                (
                  <div className="w-full h-screen flex justify-center items-center">
                    <Empty description={
                      <span style={{ color: 'gray', fontSize: 16 }}>
                        {localStrings.Notification.NoNotification}
                      </span>
                    } />
                  </div>
                )
                } */}
                <div
  id="scrollable-notification"
  style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "10px" }} // Cho phép cuộn
>
  <InfiniteScroll
    dataLength={notifications.length}
    next={loadMoreNotifi}
    hasMore={hasMore}
    loader={<Spin indicator={<LoadingOutlined spin />} size="large" />}
    scrollableTarget="scrollable-notification" // ✅ Chỉ định container cuộn
  >
    
    {notifications.map((item) => (
      <div key={item?.id} style={{ width: "100%", maxWidth: "600px" }}>
        <NotificationItem
          notifications={item}
          onUpdate={() => updateNotification(item)}
          onClickModal={() => setNotificationModal(false)}
        />
      </div>
    ))}
  </InfiniteScroll>
</div>

                
                </div>
            </div>
        {/* </div> */}
    </div>
  );
};

export default NotificationScreen;