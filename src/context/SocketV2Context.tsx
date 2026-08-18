import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { MessageV2, ReadReceiptPayload } from "../types/chatV2";

interface SocketV2ContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<number>;
  typingUsers: Map<number, boolean>;
  sendMessage: (receiverId: number, messageText: string) => Promise<MessageV2 | null>;
  markConversationAsRead: (senderId: number) => void;
  sendTypingStatus: (receiverId: number, isTyping: boolean) => void;
  subscribeToMessages: (callback: (message: MessageV2) => void) => () => void;
  subscribeToReadReceipts: (callback: (receipt: ReadReceiptPayload) => void) => () => void;
}

const SOCKET_SERVER_URL = "http://localhost:5000";

const SocketV2Context = createContext<SocketV2ContextType | undefined>(undefined);

export const SocketV2Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());

  const messageSubscribersRef = useRef<Set<(message: MessageV2) => void>>(new Set());
  const readReceiptSubscribersRef = useRef<Set<(receipt: ReadReceiptPayload) => void>>(new Set());

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem("token") || localStorage.getItem("jwt") || `mock_jwt_token_${user.id}`;

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        token,
        userId: user.id,
        userRole: user.role,
        userName: user.name,
      },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(`[SocketV2] Connected successfully. Socket ID: ${newSocket.id}`);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`[SocketV2] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.warn(`[SocketV2] Connection error:`, error.message);
      setIsConnected(false);
    });

    newSocket.on("presence:sync", (userIds: number[]) => {
      setOnlineUserIds(new Set(userIds));
    });

    newSocket.on("user:online", ({ userId }: { userId: number }) => {
      setOnlineUserIds((prev) => new Set([...prev, userId]));
    });

    newSocket.on("user:offline", ({ userId }: { userId: number }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    newSocket.on("message:received", (message: MessageV2) => {
      messageSubscribersRef.current.forEach((callback) => callback(message));
    });

    newSocket.on("message:read_receipt", (receipt: ReadReceiptPayload) => {
      readReceiptSubscribersRef.current.forEach((callback) => callback(receipt));
    });

    newSocket.on("typing:update", ({ sender_id, is_typing }: { sender_id: number; is_typing: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (is_typing) {
          next.set(sender_id, true);
        } else {
          next.delete(sender_id);
        }
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const sendMessage = useCallback(
    async (receiverId: number, messageText: string): Promise<MessageV2 | null> => {
      if (!socket || !socket.connected || !user) {
        return null;
      }

      return new Promise((resolve) => {
        socket.emit(
          "message:send",
          { receiver_id: receiverId, message_text: messageText },
          (response: { success: boolean; data?: MessageV2; error?: string }) => {
            if (response && response.success && response.data) {
              resolve(response.data);
            } else {
              console.error("[SocketV2] Failed to send message:", response?.error);
              resolve(null);
            }
          }
        );
      });
    },
    [socket, user]
  );

  const markConversationAsRead = useCallback(
    (senderId: number) => {
      if (!socket || !socket.connected) return;
      socket.emit("message:read", { sender_id: senderId });
    },
    [socket]
  );

  const sendTypingStatus = useCallback(
    (receiverId: number, isTyping: boolean) => {
      if (!socket || !socket.connected) return;
      socket.emit(isTyping ? "typing:start" : "typing:stop", { receiver_id: receiverId });
    },
    [socket]
  );

  const subscribeToMessages = useCallback((callback: (message: MessageV2) => void) => {
    messageSubscribersRef.current.add(callback);
    return () => {
      messageSubscribersRef.current.delete(callback);
    };
  }, []);

  const subscribeToReadReceipts = useCallback((callback: (receipt: ReadReceiptPayload) => void) => {
    readReceiptSubscribersRef.current.add(callback);
    return () => {
      readReceiptSubscribersRef.current.delete(callback);
    };
  }, []);

  return (
    <SocketV2Context.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        typingUsers,
        sendMessage,
        markConversationAsRead,
        sendTypingStatus,
        subscribeToMessages,
        subscribeToReadReceipts,
      }}
    >
      {children}
    </SocketV2Context.Provider>
  );
};

export const useSocketV2 = () => {
  const context = useContext(SocketV2Context);
  if (!context) {
    throw new Error("useSocketV2 must be used within a SocketV2Provider");
  }
  return context;
};
