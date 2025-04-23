"use client";

import React from "react";
import PeopleViewModel from "../viewModel/PeopleViewModel";
import { useAuth } from "@/context/auth/useAuth";
import { Spin, Empty, Button } from "antd";
import SearchScreen from "../../search/views/SearchScreen";
import { useRouter } from "next/navigation";

const PeopleScreens: React.FC = () => {
  const {
    users,
    loading,
    loadingFriendRequests,
    hasMore,
    friendRequests,
    incomingFriendRequests,
    handleAddFriend,
    handleCancelFriend,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
  } = PeopleViewModel();

  const { localStrings } = useAuth();
  const router = useRouter();

  if (loading && users.length === 0 && loadingFriendRequests && incomingFriendRequests.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <SearchScreen />
        </div>

        {incomingFriendRequests.length > 0 && (
          <div className="mb-8">
            <span className="block text font-bold text-gray-900 mb-4">
              {localStrings.Public.FriendRequests} ({incomingFriendRequests.length})
            </span>
            {loadingFriendRequests ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="large" />
              </div>
            ) : (
              <div className="space-y-4">
                {incomingFriendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full lg:w-2/3"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0 mb-3 sm:mb-0">
                      <div className="relative">
                        <img
                          src={request.from_user.avatar_url || '/default-avatar.png'}
                          alt={`${request.from_user.name}'s avatar`}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-medium text-gray-900 truncate cursor-pointer hover:text-gray-600"
                          onClick={() => router.push(`/user/${request.from_user.id}`)}
                        >
                          {request.from_user.name} {request.from_user.family_name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex space-x-2 self-end sm:self-center">
                      <Button
                        type="primary"
                        onClick={() => handleAcceptFriendRequest(request.from_user.id || "")}
                        className="bg-green-500 hover:bg-green-600 border-none"
                        size="small"
                      >
                        {localStrings.Public.Accept}
                      </Button>
                      <Button
                        danger
                        onClick={() => handleDeclineFriendRequest(request.from_user.id || "")}
                        size="small"
                      >
                        {localStrings.Public.Decline}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <span className="block text font-bold text-gray-900 mb-4">
            {localStrings.Public.AllUsers}
          </span>
          {loading && users.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" />
            </div>
          ) : users.length === 0 ? (
            <Empty
              description={
                <span className="text-gray-600 text-lg">
                  {localStrings.Public.UserNotFound}
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-8"
            />
          ) : (
            <>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full lg:w-2/3"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0 mb-3 sm:mb-0">
                      <div className="relative">
                        <img
                          src={user.avatar_url || '/default-avatar.png'}
                          alt={`${user.name}'s avatar`}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 cursor-pointer"
                          onClick={() => router.push(`/user/${user.id}`)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-base font-medium text-gray-900 truncate cursor-pointer hover:text-gray-600"
                          onClick={() => router.push(`/user/${user.id}`)}
                        >
                          {user.name} {user.family_name}
                        </h3>
                        {user.email && (
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="self-end sm:self-center">
                      {friendRequests.has(user.id || "") ? (
                        <Button
                          onClick={() => handleCancelFriend(user.id || "")}
                          className="border-gray-300 text-gray-700 hover:text-gray-900"
                          size="small"
                        >
                          {localStrings.Public.CancelFriendRequest}
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          onClick={() => handleAddFriend(user.id || "")}
                          size="small"
                        >
                          {localStrings.Public.AddFriend}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center items-center py-8">
                  <Spin size="large" tip="Loading more..." />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleScreens;