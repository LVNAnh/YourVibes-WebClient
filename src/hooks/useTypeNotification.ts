const useTypeNotification = () => {
    const LIKE_POST ="like_post";
    const NEW_SHARE ="new_share";
    const NEW_COMMENT ="new_comment";
    const FRIEND_REQUEST ="friend_request";
    const ACCEPT_FRIEND_REQUEST ="accept_friend_request";
    const NEW_POST ="new_post";
    const NEW_POST_PERSONAL ="new_post_personal";
    const BLOCK_CREATE_POST ="block_create_post";
    const LIKE_COMMENT ="like_comment";
    const DEACTIVATE_POST ="deactivate_post";
    const ACTIVACE_POST ="activace_post";
    const DEACTIVATE_COMMENT ="deactivate_comment";
    const ACTIVACE_COMMENT ="activace_comment";
    return{
        LIKE_POST,
        NEW_SHARE,
        NEW_COMMENT,
        FRIEND_REQUEST,
        ACCEPT_FRIEND_REQUEST,
        NEW_POST,
        LIKE_COMMENT,
        NEW_POST_PERSONAL,
        BLOCK_CREATE_POST,
        DEACTIVATE_POST,
        ACTIVACE_POST,
        DEACTIVATE_COMMENT,
        ACTIVACE_COMMENT,

    }
}
export default useTypeNotification;