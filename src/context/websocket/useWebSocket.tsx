// "use client";

// import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
// import { ApiPath } from "@/api/ApiPath";
// import { useAuth } from '../auth/useAuth';
// import { MessageWebSocketResponseModel } from '@/api/features/messages/models/MessageModel';
// import { WebSocketContextType } from './webSocketContextType';

// const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// export const WebSocketMessageProvider = ({ children }: { children: ReactNode }) => {
//   const { user } = useAuth();
//   const [isConnected, setIsConnected] = useState(false);
//   const [socketMessages, setSocketMessages] = useState<MessageWebSocketResponseModel[]>([]);
  
//   const wsRef = useRef<WebSocket | null>(null);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const visibilityChangeHandled = useRef(false);

//   useEffect(() => {
//     if (!user?.id) {
//       return;
//     }

//     const connectWebSocket = () => {
//       try {
//         if (wsRef.current) {
//           wsRef.current.close();
//         }

//         const wsUrl = `${ApiPath.GET_WS_PATH_MESSAGE}${user.id}`;
        
//         const ws = new WebSocket(wsUrl);
        
//         ws.onopen = () => {
//           setIsConnected(true);
//           console.log("🔗 WebSocket Message connected");
//           if (pingIntervalRef.current) {
//             clearInterval(pingIntervalRef.current);
//           }
          
//           pingIntervalRef.current = setInterval(() => {
//             if (ws.readyState === WebSocket.OPEN) {
//               try {
//                 ws.send(JSON.stringify({ type: "ping" }));
//               } catch (err) {
//                 console.error("Error sending ping:", err);
//               }
//             }
//           }, 30000);
//         };
        
//         ws.onmessage = (event) => {
//           try {
//             if (event.data === "pong" || (typeof event.data === "string" && event.data.includes("pong"))) {
//               return;
//             }
            
//             const data = JSON.parse(event.data);
            
//             if (!data) {
//               return;
//             }
            
//             if (data.type === "message") {
//               const message = data.data;
//               setSocketMessages(prev => [...prev, message]);
//             } else if (data.type === "new_conversation") {
//               window.dispatchEvent(new CustomEvent('new_conversation', { 
//                 detail: data.conversation 
//               }));
//             } else {
//               setSocketMessages(prev => [...prev, data]);
//             }
//           } catch (error) {
//             console.error("Error processing WebSocket message:", error);
//           }
//         };
        
//         ws.onerror = (error) => {
//           console.error("WebSocket Error:", error);
//           setIsConnected(false);
//         };
        
//         ws.onclose = (event) => {
//           setIsConnected(false);
//           console.log("WebSocket connection closed:", event.code);
          
//           if (pingIntervalRef.current) {
//             clearInterval(pingIntervalRef.current);
//             pingIntervalRef.current = null;
//           }
          
//           if (event.code !== 1000) {
//             if (reconnectTimeoutRef.current) {
//               clearTimeout(reconnectTimeoutRef.current);
//             }
            
//             reconnectTimeoutRef.current = setTimeout(() => {
//               connectWebSocket();
//             }, 5000);
//           }
//         };
        
//         wsRef.current = ws;
//       } catch (error) {
//         console.error("Error establishing WebSocket connection:", error);
//         setIsConnected(false);
//       }
//     };
    
//     connectWebSocket();
    
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible') {
//         if (wsRef.current?.readyState !== WebSocket.OPEN) {
//           connectWebSocket();
//         }
//       }
//     };
    
//     if (!visibilityChangeHandled.current) {
//       document.addEventListener('visibilitychange', handleVisibilityChange);
//       visibilityChangeHandled.current = true;
//     }
    
//     return () => {
//       if (wsRef.current) {
//         wsRef.current.close(1000, "Component unmounting");
//       }
      
//       if (pingIntervalRef.current) {
//         clearInterval(pingIntervalRef.current);
//       }
      
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
      
//       if (visibilityChangeHandled.current) {
//         document.removeEventListener('visibilitychange', handleVisibilityChange);
//         visibilityChangeHandled.current = false;
//       }
//     };
//   }, [user?.id]);

//   const sendMessage = (message: any) => {
//     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
//       return false;
//     }
    
//     try {
//       wsRef.current.send(JSON.stringify(message));
//       return true;
//     } catch (error) {
//       console.error("Error sending message via WebSocket:", error);
//       return false;
//     }
//   };

//   const clearMessages = () => {
//     setSocketMessages([]);
//   };

//   const contextValue: WebSocketContextType = {
//     isConnected,
//     socketMessages,
//     sendMessage,
//     clearMessages
//   };

//   return (
//     <WebSocketContext.Provider value={contextValue}>
//       {children}
//     </WebSocketContext.Provider>
//   );
// };

// export const useWebSocket = (): WebSocketContextType => {
//   const context = useContext(WebSocketContext);
//   if (context === undefined) {
//     throw new Error("useWebSocket must be used within a WebSocketProvider");
//   }
//   return context;
// };