import React from 'react';
import { AiOutlineSearch, AiOutlineUsergroupAdd } from "react-icons/ai";
import { ConversationWithMembers } from '../../viewModel/components/ConversationViewModel';
import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';

interface ConversationsSidebarProps {
  conversations: ConversationWithMembers[];
  activeConversationId: string | null;
  messages: Record<string, MessageResponseModel[]>;
  searchText: string;
  currentUser: UserModel | null;
  onSearchChange: (text: string) => void;
  onConversationSelect: (conversation: ConversationWithMembers) => void;
  onCreateGroup: () => void;
  localStrings: any;
}

const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
  conversations,
  activeConversationId,
  messages,
  searchText,
  currentUser,
  onSearchChange,
  onConversationSelect,
  onCreateGroup,
  localStrings
}) => {
  const filteredConversations = conversations.filter((conversation) => {
    const conversationName = conversation.name || "";
    return conversationName.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 border-r p-2 md:p-4 overflow-y-auto h-[40vh] md:h-[80vh] bg-white">
      <div className="flex items-center w-full">
        <AiOutlineSearch className="mr-[10px]" />
        <input
          type="text"
          placeholder={localStrings.Messages.SearchConversation || "Search conversations"}
          className="flex-1 p-2 border rounded-lg text-sm md:text-base"
          value={searchText}
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
      <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4 mt-2 md:mt-4">
        {localStrings.Messages.Conversations || "Conversations"}
      </h2>
      <ul>
        {filteredConversations.map((conversation, index) => {
          const conversationId = conversation.id || "";
          const conversationMessages = messages[conversationId] || [];
          const latestMessage = conversationMessages.length > 0 ? 
            conversationMessages[conversationMessages.length - 1] : null;
          
          // Find other user in conversation (for 1:1 chats)
          let displayName = conversation.name || "";
          let avatarUrl = conversation.image || "https://via.placeholder.com/40";
          
          if (conversation.members && conversation.members.length === 2 && !conversation.isGroup) {
            const otherMember = conversation.members.find(member => 
              member.user_id !== currentUser?.id
            );
            if (otherMember && otherMember.user) {
              displayName = `${otherMember.user.family_name || ""} ${otherMember.user.name || ""}`.trim();
              avatarUrl = otherMember.user.avatar_url || "https://via.placeholder.com/40";
            }
          }
          
          const senderName = latestMessage?.user_id === currentUser?.id ? 
            `${localStrings.Messages.You}: ` : latestMessage?.user?.name ? `${latestMessage.user.name}: ` : "";
          const messageContent = latestMessage?.text || latestMessage?.content || "";
          
          const truncatedMessage = messageContent.length > 30 ? 
            messageContent.substring(0, 30) + "..." : messageContent;
          
          return (
            <li
              key={index}
              className={`flex items-center p-2 cursor-pointer rounded-lg hover:bg-blue-100 ${activeConversationId === conversationId ? 'bg-blue-200' : ''}`}
              onClick={() => {
                console.log("Conversation selected:", conversationId);
                onConversationSelect(conversation);
              }}
            >
              <img 
                src={avatarUrl} 
                alt={`${displayName}'s avatar`} 
                className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-2" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/40"; 
                }}
              />
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-sm md:text-base truncate">{displayName}</span>
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

export default ConversationsSidebar;