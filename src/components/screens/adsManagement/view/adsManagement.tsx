"use client";

import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Modal, Spin, Button } from "antd";
import { defaultPostRepo, PostRepo } from "@/api/features/post/PostRepo";
import { AdvertisePostResponseModel } from "@/api/features/post/models/AdvertisePostModel";
import { useAuth } from "@/context/auth/useAuth";
import Post from "@/components/common/post/views/Post";
import dayjs from "dayjs";
import useAdsManagement from "../viewModel/adsManagementViewModel";
import PostList from "../../profile/components/PostList"; 
import { CurrencyFormat } from "@/utils/helper/CurrencyFormat";
import { GetUsersPostsRequestModel } from "@/api/features/post/models/GetUsersPostsModel";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  bill: any;
  isActive: boolean;
  status_action: string;
  total_reach?: number;
  total_clicks?: number;
  total_impression?: number;
}

const AdDetailsModal = ({ ad, onClose, post }: { ad: MappedAd; onClose: () => void; post?: any }) => {
  const { localStrings } = useAuth();
  const [statsData, setStatsData] = useState<AdvertisePostResponseModel | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!ad.id) return;
      setLoadingStats(true);
      try {
        const response = await defaultPostRepo.getAdvertiseStatistics(ad.id);
        if (response?.data) {
          setStatsData(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStatistics();
  }, [ad.id]);

  const chartData = statsData || ad;
  const data = {
    labels:
      chartData?.statistics?.map((stat) => dayjs(stat.aggregation_date).format("DD/MM")) ||
      ad.labels ||
      [],
    datasets: [
      {
        label: localStrings.Ads.Click,
        data: chartData?.statistics?.map((stat) => stat.clicks) || ad.resultsData || [],
        borderColor: "#3498db",
        fill: false,
        tension: 0.3,
      },
      {
        label: localStrings.Ads.TotalReach,
        data: chartData?.statistics?.map((stat) => stat.reach) || ad.reachData || [],
        borderColor: "#2ecc71",
        fill: false,
        tension: 0.3,
      },
      {
        label: localStrings.Ads.TotalImpressions,
        data: chartData?.statistics?.map((stat) => stat.impression) || ad.impressionsData || [],
        borderColor: "#e67e22",
        fill: false,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    scales: {
      x: { title: { display: true, text: localStrings.Public.Day } },
      y: { title: { display: true, text: "Value" }, beginAtZero: true },
    },
    plugins: {
      legend: { position: "top" as const, labels: { boxWidth: 10, padding: 10 } },
      tooltip: { mode: "index" as const, intersect: false },
    },
  };

  const handleCloseModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const startDate = ad.start_date;
  const endDate = ad.end_date;
  const remainingDays = ad.day_remaining;
  const grant = ad.bill?.price !== undefined ? CurrencyFormat(ad.bill.price) : "N/A";
  const paymentStatus =
    ad.bill?.status === true ? localStrings.Ads.PaymentSuccess : localStrings.Ads.PaymentFailed;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div
        className="bg-white p-6 rounded-xl shadow-2xl relative overflow-hidden"
        style={{ width: "1000px", maxHeight: "1000px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={handleCloseModal}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col md:flex-row gap-4 h-full overflow-y-auto">
          <div className="md:w-1/2 w-full flex justify-center items-center" style={{ minHeight: "250px" }}>
            {post && (post.is_advertisement === 1 || post.is_advertisement === 2) ? (
              <div className="w-full h-full overflow-hidden flex flex-col" style={{ maxHeight: "100%" }}>
                <Post post={post} noFooter>
                  {post.media && post.media.length > 0 && (
                    <div className="w-full h-auto flex-shrink-0">
                      {post.media.map((media: { media_url: string }, index: number) => {
                        const isVideo = /\.(mp4|webm|ogg)$/i.test(media.media_url);
                        return isVideo ? (
                          <video
                            key={index}
                            src={media.media_url}
                            controls
                            className="w-full h-auto max-h-[250px] object-contain rounded-md"
                          />
                        ) : (
                          <img
                            key={index}
                            src={media.media_url}
                            alt={post.content || "Ad Image"}
                            className="w-full h-auto max-h-[250px] object-contain rounded-md"
                          />
                        );
                      })}
                    </div>
                  )}
                </Post>
              </div>
            ) : (
              <Spin tip="Loading post..." />
            )}
          </div>
          <div className="md:w-1/2 flex flex-col gap-2 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.StartDay}:</strong> {startDate}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.EndDay}:</strong> {endDate}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.RemainingTime}:</strong>{" "}
                  {`${remainingDays} ${localStrings.Ads.Day}`}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.Grant}:</strong> {grant}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.PaymentMethod}:</strong> Momo
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.Status}:</strong> {paymentStatus}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200 md:col-span-2">
                <p>
                  <strong>{localStrings.Ads.StatusActive}:</strong>{" "}
                  {Number(ad.is_advertisement) === 1 ?  localStrings.Ads.Done:localStrings.Ads.Active}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.Click}:</strong>{" "}
                  {statsData?.total_clicks ?? ad.total_clicks ?? 0}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.TotalReach}:</strong>{" "}
                  {statsData?.total_reach ?? ad.total_reach ?? 0}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <p>
                  <strong>{localStrings.Ads.TotalImpressions}:</strong>{" "}
                  {statsData?.total_impression ?? ad.total_impression ?? 0}
                </p>
              </div>
            </div>
            <div className="h-[250px]">
              {loadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Spin tip="Loading statistics..." />
                </div>
              ) : (
                <Line data={data} options={options} />
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 text-center">
          <Button
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            onClick={handleCloseModal}
          >
            {localStrings.Public.Close}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdsManagementFeature = () => {
  const {
    loading,
    ads,
    groupedAds,
    postDetails,
    isLoadingPostDetails,
  } = useAdsManagement();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAds, setFilteredAds] = useState<MappedAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<MappedAd | null>(null);
  const [isPostListModalVisible, setIsPostListModalVisible] = useState(false);
  const [modalPosts, setModalPosts] = useState<any[]>([]);
  const [isLoadingModalPosts, setIsLoadingModalPosts] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { localStrings, user } = useAuth();
  const repo: PostRepo = defaultPostRepo;

  useEffect(() => {
    const filter = ads.filter((ad: MappedAd) => {
      const postIdMatch = ad.post_id && ad.post_id.toLowerCase().includes(searchTerm.toLowerCase());
      const postContentMatch =
        postDetails[ad.post_id!] && postDetails[ad.post_id!].content?.toLowerCase().includes(searchTerm.toLowerCase());
      return postIdMatch || postContentMatch;
    });
    setFilteredAds(filter);
  }, [searchTerm, ads, postDetails]);

  const fetchNonAdPosts = async () => {
    setIsLoadingModalPosts(true);
    try {
      const request: GetUsersPostsRequestModel = {
        user_id: user?.id,
        sort_by: "created_at",
        isDescending: true,
        limit: 10,
        page: 1,
      };
      const res = await repo.getPosts(request);
      if (res?.data) {
        const filteredPosts = res.data.filter((post) => post.is_advertisement=== 0 );
        setModalPosts(filteredPosts);
      }
    } catch (err) {
      console.error("Error fetching non-ad posts:", err);
    } finally {
      setIsLoadingModalPosts(false);
    }
  };

  useEffect(() => {
    if (isPostListModalVisible) {
      fetchNonAdPosts();
    }
  }, [isPostListModalVisible]);

  const openModal = (ad: MappedAd) => {
    setSelectedAd(ad);
    closeHistoryModal();
  };

  const closeModal = () => {
    setSelectedAd(null);
  };

  const openHistoryModal = (postId: string) => {
    setSelectedPostId(postId);
    setIsHistoryModalVisible(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalVisible(false);
    setSelectedPostId(null);
  };

  const uniquePostIds = Array.from(new Set(filteredAds.map((ad) => ad.post_id).filter(Boolean))) as string[];

  return (
    <div className="p-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-semibold text-gray-800">{localStrings.Ads.AdsManagement}</h1>
        <div className="flex gap-3">
          <button
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
            onClick={() => setIsPostListModalVisible(true)}
          >
            {localStrings.Ads.SelectAds}
          </button>
        </div>
      </div>

      <Modal
        title={<div style={{ textAlign: "center", fontSize: 24, fontWeight: "bold" }}>{localStrings.Ads.SelectAds}</div>}
        open={isPostListModalVisible}
        onCancel={() => setIsPostListModalVisible(false)}
        footer={null}
        width={700} 
        centered
        bodyStyle={{ maxHeight: "1500px", overflowY: "auto", padding: "16px" }}
      >
        <div style={{ maxHeight: "1500px", overflowY: "auto", padding: "8px" }}>
          {isLoadingModalPosts ? (
            <div className="flex justify-center">
              <Spin />
            </div>
          ) : (
            <PostList
              loading={false}
              posts={modalPosts}
              loadMorePosts={fetchNonAdPosts}
              user={{ id: user?.id || "", name: "", family_name: "", avatar_url: "" }}
              fetchUserPosts={fetchNonAdPosts}
              hasMore={modalPosts.length % 10 === 0}
              setPosts={setModalPosts}
            />
          )}
        </div>
      </Modal>

      <div className="mb-6">
        <input
          type="text"
          placeholder={localStrings.Ads.SearchAds}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && filteredAds.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : uniquePostIds.length === 0 ? (
        <p className="text-center text-gray-500 text-lg py-10">{localStrings.Ads.NoAdsFound}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoadingPostDetails ? (
            <div className="flex justify-center items-center col-span-full h-64">
              <Spin size="large" />
            </div>
          ) : (
            uniquePostIds.map((postId) => {
              const post = postDetails[postId];
              const adsForPost = groupedAds[postId] || [];
              const firstAd = adsForPost[0];

              return (
                <div
                  key={postId}
                  className="group p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 cursor-pointer hover:border-blue-300"
                >
                  <div
                    className="w-full max-w-full flex justify-center items-center rounded-lg overflow-hidden bg-gray-50"
                    style={{ height: "180px" }}
                  >
                    {post && (post.is_advertisement === 1 || post.is_advertisement === 2) ? (
                      <div className="w-full h-full flex flex-col justify-between p-2">
                        {post.content && (
                          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">{post.content}</h3>
                        )}
                        {post.media &&
                          post.media.length > 0 &&
                          post.media.map((media: { media_url: string }, index: number) => {
                            const isVideo = /\.(mp4|webm|ogg)$/i.test(media.media_url);
                            return isVideo ? (
                              <video
                                key={index}
                                src={media.media_url}
                                controls
                                className="w-full h-24 object-cover rounded-md mt-2"
                              />
                            ) : (
                              <img
                                key={index}
                                src={media.media_url}
                                alt={post.content || "Ad Image"}
                                className="w-full h-24 object-cover rounded-md mt-2"
                              />
                            );
                          })}
                      </div>
                    ) : (
                      <Spin tip="Loading post..." />
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="mt-2 text-xs text-gray-700 space-y-1">
                      {firstAd?.start_date && (
                        <p>
                          <span className="font-semibold">{localStrings.Ads.StartDay}:</span>{" "}
                          {firstAd.start_date}
                        </p>
                      )}
                      {firstAd?.end_date && (
                        <p>
                          <span className="font-semibold">{localStrings.Ads.EndDay}:</span>{" "}
                          {firstAd.end_date}
                        </p>
                      )}
                      {firstAd?.bill?.price !== undefined && (
                        <p>
                          <span className="font-semibold">{localStrings.Ads.Grant}:</span>{" "}
                          {CurrencyFormat(firstAd.bill.price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {adsForPost.length > 1 ? (
                      <button
                        className="w-full py-1.5 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                        onClick={() => openHistoryModal(postId)}
                      >
                        {localStrings.Ads.ViewHistory} ({adsForPost.length})
                      </button>
                    ) : (
                      <button
                        className="w-full py-1.5 text-xs text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                        onClick={() => openModal(firstAd)}
                      >
                        {localStrings.Ads.ViewDetails}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedAd && <AdDetailsModal ad={selectedAd} onClose={closeModal} post={postDetails[selectedAd.post_id!]} />}

      <Modal
        title={`${localStrings.Ads.HistoryforPost}: ${selectedPostId && postDetails[selectedPostId]?.content ? postDetails[selectedPostId].content : localStrings.Ads.NoAdsHistory}`}
        open={isHistoryModalVisible}
        onCancel={closeHistoryModal}
        footer={null}
        width={700}
        bodyStyle={{ maxHeight: "600px", overflowY: "auto", padding: "16px" }}
      >

        <div className="space-y-3">
          {selectedPostId && groupedAds[selectedPostId] ? (
            groupedAds[selectedPostId].map((ad) => (
              <div
                key={ad.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => openModal(ad)}
              >
                <p>
                  <strong>{localStrings.Ads.StartDay}:</strong> {ad.start_date}
                </p>
                <p>
                  <strong>{localStrings.Ads.EndDay}:</strong> {ad.end_date}
                </p>
                <p>
                  <strong>{localStrings.Ads.Grant}:</strong> {ad.bill?.price ? CurrencyFormat(ad.bill.price) : "N/A"}
                </p>
              </div>
            ))
          ) : (
            <p>{localStrings.Ads.NoHistoryFound}</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdsManagementFeature;