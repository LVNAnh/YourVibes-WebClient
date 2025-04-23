export interface FriendModel {
    id: string;
    family_name: string;
    name: string;
    avatar_url: string;
  }
  
  export interface FriendResponse {
    code: number;
    message: string;
    data: FriendModel[];
    paging: {
      limit: number;
      page: number;
      total: number;
    };
  }
  