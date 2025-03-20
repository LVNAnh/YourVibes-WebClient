import { UserModel } from '@/api/features/authenticate/model/LoginModel';
import { FriendResponseModel } from '@/api/features/profile/model/FriendReponseModel';
import { defaultProfileRepo } from '@/api/features/profile/ProfileRepository';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import { useConversationViewModel } from './ConversationViewModel';
import { defaultMessagesRepo } from '@/api/features/messages/MessagesRepo';
import { useWebSocketConnect } from './WebSocketConnect';
import { ConversationDetailResponseModel } from '@/api/features/messages/models/ConversationDetailModel';

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const { getExistingConversation } = useConversationViewModel();
  
  // State cho tin nhắn và UI
  const [newMessage, setNewMessage] = useState('');
  const [activeFriend, setActiveFriend] = useState<FriendResponseModel | null>(null);
  const [replyTo, setReplyTo] = useState<MessageResponseModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [friends, setFriends] = useState<FriendResponseModel[]>([]);
  const [activeFriendProfile, setActiveFriendProfile] = useState<UserModel | null>(null); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  
  // Sử dụng WebSocket hook
  const {
    messages,
    setMessages,
    activeConversationId,
    setActiveConversationId,
    connectToWebSocket,
    initializeConversation,
    sendMessage,
    isConnected,
    debugMessagesState,
    updateTemporaryMessages
  } = useWebSocketConnect();

  // Cuộn xuống tin nhắn cuối cùng khi messages thay đổi
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Theo dõi thay đổi activeFriend để thiết lập cuộc trò chuyện
  useEffect(() => {
    if (activeFriend && activeFriend.id && user?.id) {
      console.log("activeFriend thay đổi, thiết lập cuộc trò chuyện");
      setupConversationForFriend(activeFriend.id);
    }
  }, [activeFriend, user?.id]);
  
  // Tự động kiểm tra và cập nhật tin nhắn tạm thời sau khi tải tin nhắn
  useEffect(() => {
    if (activeFriend?.id && !isLoadingMessages) {
      const timerId = setTimeout(() => {
        updateTemporaryMessages(activeFriend.id || '');
      }, 200);
      
      return () => clearTimeout(timerId);
    }
  }, [activeFriend?.id, isLoadingMessages, updateTemporaryMessages]);

  // Hàm thiết lập cuộc trò chuyện khi chọn bạn
  const setupConversationForFriend = async (friendId: string) => {
    if (!user?.id) return;
    
    try {
      console.log(`Thiết lập cuộc trò chuyện giữa user ${user.id} và friend ${friendId}`);
      setIsLoadingMessages(true);
      
      // Tìm cuộc trò chuyện hiện có
      const existingConvId = await getExistingConversation(user.id, friendId);
      
      if (existingConvId) {
        console.log("Đã tìm thấy cuộc trò chuyện:", existingConvId);
        setActiveConversationId(existingConvId);
        initializeConversation(existingConvId);
        fetchMessages(existingConvId);
      } else {
        console.log("Không tìm thấy cuộc trò chuyện, tạo mới");
        
        // Tạo cuộc trò chuyện mới với cơ chế thử lại
        const newConversation = await createNewConversation(user.id, friendId);
        
        if (newConversation) {
          console.log("Đã tạo cuộc trò chuyện mới:", newConversation);
          setActiveConversationId(newConversation);
          initializeConversation(newConversation);
          // Conversation mới nên không cần fetch messages
        } else {
          // Nếu thất bại trong mọi nỗ lực, hiển thị thông báo lỗi
        }
      }
    } catch (error) {
      console.error("Lỗi khi thiết lập cuộc trò chuyện:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId || !activeFriend?.id) {
      console.log("Không thể tải tin nhắn: thiếu conversationId hoặc activeFriend");
      return;
    }
    
    try {
      console.log(`Đang tải tin nhắn cho cuộc trò chuyện ${conversationId}`);
      setIsLoadingMessages(true);
      
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        page: 1,
        limit: 100,
      });
      
      if (response.data) {
        // Xử lý dữ liệu trả về
        const fetchedMessages = Array.isArray(response.data) 
          ? response.data as MessageResponseModel[] 
          : [response.data as MessageResponseModel];
        
        console.log(`Đã tải ${fetchedMessages.length} tin nhắn`);
        
        // Chuẩn hóa tin nhắn và cập nhật text/content
        const normalizedMessages = fetchedMessages.map(msg => ({
          ...msg,
          text: msg.content || msg.text,
          content: msg.content || msg.text,
          isTemporary: false // Đảm bảo tin nhắn từ API không phải là tạm thời
        }));
        
        // Sắp xếp tin nhắn theo thời gian
        const sortedMessages = normalizedMessages.sort(
          (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );
        
        // Cập nhật state messages
        setMessages(prevMessages => {
          const friendId = activeFriend.id || '';
          console.log(`Cập nhật ${sortedMessages.length} tin nhắn cho friend ${friendId}`);
          
          return {
            ...prevMessages,
            [friendId]: sortedMessages
          };
        });
        
        // Log để debug
        setTimeout(() => {
          debugMessagesState();
        }, 500);
      }
    } catch (err) {
      console.error("Lỗi khi tải tin nhắn", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeFriend, setMessages, debugMessagesState]);

  // Tìm friend dựa vào conversation ID
  const findFriendByConversationId = useCallback(async (conversationId: string): Promise<FriendResponseModel | null> => {
    if (!user?.id) return null;
    
    try {
      console.log(`Đang tìm friend cho conversation ${conversationId}`);
      setIsLoadingMessages(true);
      
      // Lấy tất cả người dùng trong cuộc trò chuyện
      const response = await defaultMessagesRepo.getConversationDetailByUserID({ 
        conversation_id: conversationId 
      });
      
      if (!response.data) {
        console.log("Không tìm thấy thông tin conversation detail");
        return null;
      }
      
      // Chuyển đổi dữ liệu trả về thành mảng
      const conversationDetails = Array.isArray(response.data) ? response.data : [response.data];
      
      // Tìm người dùng khác trong cuộc trò chuyện (không phải user hiện tại)
      const otherUser = conversationDetails.find(detail => 
        detail.user_id !== user.id
      );
      
      if (!otherUser || !otherUser.user) {
        console.log("Không tìm thấy người dùng khác trong cuộc trò chuyện");
        return null;
      }
      
      // Khởi tạo đối tượng FriendResponseModel từ thông tin user
      const friend: FriendResponseModel = {
        id: otherUser.user.id,
        name: otherUser.user.name,
        family_name: otherUser.user.family_name,
        avatar_url: otherUser.user.avatar_url
      };
      
      console.log(`Đã tìm thấy friend: ${friend.family_name} ${friend.name}`);
      
      // Tải tin nhắn cho cuộc trò chuyện
      initializeConversation(conversationId);
      fetchMessages(conversationId);
      
      return friend;
    } catch (error) {
      console.error("Lỗi khi tìm friend từ conversationId:", error);
      return null;
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user, initializeConversation, fetchMessages]);
  

// Sửa hàm createNewConversation trong MessagesViewModel.ts
const createNewConversation = useCallback(async (userId: string, friendId: string, retryCount = 0): Promise<string | null> => {
  try {
    console.log(`Đang tạo cuộc trò chuyện mới (lần thử ${retryCount + 1}) giữa userId: ${userId} và friendId: ${friendId}`);
    
    // Tìm thông tin bạn bè để đặt tên cuộc trò chuyện
    const friend = friends.find(f => f.id === friendId);
    const friendName = friend ? `${friend.family_name || ''} ${friend.name || ''}`.trim() : 'friend';
    const userName = user ? `${user.family_name || ''} ${user.name || ''}`.trim() : 'user';
    
    // Tạo tên cho cuộc trò chuyện VÀ ĐẢM BẢO KHÔNG QUÁ 30 KÝ TỰ
    let conversationName = `Chat: ${userName} - ${friendName}`;
    if (conversationName.length > 30) {
      // Nếu quá dài, cắt ngắn tên người dùng và bạn bè
      const maxNameLength = 10; // Để dành chỗ cho phần "Chat: " và " - "
      const truncatedUserName = userName.length > maxNameLength 
        ? userName.substring(0, maxNameLength) + "..." 
        : userName;
      const truncatedFriendName = friendName.length > maxNameLength 
        ? friendName.substring(0, maxNameLength) + "..." 
        : friendName;
      
      conversationName = `Chat: ${truncatedUserName} - ${truncatedFriendName}`;
      
      // Nếu vẫn còn dài, cắt thêm
      if (conversationName.length > 30) {
        conversationName = conversationName.substring(0, 29) + "…";
      }
    }
    
    console.log("Tạo cuộc trò chuyện mới:", conversationName, `(độ dài: ${conversationName.length})`);
    
    // Tạo cuộc trò chuyện
    const response = await defaultMessagesRepo.createConversation({
      name: conversationName
    });
    
    console.log("Kết quả tạo conversation:", response);
    
    // Kiểm tra lỗi trong response
    if (response.error) {
      throw new Error(`API trả về lỗi: ${response.error.message}`);
    }
    
    if (!response.data?.id) {
      throw new Error("Không nhận được ID cuộc trò chuyện từ response");
    }
    
    const conversationId = response.data.id;
    console.log("Đã tạo conversation với ID:", conversationId);
    
    // Thêm người dùng hiện tại vào cuộc trò chuyện
    const userDetailResponse = await defaultMessagesRepo.createConversationDetail({
      conversation_id: conversationId,
      user_id: userId
    });
    
    // Kiểm tra lỗi
    if (userDetailResponse.error) {
      throw new Error(`Lỗi khi thêm người dùng: ${userDetailResponse.error.message}`);
    }
    
    // Thêm bạn vào cuộc trò chuyện
    const friendDetailResponse = await defaultMessagesRepo.createConversationDetail({
      conversation_id: conversationId,
      user_id: friendId
    });
    
    // Kiểm tra lỗi
    if (friendDetailResponse.error) {
      throw new Error(`Lỗi khi thêm bạn: ${friendDetailResponse.error.message}`);
    }
    
    // Nếu mọi thứ thành công, trả về conversationId
    return conversationId;
  } catch (error) {
    console.error("Lỗi khi tạo cuộc trò chuyện mới:", error);
    
    // Nếu số lần thử lại chưa vượt quá giới hạn, thử lại sau một khoảng thời gian
    if (retryCount < 2) {
      console.log(`Đang thử lại lần ${retryCount + 1}...`);
      // Đợi 1 giây trước khi thử lại
      await new Promise(resolve => setTimeout(resolve, 1000));
      return createNewConversation(userId, friendId, retryCount + 1);
    }
    
    // Hiển thị thông báo lỗi cho người dùng
    return null;
  }
}, [user, friends]);

  // Fetch tin nhắn từ một cuộc trò chuyện

  
  // Lấy danh sách bạn bè
  const fetchFriends = useCallback(async (page: number) => {
    try {
      console.log("Tải danh sách bạn bè, trang:", page);
      
      const response = await defaultProfileRepo.getListFriends({
        page: page,
        limit: 20,
        user_id: user?.id,
      });

      if (response?.data) {
        if (Array.isArray(response?.data)) {
          const friends = response?.data.map(
            (friendResponse: UserModel) => ({
              id: friendResponse.id,
              family_name: friendResponse.family_name,
              name: friendResponse.name,
              avatar_url: friendResponse.avatar_url,
            })
          ) as UserModel[];
          
          console.log(`Đã tải ${friends.length} bạn bè`);
          setFriends(friends);
        } else {
          console.error("response.data không phải là mảng");
          setFriends([]);
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bạn bè:", error);
    }
  }, [user]);

  // Lấy thông tin hồ sơ người dùng
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await defaultProfileRepo.getProfile(userId);
      if (response?.data) {
        setActiveFriendProfile(response.data);
        setIsProfileModalOpen(true); 
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin hồ sơ:", error);
    }
  }, []);

  // Gửi tin nhắn
  const handleSendMessage = useCallback((message: string, replyToMessage?: MessageResponseModel) => {
    setMessageError(null);

    if (!message.trim() || !activeFriend || !activeConversationId) {
      return false;
    }
    
    if (message.length > 500) {
      setMessageError(localStrings.Messages.MessageTooLong);
      return false;
    }
    
    // Tạo ID tạm thời cho tin nhắn
    const tempId = `temp-${Date.now()}`;
    
    // Tạo tin nhắn tạm thời để hiển thị ngay lập tức trong UI
    const tempMessage: MessageResponseModel = {
      id: tempId,
      conversation_id: activeConversationId,
      user_id: user?.id || '',
      content: message,
      text: message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isTemporary: true,
      reply_to: replyToMessage,
      user: {
        id: user?.id,
        name: user?.name,
        family_name: user?.family_name,
        avatar_url: user?.avatar_url
      }
    };
    
    // Cập nhật state tin nhắn với tin nhắn tạm thời
    setMessages(prevMessages => {
      const friendId = activeFriend.id || '';
      
      // Tạo mảng tin nhắn mới nếu chưa có
      if (!prevMessages[friendId]) {
        return {
          ...prevMessages,
          [friendId]: [tempMessage]
        };
      }
      
      // Thêm tin nhắn vào danh sách hiện có
      return {
        ...prevMessages,
        [friendId]: [...prevMessages[friendId], tempMessage]
      };
    });
    
    // Gửi tin nhắn qua WebSocket
    const success = sendMessage(message, replyToMessage);
    console.log("Kết quả gửi tin nhắn qua WebSocket:", success ? "Thành công" : "Thất bại");
    
    // Nếu không thành công qua WebSocket, thử gửi qua API
    if (!success) {
      console.log("Gửi tin nhắn qua API do WebSocket không khả dụng");
      
      defaultMessagesRepo.createMessage({
        content: message,
        conversation_id: activeConversationId,
        parent_id: replyToMessage?.id,
        parent_content: replyToMessage?.text || replyToMessage?.content,
        user: {
          id: user?.id,
          name: user?.name,
          family_name: user?.family_name,
          avatar_url: user?.avatar_url
        }
      }).then(response => {
        console.log("Kết quả gửi tin nhắn qua API:", response.data);
        
        // Cập nhật tin nhắn tạm thời thành tin nhắn thực khi API trả về
        if (response.data && response.data.id) {
          setMessages(prevMessages => {
            const friendId = activeFriend.id || '';
            if (!prevMessages[friendId]) return prevMessages;
            
            const updatedMessages = [...prevMessages[friendId]];
            const tempIndex = updatedMessages.findIndex(
              msg => msg.id === tempId
            );
            
            if (tempIndex !== -1) {
              updatedMessages[tempIndex] = {
                ...updatedMessages[tempIndex],
                ...response.data,
                isTemporary: false,
                text: message,
                content: message
              };
            }
            
            return {
              ...prevMessages,
              [friendId]: updatedMessages
            };
          });
        }
      }).catch(error => {
        console.error("Lỗi khi gửi tin nhắn qua API:", error);
      });
    }
    
    // Thiết lập timeout để tự động cập nhật tin nhắn tạm thời thành bình thường
    // nếu không nhận được phản hồi từ server sau 5 giây
    setTimeout(() => {
      updateTemporaryMessages(activeFriend.id || '');
    }, 5000);
    
    // Log sau khi gửi tin nhắn để debug
    setTimeout(() => {
      debugMessagesState();
    }, 500);
    
    return true;
  }, [activeFriend, activeConversationId, user, sendMessage, setMessages, debugMessagesState, updateTemporaryMessages]);

  // Cập nhật tất cả tin nhắn tạm thời thành bình thường
  const forceUpdateTempMessages = useCallback(() => {
    if (activeFriend?.id) {
      updateTemporaryMessages(activeFriend.id);
    }
  }, [activeFriend, updateTemporaryMessages]);

  return {
    fetchMessages,
    newMessage,
    setNewMessage,
    activeFriend,
    setActiveFriend,
    messages,
    setMessages,
    messageError,
    setMessageError,
    replyTo,
    setReplyTo,
    messagesEndRef,
    fetchFriends,
    friends,
    fetchUserProfile, 
    activeFriendProfile, 
    isProfileModalOpen, 
    setIsProfileModalOpen,
    activeConversationId,
    setActiveConversationId,
    getExistingConversation,
    handleSendMessage,
    isConnected,
    isLoadingMessages,
    debugMessagesState,
    forceUpdateTempMessages,
    findFriendByConversationId
  };
};