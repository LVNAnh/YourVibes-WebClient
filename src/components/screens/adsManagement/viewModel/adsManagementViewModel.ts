import { useState, useEffect, useCallback, useMemo } from "react";
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
import { DateTransfer } from "@/utils/helper/DateTransfer";

// In-memory cache for API responses
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  const [loadingStatistics, setLoadingStatistics] = useState<boolean>(false);
  const [ads, setAds] = useState<MappedAd[]>([]);
  const [groupedAds, setGroupedAds] = useState<Record<string, MappedAd[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [postDetails, setPostDetails] = useState<Record<string, AdvertisePostResponseModel>>({});
  const [isLoadingPostDetails, setIsLoadingPostDetails] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isAdActive = useCallback((ad: AdvertisePostResponseModel): boolean => {
    if (ad.status !== "success" || ad.bill?.status !== true) return false;
    const now = dayjs();
    const end = dayjs(ad.end_date);
    return end.isValid() && now.isBefore(end, "day");
  }, []);

  const getStatusAction = useCallback(
    (ad: AdvertisePostResponseModel): string => {
      if (ad.status !== "success" || ad.bill?.status !== true) {
        return localStrings.Ads.Pending;
      }
      return isAdActive(ad) ? localStrings.Ads.Active : localStrings.Ads.Completed;
    },
    [isAdActive, localStrings.Ads]
  );

  const fetchAdsByPostId = useCallback(
    async (postId: string): Promise<AdvertisePostResponseModel[] | null> => {
      const cacheKey = `ads_${postId}`;
      const cached = cache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      try {
        const params: AdvertisePostRequestModel = { post_id: postId };
        const response = await repo.getAdvertisePost(params);
        const data = response?.data ? (Array.isArray(response.data) ? response.data : [response.data]) : null;
        cache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      } catch (err) {
        console.error(`Error fetching ads for postId ${postId}:`, err);
        return null;
      }
    },
    [repo]
  );

  const fetchAdStatistics = useCallback(
    async (advertiseId: string): Promise<AdvertisePostResponseModel | null> => {
      const cacheKey = `stats_${advertiseId}`;
      const cached = cache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      try {
        const response = await repo.getAdvertiseStatistics(advertiseId);
        const data = response?.data || null;
        cache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      } catch (err) {
        console.error(`Error fetching statistics for advertiseId ${advertiseId}:`, err);
        return null;
      }
    },
    [repo]
  );

  const preloadStatistics = useCallback(
    async (advertiseId: string) => {
      setLoadingStatistics(true);
      const cacheKey = `stats_${advertiseId}`;
      const cached = cache[cacheKey];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setLoadingStatistics(false);
        return cached.data;
      }

      try {
        const data = await fetchAdStatistics(advertiseId);
        if (data) {
          setAds((prevAds) =>
            prevAds.map((ad) =>
              ad.id === advertiseId
                ? {
                    ...ad,
                    statistics: data.statistics || [],
                    total_reach: data.total_reach || ad.total_reach,
                    total_clicks: data.total_clicks || ad.total_clicks,
                    total_impression: data.total_impression || ad.total_impression,
                    resultsData: data.statistics?.map((stat: StatisticEntry) => stat.clicks || 0) || ad.resultsData,
                    reachData: data.statistics?.map((stat: StatisticEntry) => stat.reach || 0) || ad.reachData,
                    impressionsData:
                      data.statistics?.map((stat: StatisticEntry) => stat.impression || 0) || ad.impressionsData,
                    labels:
                      data.statistics?.map((stat: StatisticEntry) =>
                        dayjs(stat.aggregation_date).format("HH:mm:ss DD/MM")
                      ) || ad.labels,
                  }
                : ad
            )
          );

          setGroupedAds((prevGrouped) => {
            const newGrouped = { ...prevGrouped };
            Object.keys(newGrouped).forEach((postId) => {
              newGrouped[postId] = newGrouped[postId].map((ad) =>
                ad.id === advertiseId
                  ? {
                      ...ad,
                      statistics: data.statistics || [],
                      total_reach: data.total_reach || ad.total_reach,
                      total_clicks: data.total_clicks || ad.total_clicks,
                      total_impression: data.total_impression || ad.total_impression,
                      resultsData: data.statistics?.map((stat: StatisticEntry) => stat.clicks || 0) || ad.resultsData,
                      reachData: data.statistics?.map((stat: StatisticEntry) => stat.reach || 0) || ad.reachData,
                      impressionsData:
                        data.statistics?.map((stat: StatisticEntry) => stat.impression || 0) || ad.impressionsData,
                      labels:
                        data.statistics?.map((stat: StatisticEntry) =>
                          dayjs(stat.aggregation_date).format("HH:mm:ss DD/MM")
                        ) || ad.labels,
                    }
                  : ad
              );
            });
            return newGrouped;
          });
        }
        return data;
      } catch (err) {
        console.error(`Error preloading statistics for advertiseId ${advertiseId}:`, err);
        return null;
      } finally {
        setLoadingStatistics(false);
      }
    },
    [fetchAdStatistics]
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

      const adPromises = filteredPosts.map(async (post) => {
        const adsForPost = await fetchAdsByPostId(post.id || "");
        if (adsForPost) {
          grouped[post.id || ""] = [];
          const mappedAdsForPost = adsForPost.map((ad) => {
            const startDate = ad.start_date ? DateTransfer(new Date(ad.start_date)) : "N/A";
            const endDate = ad.end_date ? DateTransfer(new Date(ad.end_date)) : "N/A";
            const daysRemaining = ad.day_remaining ?? 0;

            const statistics: StatisticEntry[] = ad.statistics || [];
            const resultsData = statistics.map((stat: StatisticEntry) => stat.clicks || 0);
            const reachData = statistics.map((stat: StatisticEntry) => stat.reach || 0);
            const impressionsData = statistics.map((stat: StatisticEntry) => stat.impression || 0);
            const labels = statistics.map((stat: StatisticEntry) =>
              dayjs(stat.aggregation_date).format("HH:mm:ss DD/MM")
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
              total_reach: ad.total_reach || 0,
              total_clicks: ad.total_clicks || 0,
              total_impression: ad.total_impression || 0,
            };

            return mappedAd;
          });

          mappedAds.push(...mappedAdsForPost);
          grouped[post.id || ""].push(...mappedAdsForPost);
        }
      });

      await Promise.all(adPromises);

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
            const cacheKey = `post_${postId}`;
            const cached = cache[cacheKey];
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
              newPostDetails[postId] = cached.data;
              return;
            }

            const post = await repo.getPostById(postId);
            if (post?.data && (post.data.is_advertisement === 1 || post.data.is_advertisement === 2)) {
              newPostDetails[postId] = post.data as AdvertisePostResponseModel;
              cache[cacheKey] = { data: post.data, timestamp: Date.now() };
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
  }, [user?.id, page, repo, postDetails, localStrings.Ads, isAdActive, getStatusAction]);

  const loadMoreAds = useCallback(() => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, loading]);

  const advertisePost = useCallback(
    async (params: AdvertisePostRequestModel) => {
      try {
        const res = await repo.advertisePost(params);
        if (res?.data) {
          setPage(1);
          await fetchAds();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error creating advertisement");
      }
    },
    [repo, fetchAds]
  );

  useEffect(() => {
    if (user?.id) fetchAds();
  }, [fetchAds, user?.id]);

  return useMemo(
    () => ({
      loading,
      loadingStatistics,
      ads,
      groupedAds,
      error,
      advertisePost,
      fetchAds,
      loadMoreAds,
      postDetails,
      isLoadingPostDetails,
      hasMore,
      preloadStatistics,
    }),
    [
      loading,
      loadingStatistics,
      ads,
      groupedAds,
      error,
      advertisePost,
      fetchAds,
      loadMoreAds,
      postDetails,
      isLoadingPostDetails,
      hasMore,
      preloadStatistics,
    ]
  );
};

export default useAdsManagement;