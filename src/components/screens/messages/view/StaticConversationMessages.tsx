import React, { Component } from 'react';
import { Spin } from 'antd';
import { MessageResponseModel } from '@/api/features/messages/models/MessageModel';
import { CiCircleChevDown } from "react-icons/ci";

// Use a class component to have maximum control over rendering
class StaticConversationMessages extends Component {
  messagesContainerRef = React.createRef<HTMLDivElement>();
  shouldScrollRef = React.createRef<boolean>();
  lastConversationId = null;
  lastMessageCount = 0;
  
  constructor(props) {
    super(props);
    this.shouldScrollRef.current = true;
    this.state = {
      showScrollButton: false
    };
  }
  
  // Only update component when absolutely necessary
  shouldComponentUpdate(nextProps, nextState) {
    const { 
      activeConversationId, 
      messages, 
      isLoadingMessages, 
      isCreatingGroup 
    } = this.props;
    
    // Always update if loading state changes
    if (isLoadingMessages !== nextProps.isLoadingMessages || 
        isCreatingGroup !== nextProps.isCreatingGroup) {
      return true;
    }
    
    // Always update if conversation changes
    if (activeConversationId !== nextProps.activeConversationId) {
      this.lastConversationId = nextProps.activeConversationId;
      this.shouldScrollRef.current = true;
      return true;
    }
    
    // Check if messages array has changed significantly
    if (messages && nextProps.messages) {
      // Update if message count changes
      if (messages.length !== nextProps.messages.length) {
        this.shouldScrollRef.current = true;
        this.lastMessageCount = nextProps.messages.length;
        return true;
      }
      
      // Update if last message changes
      if (messages.length > 0 && nextProps.messages.length > 0) {
        const lastOldMsg = messages[messages.length - 1];
        const lastNewMsg = nextProps.messages[nextProps.messages.length - 1];
        
        if (lastOldMsg.id !== lastNewMsg.id ||
            lastOldMsg.isTemporary !== lastNewMsg.isTemporary) {
          this.shouldScrollRef.current = true;
          return true;
        }
      }
    }
    
    // Only update scroll button state if it's changing
    if (this.state.showScrollButton !== nextState.showScrollButton) {
      return true;
    }
    
    // Skip update in all other cases
    return false;
  }
  
  componentDidMount() {
    this.scrollToBottom();
    
    // Add scroll handler
    if (this.messagesContainerRef.current) {
      this.messagesContainerRef.current.addEventListener('scroll', this.handleScroll);
    }
  }
  
  componentWillUnmount() {
    // Remove scroll handler
    if (this.messagesContainerRef.current) {
      this.messagesContainerRef.current.removeEventListener('scroll', this.handleScroll);
    }
  }
  
  componentDidUpdate() {
    if (this.shouldScrollRef.current) {
      this.scrollToBottom();
      this.shouldScrollRef.current = false;
    }
  }
  
  handleScroll = (e) => {
    const container = e.target;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight > 100;
    
    if (this.state.showScrollButton !== isNearBottom) {
      this.setState({ showScrollButton: isNearBottom });
    }
  }
  
