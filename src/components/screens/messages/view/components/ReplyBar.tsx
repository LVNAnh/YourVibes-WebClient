import React from 'react';
import { ReplyBarProps } from '../../types/messageTypes';

const ReplyBar: React.FC<ReplyBarProps> = ({ replyTo, onCancelReply, localStrings }) => {
  if (!replyTo) return null;

  return (
    <div className="flex items-center bg-gray-50 p-2 rounded-lg mb-2">
      <div className="flex-1 truncate">
        <span className="text-sm text-gray-500">
          {localStrings.Messages.Reply}: {replyTo.text || replyTo.content}
        </span>
      </div>
      <button 
        onClick={onCancelReply} 
        className="text-red-500 ml-2"
        aria-label="Cancel reply"
      >
        {localStrings.Messages.Cancel}
      </button>
    </div>
  );
};

export default ReplyBar;