"use client"; // Đảm bảo rằng đây là một client-side component

import React, { use, useState } from "react";
import { Layout, Menu, Input, Grid, ConfigProvider, Modal, Avatar } from "antd";
import { createElement } from "react";
import {
  FaHome,
  FaBell,
  FaCog,
  FaUser,
  FaFacebookMessenger,
  FaAd,
  FaBuysellads,
} from "react-icons/fa";
import { useAuth } from "@/context/auth/useAuth";
import { usePathname, useRouter, useSearchParams } from "next/navigation"; // Sử dụng `next/navigation` thay vì `next/router`
import SearchScreen from "@/components/screens/search/views/SearchScreen";
import { Content, Footer, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import useColor from "@/hooks/useColor";
import { IoMenu } from "react-icons/io5";
import SettingsTab from "@/components/screens/profile/components/SettingTabs";
import NotificationScreen from "@/components/screens/notification/views/Notification";

const { useBreakpoint } = Grid;
const siderStyle: React.CSSProperties = {
  overflow: "auto",
  height: "100vh",
  position: "fixed",
  insetInlineStart: 0,
  top: 0,
  bottom: 0,
  scrollbarWidth: "thin",
  scrollbarGutter: "stable",
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const { backgroundColor, lightGray } = useColor();
  const [searchQuery, setSearchQuery] = useState("");
  const {user, localStrings } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const [settingModal, setSettingModal] = useState(false);
  const [notificationModal, setNotificationModal] = useState(false);

  const content = {
    nav: [
      {
        link: "/home",
        content: localStrings.Public.Home,
        icon: FaHome,
      },
      {
        link: "/messages",
        content: localStrings.Public.Messages,
        icon: FaFacebookMessenger,
      },
      {
        link: "/profile",
        content: localStrings.Public.Profile,
        icon: FaUser,
      },
      {
        link: "/notifications",
        content: localStrings.Notification.Notification,
        icon: FaBell,
      },
      {
        link:"/adsManagement",
        content: localStrings.Ads.AdsManagement,
        icon: FaAd,
      },
      {
        link: "/settings",
        content: localStrings.Public.Settings,
        icon: FaCog,
      },
    ],
  };

  const { nav } = content;

  const isActived = (link: string) => {
    const [basePath, queryString] = link.split("?");
    const linkParams = new URLSearchParams(queryString);

    if (pathname !== basePath) return false;

    // So sánh từng query parameter trong link với `useSearchParams`
    for (const [key, value] of linkParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }

    return true;
  };

  const handleMenuClick = () => {
    setVisible(!visible);
  };

  // Cập nhật lại hàm handleItemClick
  const handleItemClick = (link: string) => {
    if (link === "/settings") {
      setSettingModal(true);
    } else if (link === "/notifications") {
      setNotificationModal(true);
    } else {
      router.push(link); // Chuyển trang khi nhấn vào menu item
    }
    setVisible(false); // Đóng menu khi nhấn vào item
  };

  return (
    <Layout>
      <Header
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: backgroundColor,
          padding: "0 20px",
          borderBottom: "1px solid #000000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            // border: "1px solid #000000",
          }}
        >
          <img
            src="/image/yourvibes_black.png"
            alt="YourVibes"
            style={{ height: "40px" }}
            onClick={() => router.push("/home")}
          />
          <SearchScreen />
        </div>
        <div
          className="flex flex-row items-center gap-4"
          onClick={handleMenuClick}
        >
          <span className="font-bold md:block hidden">
            {user?.family_name} {user?.name}
            </span>
            <Avatar src={user?.avatar_url} alt={user?.name} size={40} />
        </div>
      </Header>
      <ConfigProvider
        theme={{ components: {
          Layout: {
            siderBg: "rgb(244, 244, 244)"
          }
        }}}
      >
        <Layout>
          <Sider
            width={250}
            style={{
              display: screens.lg ? "block" : "none",
              overflow: "auto",
              height: "100vh",
              position: "fixed",
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
            }}
          >
            <div className="demo-logo-vertical" />
            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemActiveBg: lightGray,
                    itemSelectedBg: lightGray,
                    colorBgContainer: "rgb(244, 244, 244)",
                    lineWidth: 0,
                    itemBorderRadius: 5,
                    itemMarginBlock: 0,
                    // itemPaddingInline: 0,
                    itemHeight: 55,
                  }
                },
              }}
            >
              <Menu
                mode="inline"
                style={{ borderRight: 0 }}
                className="flex flex-col justify-center h-full"
                items={nav.map((item, index) => {
                  const actived = isActived(item.link);
                  return {
                    key: index.toString(),
                    label: (
                      <div>
                         <div
                        className={`h-4 flex items-center gap-4 w-full h-full px-4 pl-8`}
                        style={{
                          backgroundColor: actived ? "#C0C0C0" : "transparent",
                          color: "black",
                        }}
                        onClick={() => handleItemClick(item.link)}
                      >
                        {createElement(item.icon, {
                          size: 20,
                        })}
                        <span>{item.content}</span>
                      </div>
                      <div>
                        <hr className="border-t-2 border-gray-300" />
                      </div>
                      </div>
                     
                    ),
                    style: {
                      padding: 0,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: lightGray,
                        color: "white",
                      },
                      // border: "1px solid #000000",
                    },
                  };
                })}
              />
            </ConfigProvider>
          </Sider>
          <Content
            style={{
              marginLeft: screens.lg ? 250 : 0,
            }}
          >
            <div>{children}</div>
          </Content>
        </Layout>
      </ConfigProvider>

      {visible && (
        <Menu
          mode="inline"
          style={{
            position: "fixed",
            top: "64px",
            right: "15px",
            backgroundColor: "white",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            width: "200px",
            borderRadius: "8px",
            zIndex: 100,
            border: "1px solid #dcdcdc",
            fontFamily: "Arial, sans-serif",
          }}
          onClick={handleMenuClick}
        >
          {nav.map((item, index) => (
            <Menu.Item
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 20px",
                fontSize: "16px",
              }}
              onClick={() => handleItemClick(item.link)} // Gọi handleItemClick
            >
              <div
                style={{
                  display: "flex",
                  marginRight: "10px",
                  fontSize: "20px",
                  color: "#black",
                }}
              >
                {item.content}
              </div>
            </Menu.Item>
          ))}
        </Menu>
      )}
      {settingModal && (
        <Modal
          open={settingModal}
          onCancel={() => setSettingModal(false)}
          footer={null}
          width={500}
          centered
          title={
            <span className="font-bold">{localStrings.Public.Settings}</span>
          }
        >
          <SettingsTab setSettingModal={setSettingModal} />
        </Modal>
      )}
      {notificationModal && (
        <Modal
          open={notificationModal}
          onCancel={() => setNotificationModal(false)}
          footer={null}
          width={700}
          height={700}
          centered
          title={
            <span className="font-bold">
              {localStrings.Notification.Notification}
            </span>
          }
          bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
        >
          <NotificationScreen
            setNotificationModal={setNotificationModal}
            notificationModal={notificationModal}
          />
        </Modal>
      )}
    </Layout>
  );
};

export default MainLayout;
