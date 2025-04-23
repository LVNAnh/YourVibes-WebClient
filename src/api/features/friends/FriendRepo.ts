import { ApiPath } from "../../ApiPath"; 
import { BaseApiResponseModel } from "../../baseApiResponseModel/baseApiResponseModel";
import client from "../../client";
import { GetBirthdayFriendsModel } from "./models/GetBirthdayFriends";
import { GetUserNonFriendsModel } from "./models/GetUserNonFriends";

interface IFriendRepo {
    getUsersNonFriend(): Promise<BaseApiResponseModel<GetUserNonFriendsModel>>;
     getBirthdayFriends(): Promise<BaseApiResponseModel<GetBirthdayFriendsModel[]>>;
}

export class FriendRepo implements IFriendRepo {
    async getUsersNonFriend(): Promise<BaseApiResponseModel<GetUserNonFriendsModel>> {
        return client.get(ApiPath.NON_FRIENDS);
    }

    async getBirthdayFriends(): Promise<BaseApiResponseModel<GetBirthdayFriendsModel[]>> {
        return client.get(ApiPath.BIRTHDAY_FRIENDS);
    }
}

export const defaultFriendRepo = new FriendRepo();