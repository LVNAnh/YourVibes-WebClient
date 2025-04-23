import { PostResponseModel } from "@/api/features/post/models/PostResponseModel";
import { PostRepo } from "@/api/features/post/PostRepo";
import { BaseApiResponseModel } from "@/api/baseApiResponseModel/baseApiResponseModel";
import { GetBirthdayFriendsModel } from "@/api/features/friends/models/GetBirthdayFriends"; 
import { FriendRepo } from "@/api/features/friends/FriendRepo"; 
import { useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { GetUsersPostsRequestModel } from "@/api/features/post/models/GetUsersPostsModel";

const TrendingViewModel = (postRepo: PostRepo, friendRepo: FriendRepo) => { 
  const [trendingPosts, setTrendingPosts] = useState<PostResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [birthdayFriends, setBirthdayFriends] = useState<GetBirthdayFriendsModel[]>([]);  
  const [loadingBirthday, setLoadingBirthday] = useState(false);  
  const { localStrings } = useAuth();
  const limit = 20;

  const fetchTrendingPosts = async (newPage: number = 1) => {
    try {
      setLoading(true);
      const requestData: GetUsersPostsRequestModel = {
        page: newPage,
        limit: limit,
      };
      const response: BaseApiResponseModel<PostResponseModel[]> =
        await postRepo.getPostsTrending(requestData);

      if (!response.error) {
        const newPosts = response.data || [];
        if (newPage === 1) {
          setTrendingPosts(newPosts);
        } else {
          setTrendingPosts((prevPosts) => [...prevPosts, ...newPosts]);
        }
        const { page: currentPage, limit: currentLimit, total: totalRecords } =
          response.paging || { page: 1, limit, total: newPosts.length };
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      } else {
        message.error(localStrings.Public.ErrorLoading);
      }
    } catch (error: any) { 
      message.error(localStrings.Public.ErrorLoading);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTrendingPosts = async () => {
    if (!hasMore || loading) return;
    await fetchTrendingPosts(page + 1);
  };

  // Thêm hàm lấy danh sách bạn bè có sinh nhật
  const fetchBirthdayFriends = async () => {
    try {
      setLoadingBirthday(true);
      const response = await friendRepo.getBirthdayFriends();
      if (!response.error) {
        setBirthdayFriends(response.data || []);
      } else {
        message.error(localStrings.Public.ErrorLoading);
      }
    } catch (error) {
      console.error("Error fetching birthday friends:", error);
    } finally {
      setLoadingBirthday(false);
    }
  };

  return {
    trendingPosts,
    loading,
    fetchTrendingPosts,
    loadMoreTrendingPosts,
    hasMore,
    setTrendingPosts,
    birthdayFriends,  
    loadingBirthday,  
    fetchBirthdayFriends,  
  };
};

export default TrendingViewModel;