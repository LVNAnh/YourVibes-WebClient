import React, { useRef } from 'react';
import { IoMdArrowBack } from "react-icons/io";
import { ConversationHeaderProps } from '../../types/messageTypes';

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  activeFriend,
  isConnected,
  onBackClick,
  onProfileView,
  localStrings
}) => {
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  return (
    <>
      {activeFriend ? (
        <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl items-center shadow-sm'>
          {window.innerWidth < 768 && (
            <button 
              onClick={onBackClick}
              className="p-2 mr-1"
              aria-label="Back to friend list"
            >
              <IoMdArrowBack className="text-xl" />
            </button>
          )}
          <img
            src={activeFriend.avatar_url || "https://via.placeholder.com/64"}
            alt={`${activeFriend.name || "Friend"}'s avatar`}
            className="mt-1 md:mt-2 mr-3 ml-1 md:ml-2 w-10 h-10 md:w-16 md:h-16 rounded-full object-cover cursor-pointer"
            onMouseEnter={() => {
              hoverTimeout.current = setTimeout(() => {
                if (activeFriend?.id) {
                  onProfileView(activeFriend.id);
                }
              }, 200); 
            }}
            onMouseLeave={() => {
              if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current); 
              }
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/64";
            }}
          />
          <div className='grow'>
            <h3 className='mt-1 md:mt-6 mb-1 md:mb-2 ml-1 md:ml-3 text-base md:text-xl font-bold truncate'>
              {activeFriend ? `${activeFriend.family_name || ""} ${activeFriend.name || ""}`.trim() : "Chọn bạn để chat"}
            </h3>
            <p className='mt-0 mb-1 ml-1 md:ml-3 text-xs text-gray-500'>
              {isConnected ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  {localStrings.Messages.Connected}
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                  {localStrings.Messages.Connecting}...
                </span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className='sticky bg-white z-10 top-0 flex h-16 md:h-20 rounded-xl shadow-sm'>
          <div className='grow p-2 md:p-4'>
            <h3 className='mt-1 md:mt-2 mb-1 md:mb-3 ml-1 md:ml-3 text-base md:text-xl font-bold'>
              {localStrings.Messages.ChooseFriendToChat}
            </h3>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationHeader;