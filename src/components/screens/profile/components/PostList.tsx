import React, { useCallback, useEffect, useState } from 'react';
import { Spin, Modal, Empty, message, Avatar } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import { PostResponseModel } from '@/api/features/post/models/PostResponseModel';
import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import useColor from '@/hooks/useColor';
import { useAuth } from '@/context/auth/useAuth';
import Post from '@/components/common/post/views/Post';
import AddPostScreen from '@/components/screens/addPost/view/AddPostScreen';
import EditPostViewModel from '@/components/features/editpost/viewModel/EditPostViewModel';
import { defaultPostRepo } from '@/api/features/post/PostRepo';

const PostList = ({ loading, posts, loadMorePosts, user, fetchUserPosts, hasMore, setPosts }: {
  loading: boolean;
  posts: PostResponseModel[];
  loadMorePosts: () => void;
  user: UserModel;
  fetchUserPosts: () => void;
  hasMore: boolean; // Biến để kiểm tra có còn dữ liệu hay không
  setPosts: React.Dispatch<React.SetStateAction<PostResponseModel[]>>;
}) => {
  const { backgroundColor, lightGray } = useColor();
  const { isLoginUser, localStrings } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const {deletePost} = EditPostViewModel(defaultPostRepo, user?.id || "", "");
  
  const handlePostSuccess = () => {
    setIsModalVisible(false);
    fetchUserPosts();
  };
  
  const handleDeletePost = async (postId: string) => {
      await deletePost(postId); 
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
    
  };

  const renderAddPost = useCallback(() => {
    return (
      <>
        <div
          onClick={() => setIsModalVisible(true)}
          style={{
            padding: "10px",
            display: "flex",
            alignItems: "center",
            backgroundColor: backgroundColor,
            border: `1px solid ${lightGray}`,
            borderRadius: "10px",
            cursor: "pointer",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <Avatar
            src={user?.avatar_url}
            alt="User Avatar"
            size={{ xs: 40, sm: 40, md: 50, lg: 50, xl: 50, xxl: 50 }}
          />
          <div style={{ marginLeft: "10px", flex: 1 }}>
            <p>
              {user?.family_name + " " + user?.name ||
                localStrings.Public.Username}
            </p>
            <p style={{ color: "gray" }}>{localStrings.Public.Today}</p>
          </div>
        </div>
        <Modal centered title={localStrings.AddPost.NewPost}
          open={isModalVisible} onCancel={() => setIsModalVisible(false)} width={800} footer={null}>
          <AddPostScreen onPostSuccess={handlePostSuccess} />
        </Modal>
      </>
    );
  }, [user, backgroundColor, lightGray, localStrings, isModalVisible]);

  return (
    <div className="w-auto flex flex-col items-center justify-center xl:items-end">
      {/* Add Post Button */}
      {isLoginUser(user?.id as string) && renderAddPost()}

      {/* Posts List */}
      <div style={{ width: '100%' }}>
        {posts && posts.length > 0 ? (
          <InfiniteScroll
            dataLength={posts.length}
            next={loadMorePosts}
            hasMore={hasMore}
            loader={<Spin indicator={<LoadingOutlined spin />} size="large" />}
            endMessage={
              <p style={{ textAlign: 'center' }}>
                {/* <b>{localStrings.Public.NoMorePosts}</b> */}
              </p>
            }
          >

            {posts.map((item) => (
              <div key={item?.id} className='w-full flex flex-col items-center xl:items-end' >
                <Post post={item} fetchUserPosts={fetchUserPosts} onDeletePost={handleDeletePost}>
                  {item?.parent_post && <Post post={item?.parent_post} isParentPost />}
                </Post>
              </div>
            ))}
          </InfiniteScroll>) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Empty description={
              <span style={{ color: 'gray', fontSize: 16 }}>
                {localStrings.Post.NoPosts}
              </span>
            }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostList;