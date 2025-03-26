import React from 'react';
import { AiOutlineSearch, AiOutlineUsergroupAdd } from "react-icons/ai";
import { FriendSidebarProps } from '../../types/messageTypes';

const FriendsSidebar: React.FC<FriendSidebarProps> = ({
  friends,
  activeFriend,
  messages,
  friendSearchText,
  currentUser,
  onSearchChange,
  onFriendSelect,
  onCreateGroup,
  localStrings
}) => {
  const filteredFriends = friends.filter((friend) => {
    const fullName = `${friend.family_name || ""} ${friend.name || ""}`.toLowerCase();
    return fullName.includes(friendSearchText.toLowerCase());
  });

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 border-r p-2 md:p-4 overflow-y-auto h-[40vh] md:h-[80vh] bg-white">
      <div className="flex items-center w-full">
        <AiOutlineSearch className="mr-[10px]" />
        <input
          type="text"
          placeholder={localStrings.Messages.SearchUser}
          className="flex-1 p-2 border rounded-lg text-sm md:text-base"
          value={friendSearchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          title={localStrings.Messages.CreateChatGroup}
          aria-label={localStrings.Messages.CreateChatGroup}
          onClick={onCreateGroup}
          className="ml-2 p-1"
        >
          <AiOutlineUsergroupAdd className="text-xl md:text-2xl" />
        </button>
      </div>
      <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 mt-2 md:mt-4">{localStrings.Messages.FriendBar}</h2>
      <ul>
        {filteredFriends.map((friend, index) => {
          const friendName = friend.name || "";
          const friendFamilyName = friend.family_name || "";
          
          const friendMessages = friend.id ? messages[friend.id] || [] : [];
          const latestMessage = friendMessages.length > 0 ? 
            friendMessages[friendMessages.length - 1] : null;
          
          const senderName = latestMessage?.user_id === currentUser?.id ? 
            `${localStrings.Messages.You}: ` : latestMessage?.user?.name ? `${latestMessage.user.name}: ` : "";
          const messageContent = latestMessage?.text || latestMessage?.content || "";
          
          const truncatedMessage = messageContent.length > 30 ? 
            messageContent.substring(0, 30) + "..." : messageContent;
          
          return (
            <li
              key={index}
              className={`flex items-center p-2 cursor-pointer rounded-lg hover:bg-blue-100 ${activeFriend?.id === friend.id ? 'bg-blue-200' : ''}`}
              onClick={() => onFriendSelect(friend)}
            >
              <img 
                src={friend.avatar_url} 
                alt={`${friendName}'s avatar`} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-2" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/40"; 
                }}
              />
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-sm md:text-base truncate">{friendFamilyName} {friendName}</span>
                {latestMessage && (
                  <span className="text-xs text-gray-500 truncate">
                    {senderName}{truncatedMessage}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FriendsSidebar;