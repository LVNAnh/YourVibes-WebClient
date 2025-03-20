import { ApiPath } from "@/api/ApiPath";
import { ReportRequestModel } from "../report/models/ReportRequestModel";
import { BaseApiResponseModel } from "@/api/baseApiResponseModel/baseApiResponseModel";
import client from "@/api/client";


interface IReportRepo {
    report(params: ReportRequestModel): Promise<BaseApiResponseModel<ReportRequestModel>>;
}

export class ReportRepo implements IReportRepo {
    async report(params: ReportRequestModel): Promise<BaseApiResponseModel<ReportRequestModel>> {
        return client.post(ApiPath.REPORT, params);
    }
}


export const defaultReportRepo = new ReportRepo();
