import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { GetUsersPostsRequestModel } from "@/api/features/post/models/GetUsersPostsModel";
import { defaultPostRepo, PostRepo } from "@/api/features/post/PostRepo";
import { useAuth } from "@/context/auth/useAuth";
import {
  AdvertisePostRequestModel,
  AdvertisePostResponseModel,
  BillModel,
  StatisticEntry,
} from "@/api/features/post/models/AdvertisePostModel";
import { DateTransfer, getDayDiff } from "@/utils/helper/DateTransfer";

interface MappedAd extends AdvertisePostResponseModel {
  post_id: string | undefined;
  status: string | undefined;
  start_date: string;
  end_date: string;
  day_remaining: number;
  resultsData: number[];
  reachData: number[];
  impressionsData: number[];
  labels: string[];
  bill: BillModel | undefined;
  isActive: boolean;
  status_action: string;
  total_reach?: number;
  total_clicks?: number;
  total_impression?: number;
}

const useAdsManagement = (repo: PostRepo = defaultPostRepo) => {
  const { user, localStrings } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [ads, setAds] = useState<MappedAd[]>([]);
  const [groupedAds, setGroupedAds] = useState<Record<string, MappedAd[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [postDetails, setPostDetails] = useState<Record<string, AdvertisePostResponseModel>>({});
  const [isLoadingPostDetails, setIsLoadingPostDetails] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isAdActive = (ad: AdvertisePostResponseModel): boolean => {
    if (ad.status !== "success" || ad.bill?.status !== true) return false;
    const now = dayjs();
    const end = dayjs(ad.end_date);
    return end.isValid() && now.isBefore(end, "day");
  };

  const getStatusAction = (ad: AdvertisePostResponseModel): string => {
    if (ad.status !== "success" || ad.bill?.status !== true) {
      return localStrings.Ads.Pending;
    }
    return isAdActive(ad) ? localStrings.Ads.Active : localStrings.Ads.Completed;
  };

  const fetchAdsByPostId = useCallback(
    async (postId: string): Promise<AdvertisePostResponseModel[] | null> => {
      try {
        const params: AdvertisePostRequestModel = { post_id: postId };
        const response = await repo.getAdvertisePost(params);
        return response?.data ? (Array.isArray(response.data) ? response.data : [response.data]) : null;
      } catch (err) {
        console.error(`Error fetching ads for postId ${postId}:`, err);
        return null;
      }
    },
    [repo]
  );

  const fetchAdStatistics = useCallback(
    async (advertiseId: string): Promise<AdvertisePostResponseModel | null> => {
      try {
        const response = await repo.getAdvertiseStatistics(advertiseId);
        return response?.data || null;
      } catch (err) {
        console.error(`Error fetching statistics for advertiseId ${advertiseId}:`, err);
        return null;
      }
    },
    [repo]
  );

  const fetchAds = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const request: GetUsersPostsRequestModel = {
        user_id: user.id,
        sort_by: "created_at",
        isDescending: true,
        limit: 10,
        page,
      };

      const res = await repo.getAdvertisementPosts(request);
      if (!res?.data) {
        setError("Failed to fetch advertisement data");
        setHasMore(false);
        return;
      }

      const filteredPosts = res.data.filter(
        (item) => Number(item.is_advertisement) === 1 || Number(item.is_advertisement) === 2
      );
      if (filteredPosts.length === 0 && page > 1) {
        setHasMore(false);
      }

      const mappedAds: MappedAd[] = [];
      const grouped: Record<string, MappedAd[]> = {};

      for (const post of filteredPosts) {
        const adsForPost = await fetchAdsByPostId(post.id || "");
        if (adsForPost) {
          grouped[post.id || ""] = [];
          for (const ad of adsForPost) {
            const startDate = ad.start_date ? DateTransfer(new Date(ad.start_date)) : "N/A";
            const endDate = ad.end_date ? DateTransfer(new Date(ad.end_date)) : "N/A";
            const daysRemaining = ad.day_remaining ?? 0;

            const stats = ad.id ? await fetchAdStatistics(ad.id) : null;
            const statistics: StatisticEntry[] = stats?.statistics || ad.statistics || [];

            const resultsData = statistics.map((stat: StatisticEntry) => stat.clicks || 0);
            const reachData = statistics.map((stat: StatisticEntry) => stat.reach || 0);
            const impressionsData = statistics.map((stat: StatisticEntry) => stat.impression || 0);
            const labels = statistics.map((stat: StatisticEntry) =>
              dayjs(stat.aggregation_date).format("DD/MM")
            );

            let adStatus = ad.status?.toString() || "N/A";
            if (ad.bill?.status !== undefined) {
              adStatus = ad.bill.status ? "success" : "failed";
            }

            const mappedAd: MappedAd = {
              ...ad,
              post_id: post.id,
              status: adStatus,
              start_date: startDate,
              end_date: endDate,
              day_remaining: daysRemaining,
              resultsData,
              reachData,
              impressionsData,
              labels,
              bill: ad.bill,
              isActive: isAdActive(ad),
              status_action: getStatusAction(ad),
              total_reach: stats?.total_reach || ad.total_reach || 0,
              total_clicks: stats?.total_clicks || ad.total_clicks || 0,
              total_impression: stats?.total_impression || ad.total_impression || 0,
            };

            mappedAds.push(mappedAd);
            grouped[post.id || ""].push(mappedAd);
          }
        }
      }

      setAds((prevAds) => (page === 1 ? mappedAds : [...prevAds, ...mappedAds]));
      setGroupedAds(grouped);
      setHasMore(filteredPosts.length === 10);

      setIsLoadingPostDetails(true);
      const postIdsToFetch = mappedAds
        .map((ad) => ad.post_id)
        .filter((postId): postId is string => !!postId && !postDetails[postId]);

      if (postIdsToFetch.length > 0) {
        const newPostDetails: Record<string, AdvertisePostResponseModel> = {};
        await Promise.all(
          postIdsToFetch.map(async (postId) => {
            const post = await repo.getPostById(postId);
            if (post?.data && (post.data.is_advertisement === 1 || post.data.is_advertisement === 2)) {
              newPostDetails[postId] = post.data as AdvertisePostResponseModel;
            }
          })
        );
        setPostDetails((prev) => ({ ...prev, ...newPostDetails }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsLoadingPostDetails(false);
    }
  }, [user?.id, page, repo, postDetails, localStrings.Ads]);

  const loadMoreAds = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  const advertisePost = async (params: AdvertisePostRequestModel) => {
    try {
      const res = await repo.advertisePost(params);
      if (res?.data) {
        setPage(1);
        await fetchAds();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating advertisement");
    }
  };

  useEffect(() => {
    if (user?.id) fetchAds();
  }, [fetchAds, user?.id]);

  return {
    loading,
    ads,
    groupedAds,
    error,
    advertisePost,
    fetchAds,
    loadMoreAds,
    postDetails,
    isLoadingPostDetails,
    hasMore,
  };
};

export default useAdsManagement;