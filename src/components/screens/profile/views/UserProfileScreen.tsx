"use client"
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, Modal, Skeleton, Space, Typography } from 'antd';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';
import UserProfileViewModel from '../viewModel/UserProfileViewModel';
import { useAuth } from '@/context/auth/useAuth';
import { useRouter } from 'next/navigation';
import { UserModel } from '@/api/features/authenticate/model/LoginModel';


const UserProfileScreen = ({ id }: { id: string }) => {
  const { localStrings } = useAuth();
  const [tab, setTab] = useState(0);
  const router = useRouter();

  const {
    loading,
    posts,
    loadMorePosts,
    total,
    fetchUserProfile,
    profileLoading,
    userInfo,
    friends,
    friendCount,
    resultCode,
    hasMore,
    fetchFriends
  } = UserProfileViewModel();


  useEffect(() => {
    if (!id) return;
    fetchUserProfile(id);
  }, [id]);

  return (
    <div>
      {profileLoading ? (
        <Skeleton
          active
          paragraph={{ rows: 16 }}
        />
      ) : (
      <>
        <ProfileHeader
          total={total}
          user={userInfo as UserModel}
          loading={profileLoading}
          friendCount={friendCount}
          fetchUserProfile={fetchUserProfile}
        />
        <ProfileTabs
          posts={posts}
          loading={loading}
          profileLoading={profileLoading}
          loadMorePosts={loadMorePosts}
          userInfo={userInfo as UserModel}
          friendCount={friendCount}
          friends={friends}
          resultCode={resultCode}
          fetchUserPosts={() => { }}
          hasMore={hasMore}
          setPosts={() => { }}
        />
      </>
      )}
    </div>
  );
};

export default UserProfileScreen;