  scrollToBottom = () => {
    setTimeout(() => {
      if (this.messagesContainerRef.current) {
        this.messagesContainerRef.current.scrollTop = this.messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  }
  
  handleScrollButtonClick = () => {
    this.scrollToBottom();
    this.setState({ showScrollButton: false });
  }
  
  isUserMessage = (message) => {
    return message.user_id === this.props.user?.id;
  }
  
  renderNoConversationSelected() {
    return (
      <p className="text-gray-500 text-center py-8">
        {this.props.localStrings.Messages.ChooseConversationToConnect || "Chọn một cuộc hội thoại để kết nối"}
      </p>
    );
  }
  
  renderNoMessages() {
    return (
      <p className="text-gray-500 text-center py-8">
        {this.props.localStrings.Messages.NoMessages || "Không có tin nhắn"}
      </p>
    );
  }
  
  renderLoadingState() {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" tip="Đang tải tin nhắn..." />
      </div>
    );
  }
  
  renderCreatingGroup() {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" tip="Đang tạo nhóm chat..." />
      </div>
    );
  }
  
  renderMessages() {
    const { messages, activeConversationId, localStrings } = this.props;
    
    if (!messages || messages.length === 0) {
      return this.renderNoMessages();
    }
    
    // Group messages by date
    const messagesByDate = {};
    
    messages.forEach(message => {
      if (!message) return; // Skip null or undefined messages
      
      // Get date from created_at (yyyy-MM-dd)
      const date = new Date(message.created_at || new Date());
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = [];
      }
      
      messagesByDate[dateKey].push(message);
    });
    
    // Render each group of messages by date
    return Object.entries(messagesByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB)) // Sort by date ascending
      .map(([dateKey, messagesForDate]) => {
        // Format display date
        const [year, month, day] = dateKey.split('-').map(Number);
        const formattedDate = `${day}/${month}/${year}`;
        
        return (
          <div key={`date-${dateKey}-${activeConversationId}`} className="mb-6">
            {/* Date header */}
            <div className="flex justify-center mb-4">
              <div className="bg-gray-200 rounded-full px-4 py-1 text-sm text-gray-600">
                {formattedDate}
              </div>
            </div>
            
            {/* Messages for this date */}
            {messagesForDate.map((message, index) => {
              if (!message) return null; // Skip null or undefined messages
              
              const isUser = this.isUserMessage(message);
              const messageContent = message.text || message.content || "";
              
              // Format message time (hh:mm:ss)
              const messageDate = new Date(message.created_at || new Date());
              const timeString = `${String(messageDate.getHours()).padStart(2, '0')}:${String(messageDate.getMinutes()).padStart(2, '0')}:${String(messageDate.getSeconds()).padStart(2, '0')}`;
              
              const messageKey = `${message.id || `msg-${index}`}-${activeConversationId}`;
              
              return (
                <div 
                  key={messageKey}
                  className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <img
                      src={message.user?.avatar_url || "https://via.placeholder.com/40"}
                      alt={`${message.user?.name || "User"}'s avatar`}
                      className="w-8 h-8 rounded-full mr-2"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/40";
                      }}
                    />
                  )}
                  <div 
                    className={`p-3 rounded-lg shadow max-w-xs md:max-w-sm w-fit break-words ${
                      isUser ? 'bg-blue-100' : 'bg-white'
                    } ${message.isTemporary ? 'opacity-70' : 'opacity-100'}`}
                  >
                    <div className="mb-1">{messageContent}</div>
                    {message.reply_to && (
                      <div className="text-sm text-gray-500 mt-1 p-1 bg-gray-100 rounded border-l-2 border-gray-300">
                        {localStrings.Messages.Reply || "Trả lời"}: {message.reply_to.text || message.reply_to.content}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <span>{timeString}</span>
                      {message.isTemporary && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="text-blue-500 flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang gửi...
                          </span>
                        </>
                      )}
                    </div>
                    {!message.isTemporary && (
                      <div className="flex gap-2 mt-2 items-center">
                        <button onClick={() => this.props.setReplyTo(message)} className="text-xs text-blue-500">
                          {localStrings.Messages.Reply || "Trả lời"}
                        </button>
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <img
                      src={this.props.user?.avatar_url || "https://via.placeholder.com/40"}
                      alt="Your avatar"
                      className="w-8 h-8 rounded-full ml-2"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/40";
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      });
  }
  
  render() {
    const { 
      activeConversationId, 
      isLoadingMessages, 
      isCreatingGroup
    } = this.props;
    
    const { showScrollButton } = this.state;
    
    // Create a stable container key based on conversation ID
    const containerKey = `msg-container-${activeConversationId || 'none'}`;
    
    return (
      <div 
        ref={this.messagesContainerRef}
        key={containerKey}
        className="h-full overflow-y-auto relative"
        style={{ willChange: 'transform' }} // GPU acceleration hint
      >
        {!activeConversationId && this.renderNoConversationSelected()}
        {activeConversationId && isLoadingMessages && this.renderLoadingState()}
        {activeConversationId && isCreatingGroup && this.renderCreatingGroup()}
        {activeConversationId && !isLoadingMessages && !isCreatingGroup && this.renderMessages()}
        
        {showScrollButton && (
          <button
            onClick={this.handleScrollButtonClick}
            className="absolute bottom-16 md:bottom-20 md:mb-2 right-6 md:right-12 p-1 md:p-2 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-200"
            title="Cuộn xuống cuối cùng"
          >
            <CiCircleChevDown className="text-xl md:text-2xl text-gray-700" />
          </button>
        )}
      </div>
    );
  }
}

export default StaticConversationMessages;