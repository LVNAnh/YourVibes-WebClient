// import { defaultCommentRepo } from "@/api/features/comment/CommentRepo";
// import { ReportCommentRequestModel } from "@/api/features/comment/models/ReportComment";
// import { ReportPostRequestModel } from "@/api/features/post/models/ReportPost";
// import { defaultPostRepo, PostRepo } from "@/api/features/post/PostRepo";
// import { ReportUserRequestModel } from "@/api/features/profile/model/ReportUser";
// import { defaultProfileRepo } from "@/api/features/profile/ProfileRepository";
// import { useAuth } from "@/context/auth/useAuth";
// import { message } from "antd";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// const ReportViewModel = () => {
//     const router = useRouter();
//     const { localStrings } = useAuth();
//     const [reportLoading, setReportLoading] = useState(false);
//     const [showModal, setShowModal] = useState(false);

//     const reportPost = async (params: ReportPostRequestModel) => {
//         try {
//             setReportLoading(true);
//             const res = await defaultPostRepo.reportPost(params); 
            
//             if (!res?.error) {
//                 message.success(localStrings.Report.ReportSuccess);
//             } else {
//                 message.error(localStrings.Report.ReportPostFailed);
//             }
//             return res;
//         } catch (error: any) {
//             console.error(error);
//             message.error(localStrings.Report.ReportFailed);
//         } finally {
//             setReportLoading(false);
//         }
        
//     }
//       const reportUser = async (params: ReportUserRequestModel) => {
//         try {
//           setReportLoading(true);
//           const res = await defaultProfileRepo.reportUser(params); 
//           if (!res?.error) {
//            message.success(localStrings.Report.ReportSuccess);
//           } else {
//             message.error(localStrings.Report.ReportUserFailed);
//           }
//           return res;
//         } catch (error: any) {
//           console.error(error);
//           message.error(localStrings.Report.ReportFailed);
//         } finally {
//           setReportLoading(false);
//         }
//         }

//         const reportComment = async (params: ReportCommentRequestModel) => {
//           try{
//             setReportLoading(true);
//             const res = await defaultCommentRepo.reportComment(params); 
            
//             if (!res?.error) {
//               message.success(localStrings.Report.ReportSuccess);
//             } else {
//               message.error(localStrings.Report.ReportCommentFailed);
//             }
//             return res;
//           } catch (error: any) {
//             console.error(error);
//             message.error(localStrings.Report.ReportFailed);
//           } finally {
//             setReportLoading(false);
//           }
//         }
//     return {
//         reportLoading,
//         reportPost,
//         reportUser,
//         reportComment,
//         setShowModal,
//         showModal,
//     }
// }
// export default ReportViewModel;

import { defaultReportRepo } from "@/api/features/report/ReportRepo";
import { ReportRequestModel } from "@/api/features/report/models/ReportRequestModel";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ReportViewModel = () => {
    const router = useRouter();
    const { localStrings } = useAuth();
    const [reportLoading, setReportLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const report = async (params: ReportRequestModel) => {
        try {
            setReportLoading(true);
            const res = await defaultReportRepo.report(params);

            if (!res?.error) {
                message.success(localStrings.Report.ReportSuccess);
            } else {
                let errorMessage = localStrings.Report.ReportFailed;
                if (params.type === 0) {
                    errorMessage = localStrings.Report.ReportUserFailed;
                } else if (params.type === 1) {
                    errorMessage = localStrings.Report.ReportPostFailed;
                } else if (params.type === 2) {
                    errorMessage = localStrings.Report.ReportCommentFailed;
                }
                message.error(errorMessage);
            }
            return res;
        } catch (error: any) {
            console.error(error);
            message.error(localStrings.Report.ReportFailed);
        } finally {
            setReportLoading(false);
        }
    };

    return {
        reportLoading,
        report,
        setShowModal,
        showModal,
    };
};

export default ReportViewModel;
