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
            // Thêm property để đánh dấu tin nhắn từ server
            const markedMessages = fetchedMessages.map(msg => ({
              ...msg,
              fromServer: true
            }));
            
            setMessages(markedMessages);
          } else {
            // Merge với tin nhắn hiện có, đảm bảo không có trùng lặp
            setMessages(prev => {
              // Tập hợp ID tin nhắn hiện có
              const existingIds = new Set(prev.map(msg => msg.id));
              
              // Lọc tin nhắn chưa có trong danh sách
              const newMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id))
                .map(msg => ({
                  ...msg,
                  fromServer: true
                }));
              
              // Kết hợp tin nhắn mới với tin nhắn hiện có
              const mergedMessages = [...newMessages, ...prev];
              
              // Sắp xếp lại theo thời gian
              return mergedMessages.sort((a, b) => {
                return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
              });
            });
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
          
          // Thêm thuộc tính fromServer vào tin nhắn thật
          const serverMessage = {
            ...realMessage,
            fromServer: true,
            isTemporary: false
          };
          
          // Replace temporary message with the real one
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? serverMessage : msg
            )
          );
          
          // Thành công, không còn cần hiển thị "đang gửi"
          console.log("Message sent successfully:", serverMessage);
          
          // Cập nhật thứ tự conversation
          setConversations(prev => {
            const conversationIndex = prev.findIndex(c => c.id === conversationId);
            if (conversationIndex < 0) return prev;
            
            const updatedConversations = [...prev];
            const conversation = { ...updatedConversations[conversationIndex] };
            
            // Cập nhật thời gian
            conversation.updated_at = new Date().toISOString();
            
            // Xóa conversation tại vị trí cũ
            updatedConversations.splice(conversationIndex, 1);
            
            // Thêm vào đầu danh sách
            updatedConversations.unshift(conversation);
            
            return updatedConversations;
          });
          
          // Sau 10 giây, force refresh để đảm bảo tin nhắn được lưu trữ đúng
          setTimeout(() => {
            if (currentConversation?.id === conversationId) {
              stableActions.current.fetchMessages(conversationId, 1, 50);
            }
          }, 10000);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        message.error(localStrings.Public.ErrorSendingMessage || "Error sending message");
        
        // Remove the temporary message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        
        // Cố gắng gửi lại sau 2 giây nếu có lỗi network
        setTimeout(() => {
          if (navigator.onLine) {
            console.log("Retrying to send message...");
            stableActions.current.sendMessage(content, conversationId);
          }
        }, 2000);
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

  // Connect to WebSocket khi user thay đổi - Loại bỏ phụ thuộc vào currentConversation?.id
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
      
      let pingInterval: ReturnType<typeof setInterval> | null = null;
      
      ws.onopen = () => {
        console.log("WebSocket connection established successfully");
        
        // Cơ chế ping-pong để giữ kết nối sống và kiểm tra sự gián đoạn
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Send ping message to keep the connection alive
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch (err) {
              console.error("Error sending ping:", err);
            }
          } else {
            // WebSocket is not open, try to reconnect
            if (pingInterval) {
              clearInterval(pingInterval);
              // Attempt to reconnect
              console.log("WebSocket connection lost, attempting to reconnect...");
              try {
                ws.close();
                // Create new instance in the onclose handler
              } catch (err) {
                console.error("Error closing broken WebSocket:", err);
              }
            }
          }
        }, 30000); // Check every 30 seconds
      };
      
      ws.onmessage = (event) => {
        try {
          // Log raw message để debug
          console.log("WebSocket raw message:", event.data);
          
          // Kiểm tra nếu là tin nhắn pong
          if (event.data === "pong" || event.data.includes("pong")) {
            console.log("Received pong from server");
            return;
          }
          
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
          
          // Kiểm tra nếu message này là cho conversation hiện tại
          // Không sử dụng closure capture cho currentConversation (để tránh stale closure)
          const currentConvId = currentConversation?.id;
          
          if (currentConvId && newMessage.conversation_id === currentConvId) {
            console.log("Adding new message to current conversation:", newMessage);
            
            // Kiểm tra xem message đã tồn tại trong danh sách chưa
            setMessages(prev => {
              // Nếu message này đã tồn tại (có thể là tin nhắn tạm thời hoặc đã có), không thêm vào nữa
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
              
              // Thêm message mới vào cuối danh sách
              const newMessages = [...prev, newMessage];
              
              // Sắp xếp lại tin nhắn theo thời gian để đảm bảo thứ tự đúng
              return newMessages.sort((a, b) => {
                return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
              });
            });
            
            // Force refresh messages after a short delay to ensure consistency
            setTimeout(() => {
              if (currentConversation?.id === newMessage.conversation_id) {
                console.log("Syncing messages for conversation after receiving new message");
                // Sử dụng page 1 và limit lớn hơn để lấy đủ tin nhắn
                stableActions.current.fetchMessages(newMessage.conversation_id, 1, 50);
              }
            }, 1000);
          } else {
            console.log("Message is for another conversation");
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
        
        // Clear ping interval if it exists
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
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
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        
        if (socketRef.current) {
          // Use 1000 code to indicate clean close
          socketRef.current.close(1000, "Component unmounting");
          socketRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }, [user?.id]); // Chỉ phụ thuộc vào user?.id để tránh stale closures

  // Cơ chế tự động đồng bộ tin nhắn nếu conversation active
  useEffect(() => {
    if (!currentConversation?.id) return;
    
    // Khi conversation thay đổi, load tin nhắn mới một lần
    stableActions.current.fetchMessages(currentConversation.id);
    
    // Cài đặt interval cho việc đồng bộ định kỳ
    const syncInterval = setInterval(() => {
      if (currentConversation?.id) {
        console.log("Auto-syncing messages for active conversation");
        stableActions.current.fetchMessages(currentConversation.id, 1, 50);
      }
    }, 15000); // Sync every 15 seconds
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [currentConversation?.id]);

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