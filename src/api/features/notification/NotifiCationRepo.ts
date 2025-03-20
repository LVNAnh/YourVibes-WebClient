import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { GetNotifiCationRequestModel, NotificationResponseModel,} from "./models/NotifiCationModel";

interface INotificationRepo {
    getNotifications: (data: GetNotifiCationRequestModel) => Promise<BaseApiResponseModel<NotificationResponseModel[]>>;
    updateNotification: (data: NotificationResponseModel) => Promise<BaseApiResponseModel<NotificationResponseModel>>;
    updateAllNotification: (data: NotificationResponseModel) => Promise<BaseApiResponseModel<NotificationResponseModel>>;
}
export class NotifiCationRepo implements INotificationRepo {
    async getNotifications(data: GetNotifiCationRequestModel): Promise<BaseApiResponseModel<NotificationResponseModel[]>> {
        return client.get(ApiPath.GET_NOTIFICATIONS, data);
    }
    async updateNotification(data: NotificationResponseModel): Promise<BaseApiResponseModel<NotificationResponseModel>> {
        return client.patch(ApiPath.READ_NOTIFICATION + data.id, data);
    }
    async updateAllNotification(): Promise<BaseApiResponseModel<NotificationResponseModel>> {
        return client.patch(ApiPath.READ_ALL_NOTIFICATION);
    }
}

export const defaultNotificationRepo = new NotifiCationRepo();
