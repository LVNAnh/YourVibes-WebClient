/**
 * WebSocketService.ts
 * A service to manage WebSocket connections for real-time messaging
 */

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface WebSocketMessage {
  type: string;
  conversation_id?: string;
  message?: any;
  [key: string]: any;
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private statusHandlers: ((status: WebSocketStatus) => void)[] = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private apiEndpoint: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Get the singleton instance of WebSocketService
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  /**
   * Initialize the WebSocket connection
   * @param userId User ID to connect with
   * @param apiEndpoint API endpoint for WebSocket connection
   */
  public initialize(userId: string, apiEndpoint: string): void {
    this.userId = userId;
    this.apiEndpoint = apiEndpoint;
    
    // Reset reconnect attempts on new initialization
    this.reconnectAttempts = 0;
    
    // Connect to the WebSocket server
    this.connect();
  }
  
  /**
   * Connect to the WebSocket server
   */
  private connect(): void {
    if (!this.userId || !this.apiEndpoint) {
      console.error("Cannot connect: userId or apiEndpoint is missing");
      this.updateStatus('ERROR');
      return;
    }
    
    // Close any existing connection
    this.disconnect();
    
    try {
      this.updateStatus('CONNECTING');
      
      const wsUrl = this.apiEndpoint.replace("http", "ws") + 
                    `/v1/2024/messages/ws/${this.userId}`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      this.updateStatus('ERROR');
      this.attemptReconnect();
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      // Remove event listeners
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      
      // Close the connection
      if (this.socket.readyState === WebSocket.OPEN || 
          this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.updateStatus('DISCONNECTED');
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log("WebSocket connection established");
    this.updateStatus('CONNECTED');
    this.reconnectAttempts = 0;
    
    // Set up ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // 30 seconds
  }
  
  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      
      // Notify all message handlers
      this.messageHandlers.forEach(handler => handler(data));
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error("WebSocket error:", event);
    this.updateStatus('ERROR');
    this.attemptReconnect();
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log("WebSocket connection closed:", event.code, event.reason);
    this.updateStatus('DISCONNECTED');
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.attemptReconnect();
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Maximum reconnect attempts reached");
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  /**
   * Send a ping message to keep the connection alive
   */
  private sendPing(): void {
    this.send({ type: "ping" });
  }
  
  /**
   * Send a message to the WebSocket server
   * @param message Message to send
   */
  public send(message: WebSocketMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket is not open");
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      return false;
    }
  }
  
  /**
   * Subscribe to a conversation to receive its messages
   * @param conversationId Conversation ID to subscribe to
   */
  public subscribeToConversation(conversationId: string): boolean {
    return this.send({
      type: "subscribe",
      conversation_id: conversationId
    });
  }
  
  /**
   * Unsubscribe from a conversation
   * @param conversationId Conversation ID to unsubscribe from
   */
  public unsubscribeFromConversation(conversationId: string): boolean {
    return this.send({
      type: "unsubscribe",
      conversation_id: conversationId
    });
  }
  
  /**
   * Add a message handler
   * @param handler Function to handle incoming messages
   */
  public addMessageHandler(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
  }
  
  /**
   * Remove a message handler
   * @param handler Function to remove
   */
  public removeMessageHandler(handler: (message: any) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
  
  /**
   * Add a status handler
   * @param handler Function to handle status changes
   */
  public addStatusHandler(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers.push(handler);
  }
  
  /**
   * Remove a status handler
   * @param handler Function to remove
   */
  public removeStatusHandler(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
  }
  
  /**
   * Update the connection status and notify handlers
   * @param status New status
   */
  private updateStatus(status: WebSocketStatus): void {
    this.statusHandlers.forEach(handler => handler(status));
  }
  
  /**
   * Get the current connection status
   */
  public getStatus(): WebSocketStatus {
    if (!this.socket) {
      return 'DISCONNECTED';
    }
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
      default:
        return 'DISCONNECTED';
    }
  }
}

export default WebSocketService;