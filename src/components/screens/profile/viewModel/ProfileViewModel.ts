"use client"
import { PostResponseModel } from '@/api/features/post/models/PostResponseModel';
import { defaultPostRepo } from '@/api/features/post/PostRepo';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { useAuth } from '@/context/auth/useAuth';
import { useState } from 'react'

const ProfileViewModel = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [search, setSearch] = useState<string>("");
  const [resultCode, setResultCode] = useState(0);
  const getFriendCount = () => friendCount;
  const fetchUserPosts = async (newPage: number = 1) => {
    try {
      setLoading(true);
      const response = await defaultPostRepo.getPosts({
        user_id: user?.id,
        sort_by: "created_at",
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
        const {
          page: currentPage,
          limit: currentLimit,
          total: totalRecords,
        } = response?.paging;

        setTotal(totalRecords);
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      } else {
        console.error(response?.message);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = () => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
      fetchUserPosts(page + 1);
    }
  };

  const fetchMyFriends = async (page: number) => {
    try {
      const response = await defaultProfileRepo.getListFriends({
        page: page,
        limit: 10,
        user_id: user?.id,
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
          return friends;
        } 
    else{
      console.error("response.data is null");
      setFriends([]);
    }}
    return friends;
  }
  catch (error: any) {
    console.error(error);
  }
}

//Privacy setting
const fetchUserProfile = async (id: string) => {
  try {
    setProfileLoading(true);
    const response = await defaultProfileRepo.getProfile(id);
    
    if (!response?.error) {
      setResultCode(response?.code);
    } else {
    }
  } catch (error: any) {
    console.error(error);
  } finally {
    setProfileLoading(false);
  }
}

  
  return {
    loading,
    posts,
    hasMore,
    loadMorePosts,
    fetchUserPosts,
    total,
    friendCount,
    search,
    setSearch,
    friends,
    page,
    getFriendCount,
    fetchMyFriends,
    fetchUserProfile,
    resultCode,
    profileLoading,
    setProfileLoading,
    setPosts,
  };
};

export default ProfileViewModel