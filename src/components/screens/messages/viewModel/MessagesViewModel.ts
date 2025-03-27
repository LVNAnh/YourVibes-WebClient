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
  useEffect(() => {
    if (user?.id) {
      const wsUrl = `${ApiPath.CONNECT_TO_WEBSOCKET}${user.id}`;
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
          
          // Refresh conversations list to update last message
          fetchConversations();
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
    }
  }, [user?.id]);

  // Fetch conversations list
  const fetchConversations = useCallback(async (page = 1, limit = 20) => {
    if (conversationsLoading || (page > 1 && isConversationsEnd)) return;
    
    setConversationsLoading(true);
    try {
      const response = await defaultMessagesRepo.getConversations({
        page,
        limit
      });
      
      if (response.data) {
        if (page === 1) {
          setConversations(response.data as ConversationResponseModel[]);
        } else {
          setConversations(prev => [...prev, ...(response.data as ConversationResponseModel[])]);
        }
        
        // Check if we've reached the end of the conversations
        if ((response.data as ConversationResponseModel[]).length < limit) {
          setIsConversationsEnd(true);
        }
        
        setConversationPage(page);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      message.error(localStrings.Public.ErrorFetchingConversations);
    } finally {
      setConversationsLoading(false);
    }
  }, [conversationsLoading, isConversationsEnd, localStrings.Public.ErrorFetchingConversations]);

  // Load more conversations
  const loadMoreConversations = useCallback(() => {
    fetchConversations(conversationPage + 1);
  }, [conversationPage, fetchConversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string, page = 1, limit = 20) => {
    if (messagesLoading || (page > 1 && isMessagesEnd)) return;
    
    setMessagesLoading(true);
    try {
      const response = await defaultMessagesRepo.getMessagesByConversationId({
        conversation_id: conversationId,
        page,
        limit
      });
      
      if (response.data) {
        let fetchedMessages = response.data as MessageResponseModel[];
        
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
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      message.error(localStrings.Public.ErrorFetchingMessages);
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
    try {
      const response = await defaultMessagesRepo.createConversation({
        name,
        image
      });
      
      if (response.data) {
        // Add the new conversation to the list
        setConversations(prev => [response.data as ConversationResponseModel, ...prev]);
        
        // Set it as the current conversation
        setCurrentConversation(response.data as ConversationResponseModel);
        
        // Fetch messages for the new conversation
        fetchMessages((response.data as ConversationResponseModel).id!);
        
        return response.data;
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      message.error(localStrings.Public.ErrorCreatingConversation);
    }
  }, [fetchMessages, localStrings.Public.ErrorCreatingConversation]);

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