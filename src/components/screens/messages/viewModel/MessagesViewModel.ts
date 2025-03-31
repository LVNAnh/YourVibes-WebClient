import { useState, useEffect, useRef, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";
import { useWebSocket } from "@/context/websocket/useWebSocket";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel, UpdateConversationRequestModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

interface ExtendedMessageResponseModel extends MessageResponseModel {
  isDateSeparator?: boolean;
}

type MessageWithDate = ExtendedMessageResponseModel;

export const useMessagesViewModel = () => {
  const { user, localStrings } = useAuth();
  const {
    isConnected: isWebSocketConnected,
    sendMessage: wsSendMessage,
    currentConversationId,
    setCurrentConversationId,
    getMessagesForConversation,
    updateMessagesForConversation,
    conversations: wsConversations,
    updateConversations,
    addMessageListener
  } = useWebSocket();

  // State for UI
  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationResponseModel | null>(null);
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [conversationsLoading, setConversationsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [isMessagesEnd, setIsMessagesEnd] = useState<boolean>(false);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState<boolean>(false);

  // Pagination for messages
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  
  // Ref for message list for scrolling
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const isFirstLoad = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);

  // Initialize by loading conversations
  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id]);

  // Update local conversations when WebSocket conversations change
  useEffect(() => {
    if (wsConversations && wsConversations.length > 0) {
      setConversations(wsConversations);
    }
  }, [wsConversations]);

  // Set up message listener for real-time updates
  useEffect(() => {
    // Register a message listener to get real-time updates
    const unsubscribe = addMessageListener((conversationId, updatedMessages) => {
      // Only update UI if this is the current conversation
      if (conversationId === currentConversation?.id) {
        setMessages(updatedMessages);
        
        // Auto-scroll to bottom for new messages
        if (updatedMessages.length > 0 && messages.length > 0) {
          const lastOldMessageId = messages[messages.length - 1]?.id;
          const lastNewMessageId = updatedMessages[updatedMessages.length - 1]?.id;
          
          if (lastOldMessageId !== lastNewMessageId) {
            setTimeout(scrollToBottom, 100);
          }
        }
      }
    });
    
    return unsubscribe;
  }, [addMessageListener, currentConversation?.id, messages]);

  // Update messages from WebSocket when conversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      // Always clear messages first to avoid showing old messages
      setMessages([]);
      setInitialMessagesLoaded(false);
      isFirstLoad.current = true;
      
      // Update current conversation ID in WebSocket
      setCurrentConversationId(currentConversation.id);
      
      // Reset pagination
      setCurrentPage(1);
      setIsMessagesEnd(false);
      
      // Immediately fetch messages for this conversation
      fetchMessages(currentConversation.id, 1, false);
    }
  }, [currentConversation?.id]);

  // Scroll to bottom when initial messages are loaded
  useEffect(() => {
    if (initialMessagesLoaded && messages.length > 0 && isFirstLoad.current) {
      // Đảm bảo cuộn xuống tin nhắn mới nhất sau khi tải
      setTimeout(scrollToBottom, 100);
      isFirstLoad.current = false;
    }
  }, [initialMessagesLoaded, messages]);

  const formatDateForDisplay = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(date);
    messageDay.setHours(0, 0, 0, 0);
    
    // Kiểm tra nếu là hôm nay, hôm qua, hoặc ngày khác
    if (messageDay.getTime() === today.getTime()) {
      return "Hôm nay";
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return "Hôm qua";
    } else {
      // Định dạng: Thứ 2, 15 tháng 4, 2023
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
      return date.toLocaleDateString('vi-VN', options);
    }
  };
  
  // Hàm để xử lý tin nhắn và thêm phân cách ngày
  const processMessagesWithDateSeparators = (messages: MessageResponseModel[]): MessageWithDate[] => {
    if (!messages || messages.length === 0) return [];
  
    const processedMessages: MessageWithDate[] = [];
    let currentDate: string | null = null;
  
    // Duyệt qua từng tin nhắn để thêm ngày phân cách
    messages.forEach((message) => {
      if (message.created_at) {
        const messageDate = new Date(message.created_at);
        const messageDateStr = messageDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
        // Nếu đây là ngày mới, thêm tin nhắn phân cách
        if (messageDateStr !== currentDate) {
          currentDate = messageDateStr;
          
          // Tạo tin nhắn phân cách ngày
          const dateSeparator: MessageWithDate = {
            id: `date-separator-${messageDateStr}`,
            content: formatDateForDisplay(messageDate),
            isDateSeparator: true,
            created_at: message.created_at,
          };
          
          processedMessages.push(dateSeparator);
        }
      }
      
      // Thêm tin nhắn gốc
      processedMessages.push(message as MessageWithDate);
    });
  
    return processedMessages;
  };

  // Function to fetch conversations
  const fetchConversations = async () => {
    if (!user?.id) return;
    
    setConversationsLoading(true);
    try {
      const response = await defaultMessagesRepo.getConversations({
        limit: 50,
        page: 1
      });
      
      if (response.data) {
        // Update local state
        const conversationsList = Array.isArray(response.data) 
          ? response.data 
          : [response.data];
        setConversations(conversationsList);
        
        // Update WebSocket context
        updateConversations(conversationsList);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      message.error(localStrings.Messages?.ErrorFetchingConversations || "Error fetching conversations");
    } finally {
      setConversationsLoading(false);
    }
  };

  // Function to fetch messages for a conversation
  const fetchMessages = async (conversationId: string, page: number = 1, shouldAppend: boolean = false) => {
    if (!user?.id || !conversationId) return;
    
    setMessagesLoading(true);
    
    // Save current scroll position for older message loading
    if (shouldAppend && messageListRef.current) {
      scrollPositionRef.current = messageListRef.current.scrollHeight - messageListRef.current.scrollTop;
    }
    
    try {
      // Sử dụng các thuộc tính có trong model - đã cập nhật với tham số chính xác
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        sort_by: "created_at",
        is_descending: true, // Đảm bảo lấy tin nhắn mới nhất trước
        limit: pageSize,
        page: page
      });
      
      if (response.data) {
        // Convert to array if not already
        const messageList = Array.isArray(response.data) ? response.data : [response.data];
        
        // Check if we've reached the end of messages
        setIsMessagesEnd(messageList.length < pageSize);
        
        // Add fromServer flag to all messages from API
        const formattedMessages = messageList.map(msg => ({
          ...msg,
          fromServer: true,
          isTemporary: false
        }));
        
        // Sắp xếp tin nhắn mới nhất ở dưới cùng (tăng dần theo created_at)
        // Điều này giả định rằng tin nhắn có created_at
        const sortedApiMessages = [...formattedMessages].sort((a, b) => {
          const dateA = new Date(a.created_at || "");
          const dateB = new Date(b.created_at || "");
          return dateA.getTime() - dateB.getTime();
        });
        
        // Get existing messages
        let existingMessages = shouldAppend ? [...messages] : [];
        
        if (shouldAppend) {
          // When loading older messages
          // First, create a map of existing messages by ID for quick lookup
          const existingMessageMap = new Map();
          existingMessages.forEach(msg => {
            if (msg.id) {
              existingMessageMap.set(msg.id, true);
            }
          });
          
          // Filter out duplicates
          const uniqueNewMessages = sortedApiMessages.filter(msg => 
            !msg.id || !existingMessageMap.has(msg.id)
          );
          
          // Kiểm tra vị trí thêm tin nhắn mới
          // Nếu trang đầu tiên có tin nhắn cũ nhất, thêm vào đầu danh sách
          // Nếu tải thêm tin nhắn cũ, thêm vào đầu danh sách
          const firstApiMsgTime = new Date(sortedApiMessages[0]?.created_at || Date.now()).getTime();
          const firstExistingMsgTime = new Date(existingMessages[0]?.created_at || Date.now()).getTime();
          
          // Nếu tin nhắn mới có thời gian tạo nhỏ hơn (cũ hơn) tin nhắn đầu tiên hiện tại
          // thì thêm vào đầu danh sách
          let updatedMessages = [];
          if (firstApiMsgTime < firstExistingMsgTime) {
            updatedMessages = [...uniqueNewMessages, ...existingMessages];
          } else {
            // Ngược lại, thêm vào cuối danh sách (trường hợp hiếm)
            updatedMessages = [...existingMessages, ...uniqueNewMessages];
          }
          
          // Sắp xếp lại toàn bộ theo thứ tự thời gian để đảm bảo
          const sortedMessages = updatedMessages.sort((a, b) => {
            const dateA = new Date(a.created_at || "");
            const dateB = new Date(b.created_at || "");
            return dateA.getTime() - dateB.getTime();
          });
          
          const messagesWithDateSeparators = processMessagesWithDateSeparators(sortedMessages);

          // Update messages state với tin nhắn đã có phân cách ngày
          setMessages(messagesWithDateSeparators);

          // Chỉ cập nhật WebSocket với tin nhắn gốc (không có phân cách ngày)
          updateMessagesForConversation(conversationId, sortedMessages);
          
          // Restore scroll position when loading older messages
          setTimeout(() => {
            if (messageListRef.current) {
              messageListRef.current.scrollTop = 
                messageListRef.current.scrollHeight - scrollPositionRef.current;
            }
          }, 50);
        } else {
          // Initial load - replace messages completely with sorted messages
          setMessages(sortedApiMessages);
          
          // Update in WebSocket context
          updateMessagesForConversation(conversationId, sortedApiMessages);
          
          // Mark that we've loaded initial messages
          setInitialMessagesLoaded(true);
          
          // Scroll to bottom after loading initial messages
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Function to load more messages (older messages)
  const loadMoreMessages = async () => {
    if (currentConversation?.id && !messagesLoading && !isMessagesEnd) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      // Khi nhấn "Load more", chúng ta đang tải thêm tin nhắn cũ hơn
      // Đã cập nhật fetchMessages để xử lý đúng khi shouldAppend=true
      await fetchMessages(currentConversation.id, nextPage, true);
    }
  };

  // Function to handle message list scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    // Load more messages when scrolled near the top
    if (scrollTop < 100 && !messagesLoading && !isMessagesEnd && currentConversation?.id) {
      loadMoreMessages();
    }
  };

  // Function to create a new conversation
  const createConversation = async (name: string, image?: string) => {
    if (!user?.id) return null;
    
    try {
      // Create the conversation
      const createResponse = await defaultMessagesRepo.createConversation({
        name: name,
        image: image,
        user_ids: [] // Users will be added through separate API calls
      });
      
      if (createResponse.data) {
        const newConversation = createResponse.data;
        
        // Add current user to the conversation detail
        await defaultMessagesRepo.createConversationDetail({
          conversation_id: newConversation.id,
          user_id: user.id
        });
        
        // Refresh conversations list
        await fetchConversations();
        
        return newConversation;
      }
      return null;
    } catch (error) {
      console.error("Error creating conversation:", error);
      message.error(localStrings.Messages?.GroupCreationFailed || "Failed to create conversation");
      return null;
    }
  };

  // Function to send a message
  const sendMessage = async () => {
    if (!user?.id || !currentConversation?.id || !messageText.trim() || !isWebSocketConnected) {
      return;
    }
    
    // Message length validation
    if (messageText.length > 500) {
      message.error(localStrings.Messages?.MessageTooLong || "Message too long");
      return;
    }
    
    // Create a temporary message ID for optimistic UI update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const messageContent = messageText.trim();
    
    // Create a temporary message object for immediate display
    const tempMessage: MessageResponseModel = {
      id: tempId,
      user_id: user.id,
      user: {
        id: user.id,
        name: user.name,
        family_name: user.family_name,
        avatar_url: user.avatar_url
      },
      conversation_id: currentConversation.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      isTemporary: true // Flag to identify temporary messages
    };
    
    // Add to messages list immediately for optimistic UI update
    setMessages(prev => [...prev, tempMessage]);
    
    // Clear input field
    setMessageText("");
    
    // Scroll to bottom after sending
    scrollToBottom();
    
    try {
      // Send the message to the server via API
      const createMessageData = {
        content: messageContent,
        conversation_id: currentConversation.id,
        user: {
          id: user.id,
          name: user.name,
          family_name: user.family_name,
          avatar_url: user.avatar_url
        }
      };
      
      // First send via REST API
      const response = await defaultMessagesRepo.createMessage(createMessageData);
      
      if (response.data) {
        // Replace the temporary message with the real one in our local state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...response.data, fromServer: true, isTemporary: false } : msg
          )
        );
        
        // Also send via WebSocket to notify other clients
        wsSendMessage({
          type: "message",
          data: response.data
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Mark the temporary message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, sendFailed: true } : msg
        )
      );
      
      message.error(localStrings.Public?.Error || "Failed to send message");
    }
  };

  // Function to delete a message
  const deleteMessage = async (messageId: string) => {
    if (!user?.id || !currentConversation?.id) return;
    
    try {
      // Optimistic UI update
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Delete from server
      await defaultMessagesRepo.deleteMessage({ message_id: messageId });
    } catch (error) {
      console.error("Error deleting message:", error);
      message.error(localStrings.Public?.Error || "Error deleting message");
      
      // Fetch messages again to reset state
      if (currentConversation.id) {
        fetchMessages(currentConversation.id);
      }
    }
  };

  // Function to update conversation details (name, image)
  const updateConversation = async (conversationId: string, name?: string, image?: string) => {
    if (!conversationId) return null;
    
    try {
      const updateData: UpdateConversationRequestModel = {
        conversation_id: conversationId
      };
      
      if (name) updateData.name = name;
      if (image) updateData.image = image;
      
      const response = await defaultMessagesRepo.updateConversation(updateData);
      
      if (response.data) {
        // Update local state
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, name: name || conv.name, image: image || conv.image }
              : conv
          )
        );
        
        // Update current conversation if it's the one being edited
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(prev => 
            prev ? { 
              ...prev, 
              name: name || prev.name, 
              image: image || prev.image 
            } : prev
          );
        }
        
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error updating conversation:", error);
      message.error(localStrings.Public?.Error || "Error updating conversation");
      return null;
    }
  };

  // Function to mark conversation as read
  const markConversationAsRead = async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    try {
      // Call the API to update conversation detail status (mark as read)
      await defaultMessagesRepo.updateConversationDetail({
        conversation_id: conversationId,
        user_id: user.id
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // Helper function to scroll to bottom of message list
  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  return {
    // State
    conversations,
    currentConversation,
    messages,
    messagesLoading,
    conversationsLoading,
    searchText,
    messageText,
    isMessagesEnd,
    isWebSocketConnected,
    messageListRef,
    initialMessagesLoaded,
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation: (conversation: ConversationResponseModel | null) => {
      setCurrentConversation(conversation);
      
      // Mark conversation as read when selected
      if (conversation?.id) {
        markConversationAsRead(conversation.id);
      }
    },

    getMessagesForConversation: (conversationId: string) => {
      return getMessagesForConversation(conversationId);
    },
    
    // Actions
    fetchConversations,
    fetchMessages,
    sendMessage,
    deleteMessage,
    createConversation,
    updateConversation,
    markConversationAsRead,
    loadMoreMessages,
    handleScroll
  };
};