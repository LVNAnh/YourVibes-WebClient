"use client";

import React, { useState } from "react";
import { Input, Button, Typography } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import ReportViewModel, { ReportFactory } from "../ViewModel/reportViewModel";

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ReportScreenProps {
  postId?: string;
  userId?: string;
  commentId?: string;
  setShowModal: (show: boolean) => void;
}

const ReportScreen: React.FC<ReportScreenProps> = ({
  postId,
  userId,
  commentId,
  setShowModal,
}) => {
  const [reportReason, setReportReason] = useState("");
  const { localStrings } = useAuth();
  const { report, reportLoading } = ReportViewModel();

  const isContentLengthValid = () => {
    const contentLength = reportReason.trim().length;
    return contentLength >= 2 && contentLength <= 255;
  };
 
  const currentCharCount = reportReason.length;

  const handleReport = async () => {
    let type: number | undefined;
    let reportedId: string | undefined;

    if (postId) {
      type = 1;
      reportedId = postId;
    } else if (userId) {
      type = 0;
      reportedId = userId;
    } else if (commentId) {
      type = 2;
      reportedId = commentId;
    }

    if (type !== undefined && reportedId !== undefined && isContentLengthValid()) {
      try { 
        const reportRequest = ReportFactory.createReport(type, reportReason, reportedId);
        await report(reportRequest);
        setReportReason("");
        setShowModal(false);
      } catch (error) { 
      }
    }
  };

  const getTitleText = () => {
    if (postId) return localStrings.Report.ReportPost;
    if (userId) return localStrings.Report.ReportUser;
    return localStrings.Report.ReportComment;
  };

  return (
    <div className="p-2.5">
      <div className="flex-grow p-6">
        <Title level={5} className="text-center">
          {getTitleText()}
        </Title>
        <Text className="block text-gray-500 text-center my-4">
          {localStrings?.Report?.Note || "Please provide a reason for your report."}
        </Text>
        <TextArea
          rows={6}
          className="w-full border rounded-lg p-2"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder={localStrings.Report.placeholder}
        />
        <Text
          type={currentCharCount > 255 ? "danger" : "secondary"}
          style={{ float: "right", marginTop: 4 }}
        >
          {currentCharCount}/{localStrings.Post.CharacterLimitR}
        </Text>
      </div>

      <div className="p-6 bg-white">
        <Button
          type="primary"
          block
          onClick={handleReport}
          loading={reportLoading}
          disabled={!isContentLengthValid()}
        >
          {localStrings?.Public?.ReportFriend || "Submit Report"}
        </Button>
      </div>
    </div>
  );
};

export default ReportScreen;