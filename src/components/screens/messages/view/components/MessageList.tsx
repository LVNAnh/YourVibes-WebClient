import React from 'react';
import { Spin } from 'antd';
import { MessageListProps, MessageDateGroup } from '../../types/messageTypes';
import MessageItem from './MessageItem';

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onReply,
  messagesEndRef,
  onScroll,
  activeFriend,
  isLoadingMessages,
  isCreatingGroup,
  localStrings
}) => {
  // Check if user is message sender
  const isUserMessage = (userId?: string) => userId === currentUser?.id;

  // Group messages by date
  const groupMessagesByDate = (): MessageDateGroup[] => {
    const messagesByDate: Record<string, MessageDateGroup> = {};
    
    messages.forEach(message => {
      // Get date from created_at (yyyy-MM-dd)
      const date = new Date(message.created_at || new Date());
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!messagesByDate[dateKey]) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const formattedDate = `${day}/${month}/${year}`;
        messagesByDate[dateKey] = {
          dateKey,
          formattedDate,
          messages: []
        };
      }
      
      messagesByDate[dateKey].messages.push(message);
    });
    
    // Sort by date ascending
    return Object.values(messagesByDate).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div
      className="flex-1 overflow-y-auto border p-4 rounded-lg mb-4 bg-gray-100 h-[64vh] relative"
      onScroll={onScroll}
    >
      {activeFriend ? (
        isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" tip="Đang tải tin nhắn..." />
          </div>
        ) : isCreatingGroup ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" tip="Đang tạo nhóm chat..." />
          </div>
        ) : messages.length > 0 ? (
          <>
            {messageGroups.map(group => (
              <div key={group.dateKey} className="mb-6">
                {/* Date header */}
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-200 rounded-full px-4 py-1 text-sm text-gray-600">
                    {group.formattedDate}
                  </div>
                </div>
                
                {/* Messages for this date */}
                {group.messages.map((message, index) => (
                  <MessageItem
                    key={message.id || index}
                    message={message}
                    isUser={isUserMessage(message.user_id)}
                    onReply={onReply}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">{localStrings.Messages.NoMessages}</p>
        )
      ) : (
        <p className="text-gray-500 text-center py-8">{localStrings.Messages.ChooseFriendToConnect}</p>
      )}
    </div>
  );
};

export default MessageList;