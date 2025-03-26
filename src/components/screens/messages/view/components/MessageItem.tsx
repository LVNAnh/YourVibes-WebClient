import React from 'react';
import { MessageProps } from '../../types/messageTypes';

const MessageItem: React.FC<MessageProps> = ({ message, isUser, onReply }) => {
  const messageContent = message.text || message.content || "";
  
  // Format time (hh:mm:ss)
  const messageDate = new Date(message.created_at || new Date());
  const timeString = `${String(messageDate.getHours()).padStart(2, '0')}:${String(messageDate.getMinutes()).padStart(2, '0')}`;
  
  // Get sender display name
  const senderName = message.user?.name ? 
    `${message.user.family_name || ""} ${message.user.name}`.trim() : 
    "Unknown User";
  
  return (
    <div className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <img
          src={message.user?.avatar_url || "https://via.placeholder.com/40"}
          alt={`${senderName}'s avatar`}
          className="w-8 h-8 rounded-full mr-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
          }}
        />
      )}
      <div 
        className={`p-3 rounded-lg shadow max-w-xs md:max-w-sm w-fit break-words ${
          isUser ? 'bg-blue-100' : 'bg-white'
        } ${message.isTemporary ? 'opacity-70' : 'opacity-100'}`}
      >
        {!isUser && !message.isTemporary && (
          <div className="text-xs text-gray-500 mb-1">{senderName}</div>
        )}
        <div className="mb-1">{messageContent}</div>
        {message.reply_to && (
          <div className="text-sm text-gray-500 mt-1 p-1 bg-gray-100 rounded border-l-2 border-gray-300">
            Reply: {message.reply_to.text || message.reply_to.content}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1 flex items-center">
          <span>{timeString}</span>
          {message.isTemporary && (
            <>
              <span className="mx-1">•</span>
              <span className="text-blue-500 flex items-center">
                <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending
              </span>
            </>
          )}
        </div>
        {!message.isTemporary && (
          <div className="flex gap-2 mt-2 items-center">
            <button onClick={() => onReply(message)} className="text-xs text-blue-500">
              Reply
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <img
          src={message.user?.avatar_url || "https://via.placeholder.com/40"}
          alt="Your avatar"
          className="w-8 h-8 rounded-full ml-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
          }}
        />
      )}
    </div>
  );
};

export default MessageItem;