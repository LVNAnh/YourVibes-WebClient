import { useState } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import React from 'react';
import { IoEllipsisVerticalSharp } from 'react-icons/io5';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { useRouter } from 'next/navigation';
import { Avatar, Dropdown, MenuProps, Modal } from 'antd';
import UserProfileViewModel from '../viewModel/UserProfileViewModel';

const ListFriends = ({
  friends: initialFriends, // Nhận danh sách bạn bè ban đầu từ props
  page,
  setPage,
  totalPage,
}: {
  friends: FriendResponseModel[],
  page: number;
	setPage: (page: number) => void;
	totalPage: number;
}) => {
  const { localStrings, isLoginUser } = useAuth();
  const router = useRouter();
  const { unFriend } = UserProfileViewModel();
  const [friends, setFriends] = useState<FriendResponseModel[]>(initialFriends);

  const handleUnfriend = async (friendId: string) => {
    try {
      await unFriend(friendId); // Gọi hàm xóa bạn bè
      setFriends((prevFriends) =>
        prevFriends.filter((friend) => friend.id !== friendId)
      ); // Loại bỏ bạn bè đã xóa khỏi danh sách
    } catch (error) {
      console.error('Failed to unfriend:', error);
    }
  };

  const itemsFriend = (friend: FriendResponseModel): MenuProps['items'] => [
      {
        key: '1',
        label: localStrings.Public.UnFriend,
        type: 'item',
        onClick: () => {
          Modal.confirm({
            centered: true,
            title: localStrings.Public.Confirm,
            content: localStrings.Profile.Friend.UnfriendConfirm,
            okText: localStrings.Public.Confirm,
            cancelText: localStrings.Public.Cancel,
        onOk: () => handleUnfriend(friend.id as string),
          });
        },
      },
      {
        key: '2',
        label: localStrings.ListFriends.ViewProfile,
        type: 'item',
        onClick: () => {
          router.push(`/user/${friend.id}`);
        },
      },
    ];

  return (
    <div className="m-2 grid md:grid-cols-2 gap-x-4 gap-y-2 cursor-pointer">
      {friends.map((friend, index) => (
        <div
          key={index}
          className="flex flex-row items-center p-2 border rounded-md"
        >
          <div
            className="flex flex-row items-center"
            onClick={() => router.push(`/user/${friend.id}`)}
          >
            <Avatar
              src={
                friend.avatar_url ||
                'https://static2.yan.vn/YanNews/2167221/202102/facebook-cap-nhat-avatar-doi-voi-tai-khoan-khong-su-dung-anh-dai-dien-e4abd14d.jpg'
              }
              alt={'avatar'}
              size={{ xs: 40, sm: 40, md: 50, lg: 50, xl: 50, xxl: 50 }}
            />
            <span className="ml-4 text-lg font-semibold">
              {friend.family_name} {friend.name}
            </span>
          </div>
      {/* {friend.id && !isLoginUser(friend.id) &&
		  (
			<Dropdown menu={{ items: itemsFriend(friend) }} placement="bottom" arrow>
            <IoEllipsisVerticalSharp className="ml-auto" />
          </Dropdown>
		  )
		  } */}
          
        </div>
      ))}
    </div>
  );
};

export default ListFriends;