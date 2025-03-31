import { useState, useEffect, useRef, useCallback } from "react";
import { message } from "antd";

import { useAuth } from "@/context/auth/useAuth";
import { useWebSocket } from "@/context/websocket/useWebSocket";

import { defaultMessagesRepo } from "@/api/features/messages/MessagesRepo";
import { ConversationResponseModel, UpdateConversationRequestModel } from "@/api/features/messages/models/ConversationModel";
import { MessageResponseModel } from "@/api/features/messages/models/MessageModel";

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

  // Pagination for messages - Khởi tạo trang cuối cùng để load tin nhắn mới nhất trước
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;
  
  // Ref for message list for scrolling
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const initialLoadRef = useRef<boolean>(false);

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
      }
    });
    
    return unsubscribe;
  }, [addMessageListener, currentConversation?.id]);

  // Update messages from WebSocket when conversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      // Luôn xóa messages trước để tránh hiện tin nhắn cũ
      setMessages([]);
      
      // Cập nhật ID cuộc trò chuyện hiện tại trong WebSocket
      setCurrentConversationId(currentConversation.id);
      
      // Reset cờ tải ban đầu khi chuyển cuộc trò chuyện
      initialLoadRef.current = false;
      
      // Sử dụng timeout để đảm bảo state đã được cập nhật
      setTimeout(() => {
        // Luôn lấy tin nhắn từ API để đảm bảo dữ liệu mới nhất
        fetchLatestMessages(currentConversation.id);
      }, 50);
    }
  }, [currentConversation?.id]);
  

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only scroll to bottom if it's a new message or initial load
      if (lastMessageRef.current !== lastMessage.id || !initialLoadRef.current) {
        scrollToBottom();
        lastMessageRef.current = lastMessage.id || null;
        initialLoadRef.current = true;
      }
    }
  }, [messages]);

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
      message.error(localStrings.Messages.ErrorFetchingConversations || "Error fetching conversations");
    } finally {
      setConversationsLoading(false);
    }
  };

  // Hàm mới để tải tin nhắn mới nhất trước
  const fetchLatestMessages = async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    setMessagesLoading(true);
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        limit: pageSize,
        page: 1
      });
      
      if (response.data) {
        // Chuyển đổi thành mảng nếu chưa phải
        const messageList = Array.isArray(response.data) ? response.data : [response.data];
        
        // Sắp xếp tin nhắn theo thời gian tạo
        const sortedMessages = messageList.sort((a, b) => {
          const dateA = new Date(a.created_at || "");
          const dateB = new Date(b.created_at || "");
          return dateA.getTime() - dateB.getTime();
        });
        
        // Kiểm tra xem đã đến cuối tin nhắn chưa
        setIsMessagesEnd(messageList.length < pageSize);
        
        // Cập nhật messages trong WebSocket context
        updateMessagesForConversation(conversationId, sortedMessages);
        
        // Sau đó lấy lại từ context để cập nhật state
        const contextMessages = getMessagesForConversation(conversationId);
        setMessages(contextMessages);
        
        // Reset current page
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error fetching latest messages:", error);
    } finally {
      setMessagesLoading(false);
      // Cuộn xuống dưới sau khi tải tin nhắn mới nhất
      setTimeout(scrollToBottom, 100);
    }
  };

  // Function to fetch messages for a conversation (để load more)
  const fetchMessages = async (conversationId: string, page: number = 1, append: boolean = false) => {
    if (!user?.id || !conversationId) return;
    
    setMessagesLoading(true);
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        limit: pageSize,
        page: page
      });
      
      if (response.data) {
        // Convert to array if not already
        const messageList = Array.isArray(response.data) ? response.data : [response.data];
        
        // Sort messages by created_at
        const sortedMessages = messageList.sort((a, b) => {
          const dateA = new Date(a.created_at || "");
          const dateB = new Date(b.created_at || "");
          return dateA.getTime() - dateB.getTime();
        });
        
        // Check if we've reached the end of messages
        setIsMessagesEnd(messageList.length < pageSize);
        
        // Get existing messages from context 
        const existingMessages = getMessagesForConversation(conversationId);
        
        if (append) {
          // When loading more messages, merge with existing ones
          // First, create a map of existing messages by ID for quick lookup
          const existingMessageMap = new Map();
          existingMessages.forEach(msg => {
            if (msg.id) {
              existingMessageMap.set(msg.id, true);
            }
          });
          
          // Only add messages that don't already exist
          const newMessages = sortedMessages.filter(msg => !msg.id || !existingMessageMap.has(msg.id));
          
          // Update WebSocket context with merged messages
          const combinedMessages = [...newMessages, ...existingMessages];
          updateMessagesForConversation(conversationId, combinedMessages);
        } else {
          // When fetching initial messages, replace existing ones
          updateMessagesForConversation(conversationId, sortedMessages);
        }
        
        // Get updated messages from context and update state
        const updatedMessages = getMessagesForConversation(conversationId);
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Function to load more messages (older messages)
  const loadMoreMessages = async () => {
    if (currentConversation?.id && !messagesLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
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
      message.error(localStrings.Messages.GroupCreationFailed || "Failed to create conversation");
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
      message.error(localStrings.Messages.MessageTooLong || "Message too long");
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
      
      message.error(localStrings.Public.Error || "Failed to send message");
    }
    
    // Scroll to bottom after sending
    scrollToBottom();
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
      message.error(localStrings.Public.Error || "Error deleting message");
      
      // Fetch messages again to reset state
      if (currentConversation.id) {
        fetchLatestMessages(currentConversation.id);
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
      message.error(localStrings.Public.Error || "Error updating conversation");
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
    
    // Setters
    setSearchText,
    setMessageText,
    setCurrentConversation: (conversation: ConversationResponseModel | null) => {
      setCurrentConversation(conversation);
      setCurrentPage(1);
      setIsMessagesEnd(false);
      
      // Reset message list when changing conversations
      setMessages([]);
      
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