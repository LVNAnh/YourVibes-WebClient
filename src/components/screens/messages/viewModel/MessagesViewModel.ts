import { useState, useCallback, useEffect, useRef } from "react";
import { message } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ApiPath } from "@/api/ApiPath";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

/**
 * Custom hook để quản lý logic của tính năng tin nhắn
 * Đã được tối ưu để tránh request liên tục và sử dụng refs cho stable functions
 */
export const useMessagesViewModel = () => {
  const { user, localStrings } = useAuth();
  
  // State for conversations
  const [conversations, setConversations] = useState<ConversationResponseModel[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationPage, setConversationPage] = useState(1);
  const [isConversationsEnd, setIsConversationsEnd] = useState(false);
  
  // State for messages
  const [messages, setMessages] = useState<MessageResponseModel[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [isMessagesEnd, setIsMessagesEnd] = useState(false);
  
  // State for UI
  const [currentConversation, setCurrentConversation] = useState<ConversationResponseModel | null>(null);
  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  
  // WebSocket connection
  const socketRef = useRef<WebSocket | null>(null);
  
  // Các biến để theo dõi trạng thái đã load để tránh gọi nhiều lần
  const conversationsLoadedRef = useRef(false);
  const isApiCallingRef = useRef(false);
  
  // Sử dụng useRef để lưu trữ các hàm một cách ổn định
  const stableActions = useRef({
    fetchConversations: async (page = 1, limit = 20) => {
      // Nếu đang loading hoặc đã có dữ liệu và là request trang 1, bỏ qua
      if (!user?.id || isApiCallingRef.current || 
          (page === 1 && conversationsLoadedRef.current)) return;
      
      isApiCallingRef.current = true;
      setConversationsLoading(true);
      
      try {
        // Thay vì gọi API cho từng conversation, chỉ sử dụng dữ liệu từ conversation_details
        const conversationDetailsResponse = await defaultMessagesRepo.getConversationDetailByUserID({
          user_id: user.id,
          limit: 100, // Lấy số lượng lớn hơn để tránh phải gọi lại
          page: 1
        });
        
        if (conversationDetailsResponse.data && Array.isArray(conversationDetailsResponse.data)) {
          // Extract conversations from conversation details
          const conversationDetails = conversationDetailsResponse.data as any[];
          
          // Lọc ra các conversation hợp lệ đã có đầy đủ thông tin
          const validConversations = conversationDetails
            .filter(detail => detail.conversation && detail.conversation.id)
            .map(detail => ({
              id: detail.conversation.id,
              name: detail.conversation.name,
              image: detail.conversation.image,
              created_at: detail.conversation.created_at,
              updated_at: detail.conversation.updated_at
            }));
          
          // Loại bỏ các conversation trùng lặp nếu có
          const uniqueConversations = Array.from(
            new Map(validConversations.map(item => [item.id, item])).values()
          ) as ConversationResponseModel[];
          
          // Sort conversations by most recent
          const sortedConversations = [...uniqueConversations].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || "").getTime();
            const dateB = new Date(b.updated_at || b.created_at || "").getTime();
            return dateB - dateA; // Sort by most recent first
          });
          
          if (page === 1) {
            setConversations(sortedConversations);
            // Đánh dấu đã load để không load lại nữa
            conversationsLoadedRef.current = true;
          } else {
            setConversations(prev => [...prev, ...sortedConversations]);
          }
          
          // Check if we've reached the end of the conversations
          setIsConversationsEnd(true); // Since we're fetching all at once
          setConversationPage(page);
        } else {
          // No conversations found
          setConversations([]);
          setIsConversationsEnd(true);
          // Vẫn đánh dấu là đã load để không gọi lại
          conversationsLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        message.error(localStrings.Public.ErrorFetchingConversations || "Error fetching conversations");
      } finally {
        setConversationsLoading(false);
        // Cho phép gọi API lại sau 2 giây
        setTimeout(() => {
          isApiCallingRef.current = false;
        }, 2000);
      }
    },
    
    fetchMessages: async (conversationId: string, page = 1, limit = 20) => {
      if (!conversationId || messagesLoading) return;
      
      // Reset messages when changing conversations
      if (page === 1) {
        setMessages([]);
      }
      
      setMessagesLoading(true);
      
      try {
        const response = await defaultMessagesRepo.getMessagesByConversationId({
          conversation_id: conversationId,
          page,
          limit
        });
        
        if (response.data) {
          let fetchedMessages = Array.isArray(response.data) 
            ? response.data as MessageResponseModel[]
            : [response.data] as MessageResponseModel[];
          
          // Sort messages by created_at
          fetchedMessages = fetchedMessages.sort((a, b) => {
            return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
          });
          
          if (page === 1) {
            setMessages(fetchedMessages);
          } else {
            // When loading older messages (pagination), add them to the beginning
            setMessages(prev => [...fetchedMessages, ...prev]);
          }
          
          // Check if we've reached the end of the messages
          if (fetchedMessages.length < limit) {
            setIsMessagesEnd(true);
          } else {
            setIsMessagesEnd(false);
          }
          
          setMessagePage(page);
        } else {
          // If no messages are found, set an empty array
          if (page === 1) {
            setMessages([]);
          }
          setIsMessagesEnd(true);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        message.error(localStrings.Public.ErrorFetchingMessages || "Error fetching messages");
      } finally {
        setMessagesLoading(false);
      }
    },
    
    sendMessage: async (content: string, conversationId: string) => {
      if (!conversationId || !content.trim() || !user) return;
      
      // Tạo ID tạm thời để theo dõi tin nhắn
      const tempId = `temp_${Date.now()}`;
      
      // Create temporary message for optimistic UI update
      const tempMessage: MessageResponseModel = {
        id: tempId,
        user_id: user.id,
        user: {
          id: user.id,
          family_name: user.family_name,
          name: user.name,
          avatar_url: user.avatar_url
        },
        conversation_id: conversationId,
        content,
        created_at: new Date().toISOString(),
        isTemporary: true
      };
      
      // Add temporary message to the list
      setMessages(prev => [...prev, tempMessage]);
      
      try {
        // Send message to the server
        const response = await defaultMessagesRepo.createMessage({
          content,
          conversation_id: conversationId,
          user: {
            id: user.id,
            family_name: user.family_name,
            name: user.name,
            avatar_url: user.avatar_url
          }
        });
        
        if (response.data) {
          // Tạo reference đến real message từ API
          const realMessage = response.data as MessageResponseModel;
          
          // Lưu trữ mapping giữa tempId và realMessage.id để sử dụng sau này
          // khi cần xác định message nào là tin nhắn tạm thời
          const tempToRealIdMap = new Map();
          tempToRealIdMap.set(tempId, realMessage.id);
          
          // Replace temporary message with the real one
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? { ...realMessage, isTemporary: false } : msg
            )
          );
          
          // Thành công, không còn cần hiển thị "đang gửi"
          console.log("Message sent successfully:", realMessage);
          
          // Không cần fetch lại messages ngay lập tức vì đã cập nhật UI
          // Người nhận sẽ nhận tin nhắn qua WebSocket
        }
      } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.ErrorSendingMessage || "Error sending message");
        
        // Remove the temporary message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
    },
    
    createConversation: async (name: string, image?: string) => {
      if (!user?.id) {
        message.error(localStrings.Public.LoginRequired || "You need to be logged in");
        return;
      }
      
      try {
        const response = await defaultMessagesRepo.createConversation({
          name,
          image
        });
        
        if (response.data) {
          const newConversation = response.data as ConversationResponseModel;
          
          // Add the current user to the conversation first
          try {
            await defaultMessagesRepo.createConversationDetail({
              conversation_id: newConversation.id,
              user_id: user.id
            });
            
            // Add the new conversation to the list
            setConversations(prev => [newConversation, ...prev]);
            
            // Set it as the current conversation
            setCurrentConversation(newConversation);
            
            return newConversation;
          } catch (error) {
            console.error("Error adding current user to conversation:", error);
            message.error(localStrings.Public.ErrorCreatingConversation || "Error creating conversation");
          }
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        message.error(localStrings.Public.ErrorCreatingConversation || "Error creating conversation");
      }
    },
    
    deleteMessage: async (messageId: string) => {
      try {
        await defaultMessagesRepo.deleteMessage({
          message_id: messageId
        });
        
        // Remove the message from the list
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        message.success(localStrings.Public.MessageDeleted || "Message deleted");
      } catch (error) {
        console.error("Error deleting message:", error);
        message.error(localStrings.Public.ErrorDeletingMessage || "Error deleting message");
      }
    },
    
    deleteConversation: async (conversationId: string) => {
      try {
        await defaultMessagesRepo.deleteConversation({
          conversation_id: conversationId
        });
        
        // Remove the conversation from the list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If the deleted conversation is the current one, clear it
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
        
        message.success(localStrings.Public.ConversationDeleted || "Conversation deleted");
      } catch (error) {
        console.error("Error deleting conversation:", error);
        message.error(localStrings.Public.ErrorDeletingConversation || "Error deleting conversation");
      }
    }
  });

  // Connect to WebSocket khi user thay đổi
  useEffect(() => {
    if (!user?.id) return;
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}`;
    
    try {
      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection established successfully");
      };
      
      ws.onmessage = (event) => {
        try {
          // Log raw message để debug
          console.log("WebSocket raw message:", event.data);
          
          // Parse JSON message
          const newMessage = JSON.parse(event.data);
          console.log("WebSocket parsed message:", newMessage);
          
          // Kiểm tra cấu trúc message
          if (!newMessage) {
            console.warn("WebSocket received empty message");
            return;
          }
          
          // Kiểm tra conversation_id
          if (!newMessage.conversation_id) {
            console.warn("WebSocket message missing conversation_id:", newMessage);
            return;
          }
          
          // If the message is for the current conversation, add it to the messages
          if (currentConversation && newMessage.conversation_id === currentConversation.id) {
            console.log("Adding new message to current conversation:", newMessage);
            
            // Kiểm tra xem message đã tồn tại trong danh sách chưa
            setMessages(prev => {
              // Nếu message này đã tồn tại (có thể là tin nhắn tạm thời), không thêm vào nữa
              const messageExists = prev.some(msg => 
                (msg.id === newMessage.id) || 
                (msg.content === newMessage.content && 
                 msg.user_id === newMessage.user_id && 
                 Math.abs(new Date(msg.created_at || "").getTime() - 
                          new Date(newMessage.created_at || "").getTime()) < 5000)
              );
              
              if (messageExists) {
                console.log("Message already exists in list, not adding duplicate");
                return prev;
              }
              
              console.log("Adding new message to list");
              return [...prev, newMessage];
            });
          } else {
            console.log("Message is for another conversation:", 
                       newMessage.conversation_id, 
                       "current:", currentConversation?.id);
          }
          
          // Update conversation list without re-fetching
          setConversations(prev => {
            if (!prev.length) return prev;
            
            const conversationIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
            if (conversationIndex >= 0) {
              console.log("Updating conversation order for new message");
              // Move the conversation with new message to the top
              const updatedConversations = [...prev];
              const conversation = { ...updatedConversations[conversationIndex] };
              // Cập nhật thời gian
              conversation.updated_at = new Date().toISOString();
              updatedConversations.splice(conversationIndex, 1);
              updatedConversations.unshift(conversation);
              return updatedConversations;
            }
            
            // Nếu là conversation mới, load lại danh sách conversation
            console.log("Message is for a new conversation, refreshing conversation list");
            // Đặt timeout để đảm bảo không gọi API quá nhanh
            setTimeout(() => {
              // Reset conversation loaded flag to force refresh
              conversationsLoadedRef.current = false;
              stableActions.current.fetchConversations();
            }, 500);
            
            return prev;
          });
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      ws.onclose = (event) => {
        console.log("WebSocket connection closed", event.code, event.reason);
        
        // Attempt to reconnect after 5 seconds if not closed intentionally
        if (event.code !== 1000) {
          console.log("Attempting to reconnect WebSocket in 5 seconds...");
          setTimeout(() => {
            if (user?.id) {
              // Reset WebSocket ref
              socketRef.current = null;
              // Create new WebSocket connection
              try {
                const newWs = new WebSocket(wsUrl);
                // Apply same handlers...
                newWs.onopen = ws.onopen;
                newWs.onmessage = ws.onmessage;
                newWs.onerror = ws.onerror;
                newWs.onclose = ws.onclose;
                socketRef.current = newWs;
              } catch (error) {
                console.error("Error reconnecting WebSocket:", error);
              }
            }
          }, 5000);
        }
      };
      
      socketRef.current = ws;
      
      // Clean up WebSocket connection on unmount
      return () => {
        if (socketRef.current) {
          // Use 1000 code to indicate clean close
          socketRef.current.close(1000, "Component unmounting");
          socketRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }, [user?.id, currentConversation?.id]);

  // Memoize API functions để đảm bảo tham chiếu cố định
  const fetchConversations = useCallback((page = 1) => {
    stableActions.current.fetchConversations(page);
  }, []);
  
  const fetchMessages = useCallback((conversationId: string, page = 1) => {
    stableActions.current.fetchMessages(conversationId, page);
  }, []);
  
  const sendMessage = useCallback(() => {
    if (currentConversation?.id && messageText.trim()) {
      const messageToSend = messageText.trim();
      stableActions.current.sendMessage(messageToSend, currentConversation.id);
      setMessageText("");
    }
  }, [currentConversation?.id, messageText]);
  
  const createConversation = useCallback((name: string, image?: string) => {
    return stableActions.current.createConversation(name, image);
  }, []);
  
  const deleteMessage = useCallback((messageId: string) => {
    stableActions.current.deleteMessage(messageId);
  }, []);
  
  const deleteConversation = useCallback((conversationId: string) => {
    stableActions.current.deleteConversation(conversationId);
  }, []);
  
  // Load more messages (older messages)
  const loadMoreMessages = useCallback(() => {
    if (currentConversation?.id) {
      stableActions.current.fetchMessages(currentConversation.id, messagePage + 1);
    }
  }, [currentConversation?.id, messagePage]);

  // Reset biến đã loaded khi component unmount
  useEffect(() => {
    return () => {
      conversationsLoadedRef.current = false;
      isApiCallingRef.current = false;
    };
  }, []);

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
    isConversationsEnd,
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation,
    
    // Actions
    sendMessage,
    fetchConversations,
    loadMoreMessages,
    fetchMessages,
    createConversation,
    deleteMessage,
    deleteConversation
  };
};