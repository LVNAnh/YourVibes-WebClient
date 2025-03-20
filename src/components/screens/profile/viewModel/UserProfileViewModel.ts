"use client"
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth/useAuth';
import { PostResponseModel } from '@/api/features/post/models/PostResponseModel';
import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { FriendStatus } from '@/api/baseApiResponseModel/baseApiResponseModel';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { defaultPostRepo } from '@/api/features/post/PostRepo';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';

const UserProfileViewModel = () => {
  const [posts, setPosts] = useState<PostResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userInfo, setUserInfo] = useState<UserModel | null>(null);
  const [sendRequestLoading, setSendRequestLoading] = useState(false);
  const [newFriendStatus, setNewFriendStatus] = useState<FriendStatus | undefined>(undefined);
  const [search, setSearch] = useState<string>('');
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [resultCode, setResultCode] = useState(0);

  const limit = 10;

  // Fetch user posts
  const fetchUserPosts = async (newPage: number = 1) => {
    try {
      setLoading(true);
      const response = await defaultPostRepo.getPosts({
        user_id: userInfo?.id,
        sort_by: 'created_at',
        isDescending: true,
        page: newPage,
        limit: limit,
      });

      if (!response?.error) {
        if (newPage === 1) {
          setPosts(response?.data);
        } else {
          setPosts((prevPosts) => [...prevPosts, ...response?.data]);
        }
        const { page: currentPage, limit: currentLimit, total: totalRecords } = response?.paging;
        setTotal(totalRecords);
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      } else {
        // Toast.error(`${localStrings.Profile.Posts.GetPostsFailed}: ${response?.error?.message}`);
      }
    } catch (error: any) {
      console.error(error);
    //   Toast.error(`${localStrings.Profile.Posts.GetPostsFailed}: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile
  const fetchUserProfile = async (id: string) => {
    try {
      setProfileLoading(true);
      const response = await defaultProfileRepo.getProfile(id);

      if (!response?.error) {
        setUserInfo(response?.data);
        setResultCode(response?.code);
        setNewFriendStatus(response?.data?.friend_status || FriendStatus.NotFriend);
      } else {
       
      }
    } catch (error: any) {
      console.error(error);
    
    } finally {
      setProfileLoading(false);
    }
  };

  const loadMorePosts = () => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
      fetchUserPosts(page + 1);
    }
  };

  // Send friend request
  const sendFriendRequest = async (id: string) => {
    try {
      setSendRequestLoading(true);
      const response = await defaultProfileRepo.sendFriendRequest(id);
      
      if (!response?.error) {
       
        setNewFriendStatus(FriendStatus.SendFriendRequest);
      } else {
       
      }
    } catch (error: any) {
      console.error(error);
    
    } finally {
      setSendRequestLoading(false);
    }
  }

  //Cancel friend request
  const cancelFriendRequest = async (id: string) => {
    try {
      setSendRequestLoading(true);
      const response = await defaultProfileRepo.cancelFriendRequest(id);
      if (!response?.error) {
       
        setNewFriendStatus(FriendStatus.NotFriend);
      } else {
       
      }
    } catch (error: any) {
      console.error(error);
   
    } finally {
      setSendRequestLoading(false);
    }
  }

  // Refuse friend request
  const refuseFriendRequest = async (id: string) => {
    try {
      setSendRequestLoading(true);
      const response = await defaultProfileRepo.refuseFriendRequest(id);
      if (!response?.error) {
        
        setNewFriendStatus(FriendStatus.NotFriend);
      } else {
        
      }
    } catch (error: any) {
      console.error(error);
   
    } finally {
      setSendRequestLoading(false);
    }
  }

  // Accept friend request
  const acceptFriendRequest = async (id: string) => {
    try {
      setSendRequestLoading(true);
      const response = await defaultProfileRepo.acceptFriendRequest(id);
      if (!response?.error) {
       
        setNewFriendStatus(FriendStatus.IsFriend);
      } else {
       
      }
    } catch (error: any) {
      console.error(error);
    
    } finally {
      setSendRequestLoading(false);
    }
  }

  // Unfriend
  const unFriend = async (id: string) => {
    try {
      setSendRequestLoading(true);
      const response = await defaultProfileRepo.unfriend(id); 
      if (!response?.error) {
        setNewFriendStatus(FriendStatus.NotFriend);
      } else {
    
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setSendRequestLoading(false);
    }
  }


  // Fetch friends
  const fetchFriends = async (page: number) => {
    try {
      const response = await defaultProfileRepo.getListFriends({
        page: page,
        limit: 10,
        user_id: userInfo?.id,
      });

      if (response?.data) {
        if (Array.isArray(response?.data)) {
            const friends = response?.data.map(
              (friendResponse: FriendResponseModel) => ({
                id: friendResponse.id,
                family_name: friendResponse.family_name,
                name: friendResponse.name,
                avatar_url: friendResponse.avatar_url,
              })
            ) as FriendResponseModel[];
            setFriends(friends);
            setFriendCount(friends.length); //Đếm số lượng bạn bè
          } else{
        console.error("response.data is null");
        setFriends([]);
      }}
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (userInfo) {
      fetchUserPosts();
      fetchFriends(page);
    }
  }, [userInfo]);

  return {
    loading,
    profileLoading,
    posts,
    hasMore,
    loadMorePosts,
    fetchUserPosts,
    total,
    fetchUserProfile,
    userInfo,
    sendFriendRequest,
    sendRequestLoading,
    refuseFriendRequest,
    cancelFriendRequest,
    newFriendStatus,
    setNewFriendStatus,
    acceptFriendRequest,
    unFriend,
    friendCount,
    search,
    setSearch,
    friends,
    page,
    fetchFriends,
    resultCode,
    setResultCode,
  };
};

export default UserProfileViewModel;