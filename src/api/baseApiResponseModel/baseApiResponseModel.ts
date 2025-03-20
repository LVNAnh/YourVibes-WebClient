export class BaseApiResponseModel<T extends Object> {
  constructor(
    public data: T,
    public paging: Paging,
    public message: string,
    public error: Error,
    public code: number,
  ) {}
}

export interface Paging {
  limit: number;
  page: number;
  total: number;
}

export class Error {
  code?: number;
  message?: string;
}

export enum Privacy {
  PUBLIC = "public",
  PRIVATE = "private",
  FRIEND_ONLY = "friend_only",
}

export enum FriendStatus {
  NotFriend = "not_friend",
  IsFriend = "is_friend",
  SendFriendRequest = "send_friend_request",
  ReceiveFriendRequest = "receive_friend_request",
}