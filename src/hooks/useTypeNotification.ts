const useTypeNotification = () => {
    const LIKE_POST ="like_post";
    const NEW_SHARE ="new_share";
    const NEW_COMMENT ="new_comment";
    const FRIEND_REQUEST ="friend_request";
    const ACCEPT_FRIEND_REQUEST ="accept_friend_request";
    const NEW_POST ="new_post";
    const LIKE_COMMENT ="like_comment";
    return{
        LIKE_POST,
        NEW_SHARE,
        NEW_COMMENT,
        FRIEND_REQUEST,
        ACCEPT_FRIEND_REQUEST,
        NEW_POST,
        LIKE_COMMENT
    }
}
export default useTypeNotification;