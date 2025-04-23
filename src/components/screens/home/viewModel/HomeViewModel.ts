import { NewFeedResponseModel } from "@/api/features/newFeed/Model/NewFeedModel";
import { NewFeedRepo } from "@/api/features/newFeed/NewFeedRepo";
import { FriendRepo } from "@/api/features/friends/FriendRepo";
import { GetBirthdayFriendsModel } from "@/api/features/friends/models/GetBirthdayFriends";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { useState } from "react";

interface HomeDataResponse {
  newFeed: {
    data: NewFeedResponseModel[];
    paging: { page: number; limit: number; total: number };
    error?: any;
  };
  birthdayFriends: {
    data: GetBirthdayFriendsModel[];
    error?: any;
  };
}

interface UnifiedRepo {
  getHomeData: (params: { page: number; limit: number }) => Promise<HomeDataResponse>;
  deleteNewFeed: (id: string) => Promise<{ error?: any }>;
}

const HomeViewModel = (newFeedRepo: NewFeedRepo, friendRepo: FriendRepo) => {
  const [newFeeds, setNewFeeds] = useState<NewFeedResponseModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [birthdayFriends, setBirthdayFriends] = useState<GetBirthdayFriendsModel[]>([]);
  const { localStrings } = useAuth();
  const limit = 20;

  // Simulate unified repo with Promise.all fallback
  const unifiedRepo: UnifiedRepo = {
    getHomeData: async (params: { page: number; limit: number }) => {
      const [newFeedResponse, birthdayResponse] = await Promise.all([
        newFeedRepo.getNewFeed(params),
        friendRepo.getBirthdayFriends(),
      ]);
      return {
        newFeed: newFeedResponse,
        birthdayFriends: birthdayResponse,
      };
    },
    deleteNewFeed: newFeedRepo.deleteNewFeed,
  };

  const fetchHomeData = async (newPage: number = 1) => {
    try {
      setLoading(true);
      const response = await unifiedRepo.getHomeData({
        page: newPage,
        limit: limit,
      });

      // Handle news feed
      if (!response.newFeed?.error) {
        const newFeedData = response.newFeed?.data || [];
        if (newPage === 1) {
          setNewFeeds(newFeedData);
        } else {
          setNewFeeds((prevNewFeeds) => [...prevNewFeeds, ...newFeedData]);
        }
        const { page: currentPage, limit: currentLimit, total: totalRecords } = response.newFeed?.paging;
        setTotal(totalRecords);
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      }

      // Handle birthday friends with date normalization
      if (!response.birthdayFriends?.error) {
        const cleanedData = response.birthdayFriends.data.map((friend: GetBirthdayFriendsModel) => {
          if (friend.birthday && friend.birthday.includes("T") && friend.birthday.includes("/")) {
            const datePart = friend.birthday.split("/")[1]; // "10/2004"
            const [month, year] = datePart.split("/").map(Number);
            const day = parseInt(friend.birthday.split("T")[0], 10); // "04"
            return {
              ...friend,
              birthday: `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
            };
          }
          return friend;
        });
        setBirthdayFriends(cleanedData || []);
      }
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNewFeed = async (id: string) => {
    try {
      setLoadingDelete(true);
      const res = await unifiedRepo.deleteNewFeed(id);
      setNewFeeds((newFeeds) => newFeeds.filter((post) => post.id !== id));
      if (!res?.error) {
        message.success(localStrings.DeletePost.DeleteSuccess);
      } else {
        message.error(localStrings.DeletePost.DeleteFailed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDelete(false);
    }
  };

  const loadMoreNewFeeds = async () => {
    try {
      setLoadingMore(true);
      const response = await newFeedRepo.getNewFeed({
        page: page + 1,
        limit: limit,
      });
      if (!response?.error) {
        setNewFeeds((prevNewFeeds) => [
          ...prevNewFeeds,
          ...(response?.data || []),
        ]);
        const { page: currentPage, limit: currentLimit, total: totalRecords } = response?.paging;
        setTotal(totalRecords);
        setPage(currentPage);
        setHasMore(currentPage * currentLimit < totalRecords);
      }
    } catch (error) {
      console.error("Error loading more feeds:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    newFeeds,
    loading,
    loadingMore,
    fetchNewFeeds: fetchHomeData,
    loadMoreNewFeeds,
    deleteNewFeed,
    hasMore,
    setNewFeeds,
    loadingDelete,
    setLoadingDelete,
    birthdayFriends,
    loadingBirthday: loading,
    fetchBirthdayFriends: fetchHomeData,
  };
};

export default HomeViewModel;