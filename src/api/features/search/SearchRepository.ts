import { ApiPath } from "../../ApiPath";
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { UserModel } from "../authenticate/model/LoginModel";
import { SearchRequestModel } from "./model/SearchModel";

interface ISearchRepo {
  search(data: SearchRequestModel): Promise<BaseApiResponseModel<UserModel[]>>
}

export class SearchRepo implements ISearchRepo {
  async search(data: SearchRequestModel): Promise<BaseApiResponseModel<UserModel[]>> {
    return client.get(ApiPath.SEARCH, data);
  }
}

export const defaultSearchRepo = new SearchRepo();