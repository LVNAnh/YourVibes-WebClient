import { useState, useCallback, useEffect } from "react";
import { message } from "antd";
import { useAuth } from "@/context/auth/useAuth";
import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ApiPath } from "@/api/ApiPath";
import { ConversationResponseModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

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
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Connect to WebSocket when user is available
  // CHỦ ĐỘNG CHỈ KẾT NỐI WEBSOCKET KHI USER THAY ĐỔI, KHÔNG PHỤ THUỘC VÀO CONVERSATION
  useEffect(() => {
    if (user?.id) {
      // Disconnect existing socket if any
      if (socket) {
        socket.close();
      }
      
      const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WebSocket connection established");
        };
        
        ws.onmessage = (event) => {
          try {
            const newMessage = JSON.parse(event.data);
            
            // If the message is for the current conversation, add it to the messages
            if (currentConversation && newMessage.conversation_id === currentConversation.id) {
              setMessages(prev => [...prev, newMessage]);
            }
            
            // Instead of refreshing all conversations, we'll update just the conversation
            // with the new message to avoid excessive API calls
            if (newMessage.conversation_id) {
              setConversations(prev => {
                const conversationIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
                if (conversationIndex >= 0) {
                  // Move the conversation with new message to the top
                  const updatedConversations = [...prev];
                  const conversation = { ...updatedConversations[conversationIndex] };
                  updatedConversations.splice(conversationIndex, 1);
                  updatedConversations.unshift(conversation);
                  return updatedConversations;
                }
                return prev;
              });
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        
        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };
        
        setSocket(ws);
        
        // Clean up WebSocket connection on unmount
        return () => {
          ws.close();
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
      }
    }
    // Chỉ phụ thuộc vào user?.id để tránh kết nối lại WS mỗi khi conversation thay đổi
  }, [user?.id]);

  // Fetch conversations list for the current user
  // SỬA LẠI LOGIC LẤY CONVERSATIONS ĐỂ TRÁNH GỌI NHIỀU REQUEST
  const fetchConversations = useCallback(async (page = 1, limit = 20) => {
    if (!user?.id || conversationsLoading || (page > 1 && isConversationsEnd)) return;
    
    setConversationsLoading(true);
    try {
      // Thay vì gọi API cho từng conversation, chỉ sử dụng dữ liệu từ conversation_details
      const conversationDetailsResponse = await defaultMessagesRepo.getConversationDetailByUserID({
        user_id: user.id,
        limit: 50,
        page: 1
      });
      
      if (conversationDetailsResponse.data && Array.isArray(conversationDetailsResponse.data)) {
        // Extract conversations from conversation details - không cần gọi thêm API nữa
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
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      message.error(localStrings.Public.ErrorFetchingConversations || "Error fetching conversations");
    } finally {
      setConversationsLoading(false);
    }
  }, [user?.id, conversationsLoading, isConversationsEnd, localStrings.Public.ErrorFetchingConversations]);

  // Load more conversations
  const loadMoreConversations = useCallback(() => {
    fetchConversations(conversationPage + 1);
  }, [conversationPage, fetchConversations]);

  // Fetch messages for a conversation - với debounce để tránh gọi lại nhiều lần
  const fetchMessages = useCallback(async (conversationId: string, page = 1, limit = 20) => {
    if (!conversationId || messagesLoading || (page > 1 && isMessagesEnd)) return;
    
    // Reset messages when changing conversations
    if (page === 1) {
      setMessages([]);
    }
    
    // Thêm debounce flag để tránh gọi API nhiều lần
    setMessagesLoading(true);
    try {
      // Sử dụng một biến requestId để theo dõi request hiện tại
      const requestId = Date.now();
      // @ts-ignore - Lưu requestId vào ref để kiểm tra sau này
      fetchMessages.currentRequestId = requestId;
      
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        page,
        limit
      });
      
      // Nếu đây không phải request mới nhất, hủy xử lý
      // @ts-ignore
      if (fetchMessages.currentRequestId !== requestId) {
        return;
      }
      
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
  }, [messagesLoading, isMessagesEnd, localStrings.Public.ErrorFetchingMessages]);

  // Load more messages (older messages)
  const loadMoreMessages = useCallback(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id, messagePage + 1);
    }
  }, [currentConversation?.id, messagePage, fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!currentConversation?.id || !messageText.trim() || !user) return;
    
    // Create temporary message for optimistic UI update
    const tempMessage: MessageResponseModel = {
      id: `temp_${Date.now()}`,
      user_id: user.id,
      user: {
        id: user.id,
        family_name: user.family_name,
        name: user.name,
        avatar_url: user.avatar_url
      },
      conversation_id: currentConversation.id,
      content: messageText,
      created_at: new Date().toISOString(),
      isTemporary: true
    };
    
    // Add temporary message to the list
    setMessages(prev => [...prev, tempMessage]);
    
    // Clear input field
    setMessageText("");
    
    try {
      // Send message to the server
      const response = await defaultMessagesRepo.createMessage({
        content: messageText,
        conversation_id: currentConversation.id,
        user: {
          id: user.id,
          family_name: user.family_name,
          name: user.name,
          avatar_url: user.avatar_url
        }
      });
      
      if (response.data) {
        // Replace temporary message with the real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? { ...response.data as MessageResponseModel, isTemporary: false } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      message.error(localStrings.Public.ErrorSendingMessage);
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  }, [currentConversation?.id, messageText, user, localStrings.Public.ErrorSendingMessage]);

  // Create a new conversation
  const createConversation = useCallback(async (name: string, image?: string) => {
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
        
        // Add the current user to the conversation first (so they can see the conversation)
        try {
          await defaultMessagesRepo.createConversationDetail({
            conversation_id: newConversation.id,
            user_id: user.id
          });
          
          // Add the new conversation to the list
          setConversations(prev => [newConversation, ...prev]);
          
          // Set it as the current conversation
          setCurrentConversation(newConversation);
          
          // Fetch messages for the new conversation (which will be empty initially)
          fetchMessages(newConversation.id!);
          
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
  }, [user?.id, fetchMessages, localStrings.Public.ErrorCreatingConversation]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await defaultMessagesRepo.deleteMessage({
        message_id: messageId
      });
      
      // Remove the message from the list
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      message.success(localStrings.Public.MessageDeleted);
    } catch (error) {
      console.error("Error deleting message:", error);
      message.error(localStrings.Public.ErrorDeletingMessage);
    }
  }, [localStrings.Public.MessageDeleted, localStrings.Public.ErrorDeletingMessage]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
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
      
      message.success(localStrings.Public.ConversationDeleted);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      message.error(localStrings.Public.ErrorDeletingConversation);
    }
  }, [currentConversation?.id, localStrings.Public.ConversationDeleted, localStrings.Public.ErrorDeletingConversation]);

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
    loadMoreConversations,
    fetchMessages,
    loadMoreMessages,
    createConversation,
    deleteMessage,
    deleteConversation
  };
};