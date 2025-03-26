import React from 'react';
import { FaRegSmile } from 'react-icons/fa';
import { AiOutlineSend } from "react-icons/ai";
import EmojiPicker from 'emoji-picker-react';
import { MessageInputProps } from '../../types/messageTypes';
import ReplyBar from './ReplyBar';

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  replyTo,
  activeFriend,
  messageError,
  showEmojiPicker,
  onMessageChange,
  onEmojiClick,
  onEmojiPickerToggle,
  onSendMessage,
  onCancelReply,
  onKeyDown,
  localStrings
}) => {
  return (
    <>
      {/* Error message */}
      {messageError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-sm mb-2">
          {messageError}
        </div>
      )}

      {/* Reply bar */}
      <ReplyBar 
        replyTo={replyTo}
        onCancelReply={onCancelReply}
        localStrings={localStrings}
      />

      {/* Input area */}
      <div className="flex gap-2 relative mb-2 md:mb-4">
        <button
          title="Chọn emoji"
          aria-label="Chọn emoji"
          className="p-1 mr-0 relative z-10"
          onClick={onEmojiPickerToggle}
          disabled={!activeFriend}
        >
          <FaRegSmile className={`text-2xl ${!activeFriend ? 'text-gray-400' : ''}`} />
        </button>
        
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-0 z-20">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
        
        <div className="flex items-center w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={activeFriend ? localStrings.Messages.EnterMessage : localStrings.Messages.ChooseFriendToConnect}
            className="w-full p-2 border rounded-lg outline-none"
            disabled={!activeFriend}
          />
        </div>
        
        <button
          onClick={onSendMessage}
          title="Gửi tin nhắn"
          aria-label="Gửi tin nhắn"
          className={`px-4 py-2 rounded-lg text-white ${newMessage.trim() && activeFriend ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!newMessage.trim() || !activeFriend}
        >
          <AiOutlineSend />
        </button>
      </div>
    </>
  );
};

export default MessageInput;