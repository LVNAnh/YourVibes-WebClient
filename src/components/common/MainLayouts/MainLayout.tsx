"use client";

import React, { useState } from "react";
import { Layout, Menu, Grid, ConfigProvider, Modal, Avatar, Button } from "antd";
import { createElement } from "react";
import {
  FaHome,
  FaBell,
  FaCog,
  FaUser,
  FaFacebookMessenger,
  FaAd,
  FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "@/context/auth/useAuth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Content, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import useColor from "@/hooks/useColor";
import SettingsTab from "@/components/screens/profile/components/SettingTabs";
import NotificationScreen from "@/components/screens/notification/views/Notification";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";

const { useBreakpoint } = Grid;

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const { backgroundColor, lightGray } = useColor();
  const { user, localStrings, onLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const [settingModal, setSettingModal] = useState(false);
  const [notificationModal, setNotificationModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);  

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
        link: "/adsManagement",
        content: localStrings.Ads.AdsManagement,
        icon: FaAd,
      },
      {
        link: "/settings",
        content: localStrings.Public.Settings,
        icon: FaCog,
      },
      {
        link: "/logout",
        content: localStrings.Public.LogOut ,
        icon: FaSignOutAlt,
      },
    ],
  };

  const { nav } = content;

  const isActived = (link: string) => {
    const [basePath, queryString] = link.split("?");
    const linkParams = new URLSearchParams(queryString);

    if (pathname !== basePath) return false;

    for (const [key, value] of linkParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }

    return true;
  };

  const handleMenuClick = () => {
    setCollapsed(!collapsed);
  };

  const handleItemClick = (link: string) => {
    if (link === "/settings") {
      setSettingModal(true);
    } else if (link === "/notifications") {
      setNotificationModal(true);
    } else if (link === "/logout") {
      setLogoutModal(true); 
    } else {
      router.push(link);
    }
    setVisible(false);
  };
 
  const handleLogout = () => {
    onLogout();
    setLogoutModal(false);  
    router.push("/login");  
  };

  // Define the header navigation items
  const headerNavItems = [
    { label: `${localStrings.Public.Feed}`, link: "/home" },
    { label: `${localStrings.Public.People}`, link: "/people" },
    { label: `${localStrings.Public.Trending}`, link: "/trending" },
  ];

  return (
    <Layout>
      <ConfigProvider
        theme={{
          components: {
            Layout: {
              siderBg: "rgb(244, 244, 244)",
            },
            Menu: {
              itemActiveBg: lightGray,
              itemSelectedBg: lightGray,
              colorBgContainer: "rgb(244, 244, 244)",
              lineWidth: 0,
              itemBorderRadius: 5,
              itemMarginBlock: 0,
              itemHeight: 55,
              padding: 0,
            },
          },
        }}
      >
        <Sider
          trigger={null}
          collapsedWidth={0}
          width={250}
          collapsed={collapsed}
          breakpoint="lg"
          onCollapse={(collapsed) => setCollapsed(collapsed)}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            zIndex: 100,
            insetInlineStart: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div className="demo-logo-vertical" />
          <Menu
            mode="inline"
            className="flex flex-col justify-center h-full"
            items={nav.map((item, index) => {
              const actived = isActived(item.link);
              return {
                key: index.toString(),
                label: (
                    <div
                      className="h-4 flex items-center gap-4 w-full h-full px-4 pl-8"
                      style={{
                        backgroundColor: actived ? "white" : "transparent",
                        color: "black",

                      }}
                      onClick={() => {
                        handleItemClick(item.link);
                        !screens.lg && handleMenuClick();
                      }}
                    >
                      {createElement(item.icon, {
                        size: 20,
                      })}
                      <span>{item.content}</span>
                    </div>
                ),
                style: {
                  paddingLeft: 0,
                  paddingRight: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                  marginBottom: 10,
                  cursor: "pointer",
                  boxShadow:actived ? "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                  borderRadius: actived ? 10 : 0,
                },
              };
            })}
          />
        </Sider>
      </ConfigProvider>
      <Layout>
        <Header
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: screens.lg ? "#F5F5F5" : backgroundColor,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            zIndex: 100,
            padding: screens.lg ? "0 50px" : "0 10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <img
              src="/image/yourvibes_black.png"
              alt="YourVibes"
              style={{ height: "40px", cursor: "pointer" }}
              onClick={() => router.push("/home")}
            />
          </div>

          {screens.lg && (
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "white",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
                borderRadius: 10,
                padding: "5px 0",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                {headerNavItems.map((item) => {
                  const isActive = isActived(item.link);
                  return (
                    <div
                      key={item.link}
                      onClick={() => handleItemClick(item.link)}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "10px 20px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        color: isActive ? "#808080" : "#000",
                        transition: "color 0.3s, border-bottom 0.3s",
                        lineHeight: "1.5",
                      }}
                    >
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              alignItems: "center",
              gap: "15px",
              display: screens.lg ? "flex" : "none",
            }}
          >
            <div
              className="flex flex-row items-center gap-4 pl-2"
              style={{ cursor: "pointer" }}
            >
              <span className="font-bold md:block hidden">
                {user?.family_name} {user?.name}
              </span>
              <Avatar src={user?.avatar_url} alt={user?.name} size={40} />
            </div>
          </div>
          {!screens.lg && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => handleMenuClick()}
              style={{ fontSize: "20px", marginRight: "16px" }}
            />
          )}
        </Header>

        {!screens.lg && ["/home", "/people", "/trending"].includes(pathname) && (
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "white",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
              borderRadius: 10,
              padding: "5px 10px",
              display: "inline-flex",
              justifyContent: "center",
              margin: "10px auto",
              position: "fixed",
              top: "65px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 99,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
              }}
            >
              {headerNavItems.map((item) => {
                const isActive = isActived(item.link);
                return (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item.link)}
                    style={{
                      padding: "10px 20px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      color: isActive ? "#808080" : "#000",
                      transition: "color 0.3s, border-bottom 0.3s",
                      lineHeight: "1.5",
                    }}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Content
          style={{
            marginLeft: screens.lg ? 250 : 0,
            marginTop: !screens.lg && ["/home", "/people", "/trending"].includes(pathname) ? "60px" : 0,
          }}
        >
          <div
            style={{
              alignItems: "center",
              marginLeft: screens.lg && ["/home", "/people", "/trending"].includes(pathname) ? 70 : 0,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>

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

      {/* Modal xác nhận đăng xuất */}
      <Modal
        open={logoutModal}
        onCancel={() => setLogoutModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setLogoutModal(false)}>
            {localStrings.Public.Cancel}
          </Button>,
          <Button key="confirm" type="primary" onClick={handleLogout}>
            {localStrings.Public.Confirm}
          </Button>,
        ]}
        centered
        title={
          <span className="font-bold">
            {localStrings.Public.ConfirmLogout}
          </span>
        }
      >
        <p>
          {localStrings.Public.ConfirmLogoutMessage}
        </p>
      </Modal>
    </Layout>
  );
};

export default MainLayout;