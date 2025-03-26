import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";
import { FriendResponseModel } from "@/api/features/profile/model/FriendReponseModel";
import { UserModel } from "@/api/features/authenticate/model/LoginModel";
import { RefObject } from "react";

export interface MessageUIState {
  showEmojiPicker: boolean;
  showGroupModal: boolean;
  groupSearch: string;
  selectedFriends: string[];
  showScrollToBottom: boolean;
  showSidebar: boolean;
  friendSearchText: string;
  showGroupCreationError: boolean;
  showConversations: boolean;
  showFriendsTab: boolean;
}

export interface MessageProps {
  message: MessageResponseModel;
  isUser: boolean;
  onReply: (message: MessageResponseModel) => void;
}

export interface MessageDateGroup {
  dateKey: string;
  formattedDate: string;
  messages: MessageResponseModel[];
}

export interface FriendSidebarProps {
  friends: FriendResponseModel[];
  activeFriend: FriendResponseModel | null;
  messages: Record<string, MessageResponseModel[]>;
  friendSearchText: string;
  currentUser: UserModel | null;
  onSearchChange: (text: string) => void;
  onFriendSelect: (friend: FriendResponseModel) => void;
  onCreateGroup: () => void;
  localStrings: any;
}

export interface ConversationHeaderProps {
  activeFriend: FriendResponseModel | null;
  isConnected: boolean;
  onBackClick: () => void;
  onProfileView: (friendId: string) => void;
  localStrings: any;
}

export interface MessageListProps {
  messages: MessageResponseModel[];
  currentUser: UserModel | null;
  onReply: (message: MessageResponseModel) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>,
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  activeFriend: FriendResponseModel | null;
  isLoadingMessages: boolean;
  isCreatingGroup: boolean;
  localStrings: any;
}

export interface MessageInputProps {
  newMessage: string;
  replyTo: MessageResponseModel | null;
  activeFriend: FriendResponseModel | null;
  messageError: string | null;
  showEmojiPicker: boolean;
  onMessageChange: (message: string) => void;
  onEmojiClick: (emojiData: any) => void;
  onEmojiPickerToggle: () => void;
  onSendMessage: () => void;
  onCancelReply: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  localStrings: any;
}

export interface CreateGroupModalProps {
  isOpen: boolean;
  friends: FriendResponseModel[];
  selectedFriends: string[];
  groupSearch: string;
  onClose: () => void;
  onSearchChange: (search: string) => void;
  onFriendSelect: (friendId: string) => void;
  onCreateGroup: () => void;
  localStrings: any;
}

export interface ProfileModalProps {
  isOpen: boolean;
  profile: UserModel | null;
  onClose: () => void;
  localStrings: any;
}

export interface ErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onClose: () => void;
  localStrings: any;
}

export interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  localStrings: any;
}

export interface ReplyBarProps {
  replyTo: MessageResponseModel | null;
  onCancelReply: () => void;
  localStrings: any;
}