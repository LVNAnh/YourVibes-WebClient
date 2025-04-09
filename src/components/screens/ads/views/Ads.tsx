import React, { useCallback, useEffect, useState } from "react";
import useColor from "@/hooks/useColor";
import Post from "@/components/common/post/views/Post";
import { useAuth } from "@/context/auth/useAuth";
import AdsViewModel from "../viewModel/AdsViewModel";
import { defaultPostRepo } from "@/api/features/post/PostRepo";
import { DateTransfer, getDayDiffAds } from "@/utils/helper/DateTransfer";
import { CurrencyFormat } from "@/utils/helper/CurrencyFormat";
import dayjs from "dayjs";
import { AdsCalculate } from "@/utils/helper/AdsCalculate";
import { MdDateRange } from "react-icons/md";
import { FaCashRegister, FaAd } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Spin, Button, List, DatePicker, Typography, Modal, Input, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const { Text } = Typography;

const Ads = ({ postId }: { postId: string }) => {
  const price = 30000;
  const { brandPrimary, backgroundColor } = useColor();
  const [method, setMethod] = useState("momo");
  const [showCampaign, setShowCampaign] = useState(false);
  const { language, localStrings } = useAuth();
  const [diffDay, setDiffDay] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [discount, setDiscount] = useState(0);
  const router = useRouter();
  const {
    getPostDetail,
    post,
    loading,
    advertisePost,
    adsLoading,
    getAdvertisePost,
    page,
    ads,
    adsAll,
    getTomorrow,
  } = AdsViewModel(defaultPostRepo);

  // Khởi tạo ngày bắt đầu là ngày mai (30/03/2025 nếu hôm nay là 29/03/2025)
  const [date, setDate] = useState<Date>(getTomorrow());

  const paymentMethods = [
    {
      id: "momo",
      name: "MoMo",
      image: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png",
    },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getPostDetail(postId);
      await getAdvertisePost(page, postId);
    } finally {
      setRefreshing(false);
    }
  }, [postId, page]);

  const [isHistoryExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    if (postId) {
      getPostDetail(postId);
      getAdvertisePost(page, postId);
    }
  }, [postId]);

  // Hàm handleDateChange của bạn đã gọi đúng và cập nhật date và diffDay
  const handleDateChange = (selectedDate: dayjs.Dayjs | null) => {
    if (selectedDate) {
      const newDate = selectedDate.toDate();
      setDate(newDate);
      const dayDiff = getDayDiffAds(newDate);
      setDiffDay(dayDiff);
    }
  };

  const chartData = {
    labels: ads?.statistics?.map((stat) => dayjs(stat.aggregation_date).format("DD/MM")) || [],
    datasets: [
      {
        label: `${localStrings.Ads.Click}`,
        data: ads?.statistics?.map((stat) => stat.clicks) || [],
        borderColor: "#3498db",
        backgroundColor: "#3498db",
        fill: false,
        borderWidth: 3,
      },
      {
        label: `${localStrings.Ads.TotalReach}`,
        data: ads?.statistics?.map((stat) => stat.reach) || [],
        borderColor: "#2ecc71",
        backgroundColor: "#2ecc71",
        fill: false,
        borderWidth: 3,
      },
      {
        label: `${localStrings.Ads.TotalImpressions}`,
        data: ads?.statistics?.map((stat) => stat.impression) || [],
        borderColor: "#e67e22",
        backgroundColor: "#e67e22",
        fill: false,
        borderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  const renderAds = useCallback(() => {
    if (loading) return null;
    const finalPrice = AdsCalculate(diffDay, price) * (1 - discount);
    return (
      <>
        {post?.is_advertisement ? (
          <>
            {/* Advertisement history */}
            <div style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    height: 10,
                    width: 10,
                    backgroundColor: "green",
                    borderRadius: 5,
                    marginRight: 5,
                  }}
                />
                <span
                  style={{
                    fontSize: 16,
                    color: "green",
                  }}
                >
                  {localStrings.Ads.ActiveCampaign}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    backgroundColor: "#f7f7f7",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    className="flex flex-row justify-between items-center"
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    <span>{localStrings.Ads.Campaign} #1</span>
                    <MdDateRange size={20} color={brandPrimary} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.StartDay}:
                      </span>{" "}
                      {DateTransfer(ads?.start_date)}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.EndDay}:
                      </span>{" "}
                      {DateTransfer(ads?.end_date)}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.RemainingTime}:
                      </span>{" "}
                      {ads?.day_remaining} {localStrings.Ads.Day}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.Grant}:
                      </span>{" "}
                      {ads?.bill?.price ? CurrencyFormat(ads?.bill?.price) : "N/A"}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.PaymentMethod}:
                      </span>{" "}
                      {method === "momo" ? "MoMo" : "Khác"}
                    </span>
                    <br />
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.Status}:
                      </span>{" "}
                      {ads?.bill?.status ? `${localStrings.Ads.PaymentSuccess}` : `${localStrings.Ads.PaymentFailed}`}
                    </span>
                  </div>
                  {/* Display Total Metrics */}
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
                    <div style={{ marginRight: 20 }}>
                      <span style={{ fontSize: 14, color: "gray" }}>{localStrings.Ads.Click}: </span>
                      <span style={{ fontWeight: "bold" }}>{ads?.total_clicks || 0} </span>
                    </div>
                    <div style={{ marginRight: 20 }}>
                      <span style={{ fontSize: 14, color: "gray" }}>{localStrings.Ads.TotalReach}: </span>
                      <span style={{ fontWeight: "bold" }}>{ads?.total_reach || 0} </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 14, color: "gray" }}>{localStrings.Ads.TotalImpressions}: </span>
                      <span style={{ fontWeight: "bold" }}>{ads?.total_impression || 0} </span>
                    </div>
                  </div>
                  {/* Chart */}
                  {ads?.statistics && ads.statistics.length > 0 ? (
                    <div style={{ marginTop: 20 }}>
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  ) : (
                    <div style={{ marginTop: 20, textAlign: "center" }}>
                      <span>{localStrings.Ads.ErrorFetchingStatistics}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Advertisement Information */}
            <div style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 10 }}>
              <div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    marginBottom: 5,
                    display: "block",
                  }}
                >
                  {localStrings.Ads.TimeAndBudget}
                </span>
                <span
                  style={{
                    color: "gray",
                    fontSize: 14,
                    display: "block",
                  }}
                >
                  {localStrings.Ads.Minimum.replace("{{price}}", `${CurrencyFormat(price)}`)}
                </span>
                <span
                  style={{
                    color: "gray",
                    fontSize: 14,
                  }}
                >
                  VAT: 10%
                </span>
              </div>

              {/* Select advertising date */}
              <div>
                <div className="flex flex-row mt-4 mb-2 items-center">
                  <MdDateRange size={24} color={brandPrimary} />
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: 16,
                      paddingLeft: 10,
                    }}
                  >
                    {localStrings.Ads.TimeAds} {diffDay} {localStrings.Public.Day}
                  </span>
                </div>

                <DatePicker
                  format={"DD/MM/YYYY"}
                  value={dayjs(date)}
                  onChange={handleDateChange}
                  style={{ width: "100%" }}
                  disabledDate={(current) => {
                    if (current && current < dayjs().endOf("day")) {
                      return true;
                    }
                    // Giới hạn không quá 30 ngày kể từ ngày mai
                    return current && current > dayjs().add(30, 'day');
                  }}
                />
              </div>

              {/* Budget */}
              <div className="flex mt-4 mb-2 items-center">
                <FaCashRegister size={24} color={brandPrimary} />
                <span style={{ paddingLeft: 10 }}>
                  {localStrings.Ads.BudgetAds} {CurrencyFormat(finalPrice)}{" "}
                  {discount > 0 && (
                    <span style={{ color: "green" }}>
                      ({localStrings.Ads.Discount} {discount * 100}%)
                    </span>
                  )}
                </span>
              </div>

              {/* Voucher Input */}
              <div style={{ marginTop: 20 }}>
                <span style={{ fontWeight: "bold", marginRight: 10 }}>
                  {localStrings.Ads.Voucher}
                </span>
                <div style={{ display: "flex", flexDirection: "row" }}>
                  <Input
                    placeholder="voucher"
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    style={{ width: 200, marginRight: 10 }}
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ marginTop: 20 }}>
                <span style={{ fontWeight: "bold", marginRight: 10 }}>
                  {localStrings.Ads.PaymentMethod}
                </span>
                <div style={{ display: "flex", flexDirection: "row" }}>
                  {paymentMethods.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMethod(item.id)}
                      title={item.name}
                      style={{
                        borderWidth: 1,
                        borderColor: method === item.id ? "#4CAF50" : "#ccc",
                        backgroundColor: method === item.id ? "#E8F5E9" : "transparent",
                        padding: 5,
                        marginRight: 10,
                        borderRadius: 10,
                      }}
                    >
                      <img src={item.image} style={{ width: 50, height: 50 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* New Advertisement Button */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
                <Button
                  type="primary"
                  icon={<FaAd />}
                  onClick={() => {
                    advertisePost({
                      post_id: postId,
                      redirect_url: `${window.location.origin}/ads/${postId}`,
                      end_date: (dayjs(date).format("YYYY-MM-DDT00:00:00") + "Z").toString(),
                      start_date: (dayjs().format("YYYY-MM-DDT00:00:00") + "Z").toString(),
                      voucher_code: voucher || undefined,
                    });
                  }}
                  style={{
                    borderRadius: 8,
                    backgroundColor: brandPrimary,
                    color: "white",
                  }}
                >
                  {localStrings.Ads.Ads}
                </Button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }, [postId, adsLoading, ads, loading, post, date, voucher, discount]);

  return (
    <div className="p-2.5 h-[100vh]">
      <div className="mb-2 flex items-center">
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={() => router.push("/profile?tab=info")}
        />
        <Text strong style={{ fontSize: "18px", marginLeft: "10px" }}>
          {localStrings.Ads.Ads}
        </Text>
      </div>
      <div className="flex items-center xl:items-start xl:flex-row flex-col justify-center">
        <Post post={post} noFooter>
          {post?.parent_post && <Post post={post?.parent_post} isParentPost />}
        </Post>

        <div style={{ maxWidth: 600 }}>
          {renderAds()}
          <div
            onClick={() => setShowCampaign(true)}
            className="cursor-pointer pl-2.5 mt-2.5 text-blue-500 font-bold text-[16px]"
          >
            {localStrings.Ads.ShowCampaign}
          </div>
        </div>
      </div>
      <Modal
        centered
        title={localStrings.Ads.Campaign}
        open={showCampaign}
        onCancel={() => setShowCampaign(false)}
        footer={null}
        bodyStyle={{
          maxHeight: "70vh",
          overflowY: "scroll",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {(adsAll?.length ?? 0) > 0 ? (
          (adsAll ?? []).map((item, index) => (
            <div key={index} style={{ marginTop: 10 }}>
              <div
                style={{
                  backgroundColor: "#f7f7f7",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div
                  className="flex flex-row justify-between items-center"
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                  }}
                >
                  <span>
                    {localStrings.Ads.Campaign} #{index + 1}
                  </span>
                  <MdDateRange size={20} color={brandPrimary} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.StartDay}:
                      </span>{" "}
                      {DateTransfer(item?.start_date)}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.EndDay}:
                      </span>{" "}
                      {DateTransfer(item?.end_date)}
                    </span>
                  </div>

                  <div>
                    {item?.bill?.status && (
                      <span
                        style={{
                          fontSize: 14,
                          color: "gray",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>
                          {localStrings.Ads.RemainingTime}:
                        </span>{" "}
                        {item?.day_remaining
                          ? `${item?.day_remaining} ${localStrings.Ads.Day}`
                          : "Đã kết thúc"}
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.Grant}:
                      </span>{" "}
                      {item?.bill?.price ? CurrencyFormat(item?.bill?.price) : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.PaymentMethod}:
                      </span>{" "}
                      {method === "momo" ? "MoMo" : "Khác"}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.Status}:
                      </span>{" "}
                      {item?.bill?.status
                        ? localStrings.Ads.PaymentSuccess
                        : localStrings.Ads.PaymentFailed}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.Click}:
                      </span>{" "}
                      {ads?.total_clicks}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.TotalReach}:
                      </span>{" "}
                      {ads?.total_reach}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "gray",
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        {localStrings.Ads.TotalImpressions}:
                      </span>{" "}
                      {ads?.total_impression}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 10,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: "bold" }}>
              {localStrings.Ads.NoCampaign}
            </span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Ads;
