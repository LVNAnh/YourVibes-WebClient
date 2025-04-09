import { defaultReportRepo } from "@/api/features/report/ReportRepo";
import { ReportRequestModel } from "@/api/features/report/models/ReportRequestModel";
import { useAuth } from "@/context/auth/useAuth";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AxiosError } from "axios";
 
interface ReportObserver {
  update(status: string, message: string): void;
}
 
export class ReportFactory {
  static createReport(type: number, reason: string, reportedId: string): ReportRequestModel {
    return {
      type,
      reason,
      reported_id: reportedId,
    };
  }
}
 
class ReportSubject {
  private observers: ReportObserver[] = [];

  addObserver(observer: ReportObserver) {
    this.observers.push(observer);
  }

  removeObserver(observer: ReportObserver) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(status: string, message: string) {
    this.observers.forEach((observer) => observer.update(status, message));
  }
}

const ReportViewModel = () => {
  const router = useRouter();
  const { localStrings } = useAuth();
  const [reportLoading, setReportLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const reportSubject = new ReportSubject();
 
  const messageObserver: ReportObserver = {
    update: (status: string, messageString: string) => {
      if (status === "success") {
        message.success(messageString);
      } else {
        message.error(messageString);
      }
    },
  };
 
  reportSubject.addObserver(messageObserver);

  const report = async (params: ReportRequestModel) => {
    try {
      setReportLoading(true);
      const res = await defaultReportRepo.report(params);
      if (res && (res.code === 200 || res.code === 20001)) {
        reportSubject.notifyObservers("success", localStrings.Report.ReportSuccess);
        setShowModal(false);
        return res;
      } else {
        let errorMessage = "";
        switch (params.type) {
          case 0:
            errorMessage = localStrings.Report.ReportUserFailed;
            break;
          case 1:
            errorMessage = localStrings.Report.ReportPostFailed;
            break;
          case 2:
            errorMessage = localStrings.Report.ReportCommentFailed;
            break;
          default:
            errorMessage = localStrings.Report.ReportFailed;
        }
        reportSubject.notifyObservers("error", errorMessage);
        return res;
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage =
        (axiosError.response?.data as any)?.message || localStrings.Report.ReportFailed;
      reportSubject.notifyObservers("error", errorMessage);
      setShowModal(false);
      throw axiosError;
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