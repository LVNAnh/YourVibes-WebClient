import {
  AdvertisePostRequestModel,
  AdvertisePostResponseModel,
} from "@/api/features/post/models/AdvertisePostModel";
import { PostResponseModel } from "@/api/features/post/models/PostResponseModel";
import { PostRepo } from "@/api/features/post/PostRepo";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { useState } from "react";

const AdsViewModel = (repo: PostRepo) => {
  const { localStrings } = useAuth();

  // State quản lý trạng thái loading và dữ liệu
  const [loading, setLoading] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);
  const [post, setPost] = useState<PostResponseModel | undefined>(undefined);
  const [ads, setAdsPost] = useState<AdvertisePostResponseModel | undefined>(
    undefined
  );
  const [adsAll, setAdsAll] = useState<
    AdvertisePostResponseModel[] | undefined
  >(undefined);
  const [page, setPage] = useState<number>(1);

  // Lấy chi tiết bài viết
  const getPostDetail = async (id: string, newAds = false) => {
    try {
      setLoading(true);
      const res = await repo.getPostById(id);
      if (!res?.error) {
        setPost(res?.data);
        if (newAds && res?.data?.is_advertisement) {
        }
      } else {
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  // Quảng cáo bài viết với mã voucher
  const advertisePost = async (params: AdvertisePostRequestModel & { voucher?: string }) => {
    try {
      setAdsLoading(true);
      const res = await repo.advertisePost(params);
      if (!res?.error) {
        if (res?.data) {
          const result = window.open(res.data, '_blank');
          if (result) {
            result.focus();

            const checkWindowClosed = setInterval(() => {
              if (result.closed) {
                clearInterval(checkWindowClosed);
                message.error(localStrings.Ads.AdvertisePostFailed);
              }
            }, 1000);

            result.onload = () => {
              clearInterval(checkWindowClosed);
              if (result.location.href.includes('success')) {
                message.success(
                  params.voucher
                    ? `${localStrings.Ads.AdvertisePostSuccess} - Voucher ${params.voucher} applied!`
                    : localStrings.Ads.AdvertisePostSuccess
                );
              } else {
                message.error(localStrings.Ads.AdvertisePostFailed);
              }
            };

            setTimeout(() => {
              if (!result.closed) {
                message.info(localStrings.Ads.AdvertisePostPending);
              }
            }, 30000);
          }
        }
      } else {
        message.error(localStrings.Ads.AdvertisePostFailed);
      }
    } catch (error: any) {
      if (error.response?.data?.err_detail) {
        message.error(localStrings.Ads.AdvertisePostFailed, error.response?.data?.err_detail);
      } else {
        message.error(localStrings.Ads.AdvertisePostFailed, error.message);
      }
    } finally {
      setAdsLoading(false);
    }
  };

  // Lấy danh sách quảng cáo
  const getAdvertisePost = async (page: number, post_id: string) => {
    try {
      setLoading(true);
      const res = await repo.getAdvertisePost({
        post_id: post_id,
        page: page,
        limit: 10,
      });
      if (res?.data?.length > 0) {
        setAdsPost(res?.data?.[0]);
        setAdsAll(Array.isArray(res?.data) ? res?.data : []);
      } else {
        setAdsPost(undefined);
        setAdsAll([]);
      }
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const loadMoreAds = () => {
    setPage(prevPage => {
      const newPage = prevPage + 1;
      getAdvertisePost(newPage, post?.id ?? '');
      return newPage;
    });
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  return {
    getTomorrow,
    loading,
    post,
    getPostDetail,
    advertisePost,
    adsLoading,
    getAdvertisePost,
    ads,
    setAdsPost,
    page,
    setPage,
    adsAll,
    setAdsAll,
  };
};

export default AdsViewModel;