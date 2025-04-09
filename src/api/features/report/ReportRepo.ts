import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { ReportRequestModel } from "./models/ReportRequestModel";

interface IReportRepo {
    report: (params: ReportRequestModel) => Promise<BaseApiResponseModel<any>>;
}

export class ReportRepo implements IReportRepo {
    async report(params: ReportRequestModel): Promise<BaseApiResponseModel<any>> {
        return client.post(ApiPath.REPORT, params);
    }
}

export const defaultReportRepo = new ReportRepo();