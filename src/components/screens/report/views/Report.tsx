// import React, { useState } from 'react';
// import { Input, Button, Typography, message } from 'antd';
// import { useAuth } from '@/context/auth/useAuth';
// import ReportViewModel from '../ViewModel/reportViewModel';

// const { TextArea } = Input;
// const { Text, Title } = Typography;

// const ReportScreen = ({ postId, userId, commentId, setShowModal }: { postId?: string; userId?: string; commentId?: string; setShowModal: (show: boolean) => void }) => {
//   const [reportReason, setReportReason] = useState('');
//   const { localStrings } = useAuth();
//   const { reportPost, reportLoading, reportUser, reportComment } = ReportViewModel();

//   const handleReport = async () => {
//     let res;
  
//     if (postId) {
//       res = await reportPost({ report_post_id: postId, reason: reportReason });
//     } else if (userId) {
//       res = await reportUser({ reported_user_id: userId, reason: reportReason });
//     } else if (commentId) {
//       res = await reportComment({ report_comment_id: commentId, reason: reportReason });
//     }
  
//     // Đóng modal nếu báo cáo thành công
//     if (res && !res.error) {
//       setShowModal(false);
//       setReportReason('');
//     }
//   };
  
//   return (
//     <div className="p-2.5">
//       {/* Content */}
//       <div className="flex-grow p-6">
//         <Title level={5} className="text-center">
//           {postId ? `${localStrings.Report.ReportPost}` : userId ? `${localStrings.Report.ReportUser}` : `${localStrings.Report.ReportComment}`}
//         </Title>
//         <Text className="block text-gray-500 text-center my-4">
//           {localStrings.Report.Note}
//         </Text>
//         <TextArea
//           rows={6}
//           className="w-full border rounded-lg p-2"
//           value={reportReason}
//           onChange={(e) => setReportReason(e.target.value)}
//           placeholder={localStrings.Report.placeholder}
//         />
//       </div>

//       {/* Footer */}
//       <div className="p-6 bg-white">
//         <Button
//           type="primary"
//           block
//           onClick={handleReport}
//           loading={reportLoading}
//           disabled={!reportReason.trim()}
//         >
//           {localStrings.Public.ReportFriend}
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default ReportScreen;

import React, { useState } from 'react';
import { Input, Button, Typography } from 'antd';
import { useAuth } from '@/context/auth/useAuth';
import ReportViewModel from '../ViewModel/reportViewModel';

const { TextArea } = Input;
const { Text, Title } = Typography;

const ReportScreen = ({ postId, userId, commentId, setShowModal }: { postId?: string; userId?: string; commentId?: string; setShowModal: (show: boolean) => void }) => {
  const [reportReason, setReportReason] = useState('');
  const { localStrings } = useAuth();
  const { report, reportLoading } = ReportViewModel();

  const handleReport = async () => {
    let type: number | undefined;
    let reportedId: string | undefined;

    if (postId) {
      type = 1; // Post
      reportedId = postId;
    } else if (userId) {
      type = 0; // User
      reportedId = userId;
    } else if (commentId) {
      type = 2; // Comment
      reportedId = commentId;
    }

    if (type !== undefined && reportedId !== undefined) {
      const res = await report({ type, reason: reportReason, reported_id: reportedId });
      if (res && !res.error) {
        setShowModal(false);
        setReportReason('');
      }
    }
  };

  return (
    <div className="p-2.5">
      {/* Content */}
      <div className="flex-grow p-6">
        <Title level={5} className="text-center">
          {postId ? `${localStrings.Report.ReportPost}` : userId ? `${localStrings.Report.ReportUser}` : `${localStrings.Report.ReportComment}`}
        </Title>
        <Text className="block text-gray-500 text-center my-4">
          {localStrings.Report.Note}
        </Text>
        <TextArea
          rows={6}
          className="w-full border rounded-lg p-2"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder={localStrings.Report.placeholder}
        />
      </div>

      {/* Footer */}
      <div className="p-6 bg-white">
        <Button
          type="primary"
          block
          onClick={handleReport}
          loading={reportLoading}
          disabled={!reportReason.trim()}
        >
          {localStrings.Public.ReportFriend}
        </Button>
      </div>
    </div>
  );
};

export default ReportScreen;
