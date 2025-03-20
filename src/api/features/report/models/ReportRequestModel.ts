export interface ReportRequestModel {
    type: number; // 0: User, 1: Post, 2: Comment
    reason: string;
    reported_id: string; // ID of the user, post, or comment being reported
  }
  