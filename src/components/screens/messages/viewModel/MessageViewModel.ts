// src/components/screens/messages/viewModel/MessageViewModel.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";
import { useWebSocket } from "@/context/socket/useSocket";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { MessageResponseModel, MessageWebSocketResponseModel } from "@/api/features/messages/models/MessageModel";

interface ExtendedMessageResponseModel extends MessageResponseModel {
  isDateSeparator?: boolean;
}

type MessageWithDate = ExtendedMessageResponseModel;

export const useMessageViewModel = () => {
  const { user, localStrings } = useAuth();
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>("");
  const [isMessagesEnd, setIsMessagesEnd] = useState<boolean>(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, MessageResponseModel[]>>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { sendSocketMessage } = useWebSocket();
  
  const pageSize = 20;
  const messageListRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const messageListenersRef = useRef<Set<(conversationId: string, messages: MessageResponseModel[]) => void>>(new Set());

  // Hàm kiểm tra tin nhắn trùng lặp
  const isDuplicateMessage = useCallback((
    conversationId: string, 
    message: MessageResponseModel, 
    existingMessages: MessageResponseModel[]
  ): boolean => {
    // Nếu có ID, kiểm tra theo ID
    if (message.id) {
      const isDuplicateById = existingMessages.some(msg => msg.id === message.id);
      if (isDuplicateById) return true;
      
      // Kiểm tra bằng ID duy nhất đã xử lý
      const messageUniqueId = `${conversationId}-${message.id}`;
      if (processedMessagesRef.current.has(messageUniqueId)) return true;
    }
    
    // Kiểm tra bằng nội dung, người gửi và thời gian
    const contentBasedId = `${conversationId}-${message.user_id}-${message.content}-${message.created_at}`;
    if (processedMessagesRef.current.has(contentBasedId)) return true;
    
    // Kiểm tra dựa trên nội dung và thời gian
    const isDuplicateByContent = existingMessages.some(msg => 
      msg.user_id === message.user_id && 
      msg.content === message.content && 
      Math.abs(new Date(msg.created_at || "").getTime() - 
            new Date(message.created_at || "").getTime()) < 5000
    );
    
    return isDuplicateByContent;
  }, []);

  // Đánh dấu tin nhắn đã xử lý
  const markMessageAsProcessed = useCallback((conversationId: string, message: MessageResponseModel) => {
    if (!message) return;
    
    // Thêm vào cache dựa trên ID nếu có
    if (message.id) {
      const messageUniqueId = `${conversationId}-${message.id}`;
      processedMessagesRef.current.add(messageUniqueId);
    }
    
    // Thêm vào cache dựa trên nội dung và thời gian
    const contentBasedId = `${conversationId}-${message.user_id}-${message.content}-${message.created_at}`;
    processedMessagesRef.current.add(contentBasedId);
    
    // Giới hạn kích thước cache
    if (processedMessagesRef.current.size > 1000) {
      const oldestEntries = Array.from(processedMessagesRef.current).slice(0, 300);
      oldestEntries.forEach(id => processedMessagesRef.current.delete(id));
    }
  }, []);

  // Đăng ký và hủy đăng ký listener
  const addMessageListener = useCallback((callback: (conversationId: string, messages: MessageResponseModel[]) => void) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  // Thông báo cho các listener
  const notifyMessageListeners = useCallback((conversationId: string, messages: MessageResponseModel[]) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, messages);
      } catch (error) {
        console.error("Error in message listener callback:", error);
      }
    });
  }, []);

  // Thêm tin nhắn mới
  const addNewMessage = useCallback((conversationId: string, message: MessageResponseModel) => {
    if (!conversationId || !message) {
        return;
    }
    
    // Lấy danh sách tin nhắn hiện tại của conversation
    const currentMessages = messagesByConversation[conversationId] || [];
    
    // Kiểm tra trùng lặp trước khi thực hiện bất kỳ thao tác nào
    if (isDuplicateMessage(conversationId, message, currentMessages)) {
        console.log("Prevented duplicate message:", message);
        return;
    }
    
    // Đánh dấu tin nhắn đã xử lý
    markMessageAsProcessed(conversationId, message);
    
    // Cập nhật state
    setMessagesByConversation(prev => {
        const conversationMessages = prev[conversationId] || [];
        
        const formattedMessage = {
            ...message,
            isTemporary: false,
            fromServer: true
        };
        
        const updatedMessages = [...conversationMessages, formattedMessage].sort(
            (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
        );
        
        notifyMessageListeners(conversationId, updatedMessages);
        
        // Cập nhật messages hiện tại nếu đang ở đúng conversation
        if (conversationId === currentConversationId) {
            setMessages(processMessagesWithDateSeparators(updatedMessages));
        }
        
        return {
            ...prev,
            [conversationId]: updatedMessages
        };
    });
  }, [messagesByConversation, currentConversationId, isDuplicateMessage, markMessageAsProcessed, notifyMessageListeners]);

  // Lấy tin nhắn cho conversation cụ thể
  const getMessagesForConversation = useCallback((conversationId: string): MessageResponseModel[] => {
    return messagesByConversation[conversationId] || [];
  }, [messagesByConversation]);

  // Cập nhật danh sách tin nhắn cho conversation
  const updateMessagesForConversation = useCallback((conversationId: string, newMessages: MessageResponseModel[]) => {
    if (!conversationId || !newMessages || newMessages.length === 0) return;
    
    const formattedMessages = newMessages.map(msg => ({
      ...msg,
      isTemporary: false,
      fromServer: true
    }));
    
    setMessagesByConversation(prev => {
      const existingMessages = prev[conversationId] || [];
      
      // Tạo map để dễ dàng loại bỏ trùng lặp
      const messageMap = new Map<string, MessageResponseModel>();
      
      // Thêm tin nhắn hiện có vào map
      existingMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else {
          // Đối với tin nhắn không có ID, tạo key dựa trên nội dung và thời gian
          const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
          messageMap.set(key, msg);
        }
      });
      
      // Thêm tin nhắn mới vào map, ghi đè nếu trùng ID
      formattedMessages.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else {
          // Đối với tin nhắn không có ID
          const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
          // Chỉ thêm nếu chưa có
          if (!messageMap.has(key)) {
            messageMap.set(key, msg);
          }
        }
      });
      
      // Chuyển map thành mảng và sắp xếp
      const uniqueMessages = Array.from(messageMap.values()).sort(
        (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      );
      
      // Thông báo cho listeners
      notifyMessageListeners(conversationId, uniqueMessages);
      
      return {
        ...prev,
        [conversationId]: uniqueMessages
      };
    });
  }, [notifyMessageListeners]);

  // Format date cho hiển thị
  const formatDateForDisplay = useCallback((date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
  
    if (messageDay.getTime() === today.getTime()) {
      return "Hôm nay";
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return "Hôm qua";
    } else {
      const day = messageDate.getDate().toString().padStart(2, '0');
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
      const year = messageDate.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
  }, []);
  
  // Xử lý tin nhắn và thêm date separators
  const processMessagesWithDateSeparators = useCallback((messages: MessageResponseModel[]): MessageWithDate[] => {
    if (!messages || messages.length === 0) return [];
  
    const sortedMessages = [...messages].sort((a, b) => {
      const dateA = new Date(a.created_at || "");
      const dateB = new Date(b.created_at || "");
      return dateA.getTime() - dateB.getTime();
    });
  
    const dateMap = new Map<string, boolean>();
    
    const messagesWithoutSeparators = sortedMessages.filter(msg => !msg.isDateSeparator);
    
    const processedMessages: MessageWithDate[] = [];
    let currentDate: string | null = null;
  
    messagesWithoutSeparators.forEach((message) => {
      if (message.created_at) {
        const messageDate = new Date(message.created_at);
        const messageDateStr = messageDate.toISOString().split('T')[0];
  
        if (messageDateStr !== currentDate && !dateMap.has(messageDateStr)) {
          currentDate = messageDateStr;
          dateMap.set(messageDateStr, true);
          
          const formattedDate = formatDateForDisplay(messageDate);
          
          const dateSeparator: MessageWithDate = {
            id: `date-separator-${messageDateStr}`,
            content: formattedDate,
            isDateSeparator: true,
            created_at: message.created_at,
          };
          
          processedMessages.push(dateSeparator);
        }
      }
      
      processedMessages.push(message as MessageWithDate);
    });
  
    return processedMessages;
  }, [formatDateForDisplay]);

  // Fetch tin nhắn từ server
  const fetchMessages = useCallback(async (conversationId: string, page: number = 1, shouldAppend: boolean = false) => {
    if (!user?.id || !conversationId) return;
    
    setCurrentConversationId(conversationId);
    setMessagesLoading(true);
    
    // Reset messages nếu không phải append
    if (!shouldAppend && !isFirstLoad.current) {
      setMessages([]);
    }
    
    if (shouldAppend && messageListRef.current) {
      scrollPositionRef.current = messageListRef.current.scrollHeight - messageListRef.current.scrollTop;
    }
    
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        sort_by: "created_at",
        is_descending: true,
        limit: pageSize,
        page: page
      });
      
      if (response.data) {
        const messageList = Array.isArray(response.data) ? response.data : [response.data];
        
        setIsMessagesEnd(messageList.length < pageSize);
        
        const formattedMessages = messageList.map(msg => ({
          ...msg,
          fromServer: true,
          isTemporary: false
        }));
        
        const sortedApiMessages = [...formattedMessages].sort((a, b) => {
          const dateA = new Date(a.created_at || "");
          const dateB = new Date(b.created_at || "");
          return dateA.getTime() - dateB.getTime();
        });
        
        if (shouldAppend) {
          setMessagesByConversation(prev => {
            const existingMessages = prev[conversationId] || [];
            
            // Combine và loại bỏ trùng lặp
            const messageMap = new Map<string, MessageResponseModel>();
            
            // Thêm messages hiện tại vào map
            existingMessages.forEach(msg => {
              if (msg.id) {
                messageMap.set(msg.id, msg);
              } else {
                const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
                messageMap.set(key, msg);
              }
            });
            
            // Thêm messages mới vào map
            sortedApiMessages.forEach(msg => {
              if (msg.id) {
                messageMap.set(msg.id, msg);
              } else {
                const key = `temp-${msg.user_id}-${msg.content}-${msg.created_at}`;
                messageMap.set(key, msg);
              }
            });
            
            // Chuyển map thành mảng và sắp xếp
            const combinedMessages = Array.from(messageMap.values()).sort(
              (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
            );
            
            const messagesWithDateSeparators = processMessagesWithDateSeparators(combinedMessages);
            setMessages(messagesWithDateSeparators);
            
            // Đánh dấu tất cả tin nhắn từ API là đã xử lý
            sortedApiMessages.forEach(msg => {
              if (msg.id) markMessageAsProcessed(conversationId, msg);
            });
            
            setTimeout(() => {
              if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight - scrollPositionRef.current;
              }
            }, 50);
            
            return {
              ...prev,
              [conversationId]: combinedMessages
            };
          });
        } else {
          const messagesWithDateSeparators = processMessagesWithDateSeparators(sortedApiMessages);
          setMessages(messagesWithDateSeparators);
          
          // Đánh dấu tất cả tin nhắn từ API là đã xử lý
          sortedApiMessages.forEach(msg => {
            if (msg.id) markMessageAsProcessed(conversationId, msg);
          });
          
          setMessagesByConversation(prev => ({
            ...prev,
            [conversationId]: sortedApiMessages
          }));
          
          setInitialMessagesLoaded(true);
          isFirstLoad.current = false;
          
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user?.id, pageSize, processMessagesWithDateSeparators, markMessageAsProcessed]);

  // Load thêm tin nhắn
  const loadMoreMessages = useCallback(async () => {
    if (currentConversationId && !messagesLoading && !isMessagesEnd) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await fetchMessages(currentConversationId, nextPage, true);
    }
  }, [currentConversationId, messagesLoading, isMessagesEnd, currentPage, fetchMessages]);

  // Xử lý scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!currentConversationId) return;
    
    const { scrollTop } = e.currentTarget;
    
    if (scrollTop < 100 && !messagesLoading && !isMessagesEnd) {
      loadMoreMessages();
    }
  }, [currentConversationId, messagesLoading, isMessagesEnd, loadMoreMessages]);

  // Gửi tin nhắn
  const sendMessage = useCallback(async () => {
    if (!user?.id || !currentConversationId || !messageText.trim()) {
        return;
    }
    
    if (messageText.length > 500) {
        message.error(localStrings.Messages.MessageTooLong);
        return;
    }
    
    const messageContent = messageText.trim();
    setMessageText("");
    
    // Kiểm tra tin nhắn trùng lặp
    const currentMessages = messagesByConversation[currentConversationId] || [];
    const hasDuplicateContent = currentMessages.some(msg => 
        msg.user_id === user.id && 
        msg.content === messageContent &&
        Math.abs(Date.now() - new Date(msg.created_at || "").getTime()) < 10000
    );
    
    if (hasDuplicateContent) {
        console.log("Preventing sending duplicate message content");
        return;
    }
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const tempMessage: MessageResponseModel = {
        id: tempId,
        user_id: user.id,
        user: {
            id: user.id,
            name: user.name,
            family_name: user.family_name,
            avatar_url: user.avatar_url
        },
        conversation_id: currentConversationId,
        content: messageContent,
        created_at: new Date().toISOString(),
        isTemporary: true
    };
    
    // Tạm thời không thêm vào state để tránh trùng lặp
    // addNewMessage(currentConversationId, tempMessage);
    
    scrollToBottom();
    
    const messageData = {
        content: messageContent,
        conversation_id: currentConversationId,
        user_id: user.id,
        user: {
            id: user.id,
            name: user.name,
            family_name: user.family_name,
            avatar_url: user.avatar_url
        },
        created_at: new Date().toISOString()
    };
    
    try {
        const createMessageData = {
            content: messageContent,
            conversation_id: currentConversationId,
            user: {
                id: user.id,
                name: user.name,
                family_name: user.family_name,
                avatar_url: user.avatar_url
            }
        };
        
        const response = await defaultMessagesRepo.createMessage(createMessageData);
        
        if (response.data) {
            const serverMessage = { 
                ...response.data, 
                fromServer: true, 
                isTemporary: false 
            };
            
            // Process the server response rather than using temp message
            markMessageAsProcessed(currentConversationId, serverMessage);
            
            // Update the messages directly with the server response
            setMessagesByConversation(prev => {
                const conversationMessages = prev[currentConversationId] || [];
                
                // Remove any temp message with the same content
                const filteredMessages = conversationMessages.filter(msg => 
                    !(msg.isTemporary && msg.content === messageContent && msg.user_id === user.id)
                );
                
                const updatedMessages = [...filteredMessages, serverMessage].sort(
                    (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
                );
                
                if (currentConversationId === currentConversationId) {
                    const processedMessages = processMessagesWithDateSeparators(updatedMessages);
                    setMessages(processedMessages);
                }
                
                notifyMessageListeners(currentConversationId, updatedMessages);
                
                return {
                    ...prev,
                    [currentConversationId]: updatedMessages
                };
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.Error);
    }
}, [
    user, currentConversationId, messageText, messagesByConversation,
    markMessageAsProcessed, processMessagesWithDateSeparators, notifyMessageListeners
]);

// Xóa tin nhắn
const deleteMessage = useCallback(async (messageId: string) => {
    if (!user?.id || !currentConversationId) return;
    
    try {
        // Cập nhật UI trước
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        setMessagesByConversation(prev => {
            if (!prev[currentConversationId]) return prev;
            
            const updatedMessages = prev[currentConversationId].filter(msg => msg.id !== messageId);
            
            return {
                ...prev,
                [currentConversationId]: updatedMessages
            };
        });
        
        // Gọi API xóa
        await defaultMessagesRepo.deleteMessage({ message_id: messageId });
    } catch (error) {
        console.error("Error deleting message:", error);
        message.error(localStrings.Public.Error);
        
        // Fetch lại messages nếu xóa thất bại
        if (currentConversationId) {
            fetchMessages(currentConversationId);
        }
    }
}, [user?.id, currentConversationId, fetchMessages]);

// Scroll to bottom
const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
}, []);

// Cleanup khi component unmount
useEffect(() => {
    return () => {
        // Xóa bộ nhớ cache để tránh memory leak
        processedMessagesRef.current.clear();
        messageListenersRef.current.clear();
    };
}, []);

return {
    // State
    messages,
    messagesLoading,
    messageText,
    isMessagesEnd,
    messageListRef,
    initialMessagesLoaded,
    currentConversationId,
    
    // Setters
    setMessageText,
    setMessages,
    setCurrentConversationId,
    
    // Actions
    fetchMessages,
    sendMessage,
    deleteMessage,
    loadMoreMessages,
    handleScroll,
    scrollToBottom,
    getMessagesForConversation,
    addMessageListener,
    updateMessagesForConversation,
    addNewMessage,
};
};