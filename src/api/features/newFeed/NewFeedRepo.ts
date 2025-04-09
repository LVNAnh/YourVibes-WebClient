import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { NewFeedRequestModel, NewFeedResponseModel, SuggestionResponseModel } from "./Model/NewFeedModel";

interface INewFeedRepo {
    getNewFeed: (data: NewFeedRequestModel) => Promise<BaseApiResponseModel<NewFeedResponseModel[]>>;
    getSuggestion: (data: NewFeedRequestModel) => Promise<SuggestionResponseModel>;
}

export class NewFeedRepo implements INewFeedRepo {
    async getNewFeed(data: NewFeedRequestModel): 
        Promise<BaseApiResponseModel<NewFeedResponseModel[]>> {
        return client.get(ApiPath.GET_NEW_FEEDS, data);
    }

    async getSuggestion(data: NewFeedRequestModel): 
        Promise<SuggestionResponseModel> {
        return client.get(ApiPath.GET_SUGGESTION, data);
    }

    async deleteNewFeed(id: string): Promise<BaseApiResponseModel<any>> {
        return client.delete(ApiPath.DELETE_NEW_FEED + id);
    }
}

export const defaultNewFeedRepo = new NewFeedRepo();