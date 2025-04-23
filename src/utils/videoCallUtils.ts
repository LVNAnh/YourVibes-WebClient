import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { ConversationResponseModel } from '@/api/features/messages/models/ConversationModel';

interface VideoCallParams {
  userId: string;
  conversationId?: string;
  isInitiator: boolean;
  calleeId?: string;
  callerId?: string;
  signalData?: any;
  callerInfo?: FriendResponseModel;
  conversationName?: string;
  socketUrl?: string;
}

/**
 * Mở cửa sổ video call mới
 */
export const openVideoCallWindow = (params: VideoCallParams): Window | null => {
  const dimensions = {
    width: 800,
    height: 600,
    left: (window.innerWidth - 800) / 2,
    top: (window.innerHeight - 600) / 2
  };
  
  // Tạo URL với các tham số chính
  const url = '/video-call.html';
  
  const videoCallWindow = window.open(
    url,
    '_blank',
    `width=${dimensions.width},height=${dimensions.height},left=${dimensions.left},top=${dimensions.top}`
  );
  
  if (!videoCallWindow) {
    return null;
  }
  
  // Truyền data qua window.postMessage sau khi trang đã load
  setTimeout(() => {
    videoCallWindow.postMessage({
      type: 'VIDEO_CALL_INIT',
      ...params
    }, '*');
  }, 1000);
  
  return videoCallWindow;
};

/**
 * Tạo và phát ringtone
 */
export class RingtoneManager {
  private static instance: RingtoneManager;
  private ringtone: HTMLAudioElement | null = null;
  
  private constructor() {
    this.ringtone = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c19592.mp3');
    this.ringtone.loop = true;
  }
  
  public static getInstance(): RingtoneManager {
    if (!RingtoneManager.instance) {
      RingtoneManager.instance = new RingtoneManager();
    }
    return RingtoneManager.instance;
  }
  
  public play(): void {
    if (this.ringtone) {
      this.ringtone.play().catch(() => {
        // Bỏ qua lỗi do chính sách auto-play
      });
    }
  }
  
  public stop(): void {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
    }
  }
  
  public cleanup(): void {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.src = '';
      this.ringtone = null;
    }
  }
}

/**
 * Kiểm tra xem một cuộc trò chuyện có phải là 1-1 hay không
 */
export const isOneOnOneConversation = (
  conversation: ConversationResponseModel | null, 
  messages: MessageResponseModel[], 
  userId?: string
): boolean => {
  if (!conversation || !messages.length || !userId) return false;
  
  // Kiểm tra tên có dạng "User A & User B"
  if (conversation.name?.includes(" & ")) return true;
  
  // Kiểm tra số người dùng duy nhất trong cuộc trò chuyện
  const actualMessages = messages.filter(msg => !msg.isDateSeparator);
  const hasOtherSenders = actualMessages.some(msg => msg.user_id !== userId);
  const uniqueSenders = new Set(actualMessages.map(msg => msg.user_id)).size;
  
  return hasOtherSenders && uniqueSenders <= 2;
};

/**
 * Tìm thông tin người dùng khác trong cuộc trò chuyện 1-1
 */
export const findOtherUserInOneOnOneChat = (
  messages: MessageResponseModel[],
  userId?: string
): { id?: string; user?: any } | null => {
  if (!messages.length || !userId) return null;
  
  const actualMessages = messages.filter(msg => !msg.isDateSeparator);
  
  // Tìm tin nhắn đầu tiên từ người dùng khác
  const otherUserMessage = actualMessages.find(msg => msg.user_id !== userId);
  
  if (!otherUserMessage) return null;
  
  return {
    id: otherUserMessage.user_id,
    user: otherUserMessage.user
  };
};

/**
 * Xử lý hiển thị lỗi video call
 */
export const handleVideoCallError = (errorType: string, message: any, messageApi: any): void => {
  const errorMessages: {[key: string]: string} = {
    'permission': 'Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.',
    'connection': 'Không thể kết nối cuộc gọi. Vui lòng thử lại sau.',
    'popup': 'Không thể mở cửa sổ video call. Vui lòng kiểm tra trình chặn popup.',
    'default': 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
  };
  
  // Hiển thị thông báo lỗi phù hợp
  messageApi.error(errorMessages[errorType] || errorMessages.default);
};