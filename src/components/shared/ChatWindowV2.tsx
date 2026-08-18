import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Send,
  Loader,
  Plus,
  Check,
  CheckCheck,
  MessageSquare,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocketV2 } from "../../hooks/useSocketV2";
import {
  fetchConversationsV2,
  fetchMessageHistoryV2,
  sendMessageV2,
  markMessagesAsReadV2,
} from "../../utils/apiV2";
import { ConversationV2, MessageV2, UserV2 } from "../../types/chatV2";
import NewConversationModalV2 from "./NewConversationModalV2";
import "./ChatWindowV2.css";

interface ChatWindowV2Props {
  title?: string;
}

const ChatWindowV2: React.FC<ChatWindowV2Props> = ({ title = "Real-Time Messages (V2)" }) => {
  const { user } = useAuth();
  const {
    isConnected,
    onlineUserIds,
    typingUsers,
    sendMessage: sendSocketMessage,
    markConversationAsRead,
    sendTypingStatus,
    subscribeToMessages,
    subscribeToReadReceipts,
  } = useSocketV2();

  const [conversations, setConversations] = useState<ConversationV2[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationV2 | null>(null);
  const [messages, setMessages] = useState<MessageV2[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations once using optimized single SQL query (O(1) request)
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const data = await fetchConversationsV2(user.id);
      setConversations(data);

      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      console.error("[ChatWindowV2] Error loading conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, selectedConversation]);

  useEffect(() => {
    loadConversations();
  }, [user]);

  // Load message history when active conversation changes
  useEffect(() => {
    if (!selectedConversation || !user) return;

    let isMounted = true;
    const loadHistory = async () => {
      try {
        setLoadingMessages(true);
        const history = await fetchMessageHistoryV2(user.id, selectedConversation.partner_id);
        if (isMounted) {
          setMessages(history);

          if (selectedConversation.unread_count > 0) {
            markConversationAsRead(selectedConversation.partner_id);
            markMessagesAsReadV2(selectedConversation.partner_id, user.id);

            setConversations((prev) =>
              prev.map((c) =>
                c.partner_id === selectedConversation.partner_id
                  ? { ...c, unread_count: 0 }
                  : c
              )
            );
          }
        }
      } catch (err) {
        console.error("[ChatWindowV2] Error loading history:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedConversation, user, markConversationAsRead]);

  // Subscribe to real-time incoming messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((incomingMsg: MessageV2) => {
      const isFromCurrentChat =
        selectedConversation &&
        (incomingMsg.sender_id === selectedConversation.partner_id ||
          incomingMsg.receiver_id === selectedConversation.partner_id);

      if (isFromCurrentChat) {
        setMessages((prev) => [...prev, incomingMsg]);

        if (user && incomingMsg.sender_id === selectedConversation.partner_id) {
          markConversationAsRead(incomingMsg.sender_id);
          markMessagesAsReadV2(incomingMsg.sender_id, user.id);
        }
      }

      setConversations((prev) => {
        const partnerId =
          incomingMsg.sender_id === user?.id
            ? incomingMsg.receiver_id
            : incomingMsg.sender_id;

        const partnerName =
          incomingMsg.sender_id === user?.id
            ? incomingMsg.receiver_name
            : incomingMsg.sender_name;

        const partnerRole =
          incomingMsg.sender_id === user?.id
            ? incomingMsg.receiver_role
            : incomingMsg.sender_role;

        const existingIndex = prev.findIndex((c) => c.partner_id === partnerId);

        let updatedConv: ConversationV2;
        if (existingIndex >= 0) {
          const old = prev[existingIndex];
          updatedConv = {
            ...old,
            last_message_id: incomingMsg.id,
            last_message_text: incomingMsg.message_text,
            last_message_time: incomingMsg.created_at,
            last_sender_id: incomingMsg.sender_id,
            unread_count:
              isFromCurrentChat || incomingMsg.sender_id === user?.id
                ? 0
                : old.unread_count + 1,
          };
          const rest = prev.filter((_, idx) => idx !== existingIndex);
          return [updatedConv, ...rest];
        } else {
          updatedConv = {
            partner_id: partnerId,
            partner_name: partnerName,
            partner_role: partnerRole,
            last_message_id: incomingMsg.id,
            last_message_text: incomingMsg.message_text,
            last_message_time: incomingMsg.created_at,
            last_sender_id: incomingMsg.sender_id,
            unread_count: incomingMsg.sender_id === user?.id ? 0 : 1,
          };
          return [updatedConv, ...prev];
        }
      });
    });

    return () => unsubscribe();
  }, [selectedConversation, user, subscribeToMessages, markConversationAsRead]);

  // Subscribe to read receipts
  useEffect(() => {
    const unsubscribe = subscribeToReadReceipts(({ sender_id, reader_id }) => {
      if (user && sender_id === user.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender_id === user.id && msg.receiver_id === reader_id
              ? { ...msg, read_status: true }
              : msg
          )
        );
      }
    });

    return () => unsubscribe();
  }, [user, subscribeToReadReceipts]);

  // Typing event handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!selectedConversation) return;

    sendTypingStatus(selectedConversation.partner_id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(selectedConversation.partner_id, false);
    }, 2000);
  };

  // Send message via Socket.IO with automatic REST fallback
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation || !user || isSending) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(selectedConversation.partner_id, false);

    try {
      let savedMsg = await sendSocketMessage(selectedConversation.partner_id, messageText);

      // Fallback to REST API if Socket.IO didn't acknowledge
      if (!savedMsg) {
        savedMsg = await sendMessageV2(user.id, selectedConversation.partner_id, messageText);
      }

      if (savedMsg) {
        setMessages((prev) => [...prev, savedMsg!]);
        setConversations((prev) => {
          const partnerId = selectedConversation.partner_id;
          const exists = prev.some((c) => c.partner_id === partnerId);
          if (exists) {
            return prev.map((c) =>
              c.partner_id === partnerId
                ? {
                    ...c,
                    last_message_id: savedMsg!.id,
                    last_message_text: savedMsg!.message_text,
                    last_message_time: savedMsg!.created_at,
                    last_sender_id: user.id,
                  }
                : c
            );
          } else {
            return [
              {
                ...selectedConversation,
                last_message_id: savedMsg!.id,
                last_message_text: savedMsg!.message_text,
                last_message_time: savedMsg!.created_at,
                last_sender_id: user.id,
                unread_count: 0,
              },
              ...prev,
            ];
          }
        });
      }
    } catch (err) {
      console.error("[ChatWindowV2] Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectUserFromModal = (newContact: UserV2) => {
    const existing = conversations.find((c) => c.partner_id === newContact.id);
    if (existing) {
      setSelectedConversation(existing);
    } else {
      const newConv: ConversationV2 = {
        partner_id: newContact.id,
        partner_name: newContact.name,
        partner_role: newContact.role,
        partner_email: newContact.email,
        last_message_id: 0,
        last_message_text: "New conversation",
        last_message_time: new Date().toISOString(),
        last_sender_id: user?.id || 0,
        unread_count: 0,
      };
      setConversations((prev) => [newConv, ...prev]);
      setSelectedConversation(newConv);
    }
    setMessages([]);
  };

  const isPartnerTyping =
    selectedConversation && !!typingUsers.get(selectedConversation.partner_id);

  const isPartnerOnline =
    selectedConversation && onlineUserIds.has(selectedConversation.partner_id);

  return (
    <div className="chat-window-v2">
      <div className="chat-header-v2">
        <h2>{title}</h2>
        <div className={`chat-connection-status ${isConnected ? "connected" : "disconnected"}`}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="status-dot" />
          {isConnected ? "Real-time Connected" : "Connecting..."}
        </div>
      </div>

      <div className="chat-container-v2">
        <div className="conversations-sidebar-v2">
          <div className="conversations-header-v2">
            <h3>Conversations ({conversations.length})</h3>
            <button
              className="new-chat-btn-v2"
              onClick={() => setIsModalOpen(true)}
              title="Start new conversation"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="conversations-list-v2">
            {loadingConversations ? (
              <div className="chat-empty-state-v2">
                <Loader size={24} className="spinner" />
                <p>Loading chats...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty-state-v2">
                <MessageSquare size={32} />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isOnline = onlineUserIds.has(conv.partner_id);
                const isActive = selectedConversation?.partner_id === conv.partner_id;

                return (
                  <div
                    key={conv.partner_id}
                    className={`conversation-card-v2 ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="conversation-avatar-v2">
                      {conv.partner_name.charAt(0).toUpperCase()}
                      {isOnline && <span className="avatar-online-badge" />}
                    </div>

                    <div className="conversation-content-v2">
                      <div className="conversation-top-row">
                        <span className="partner-name-v2">{conv.partner_name}</span>
                        <span className="partner-time-v2">
                          {conv.last_message_time
                            ? new Date(conv.last_message_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <div className="conversation-bottom-row">
                        <span className="last-msg-preview-v2">
                          {conv.last_sender_id === user?.id && "You: "}
                          {conv.last_message_text}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="unread-badge-v2">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="chat-main-v2">
          {selectedConversation ? (
            <>
              <div className="chat-partner-header-v2">
                <div className="conversation-avatar-v2">
                  {selectedConversation.partner_name.charAt(0).toUpperCase()}
                  {isPartnerOnline && <span className="avatar-online-badge" />}
                </div>
                <div className="header-partner-details">
                  <h3>{selectedConversation.partner_name}</h3>
                  <div className={`header-partner-status ${isPartnerOnline ? "online" : ""}`}>
                    {isPartnerOnline ? "Online" : "Offline"} •{" "}
                    {selectedConversation.partner_role.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="messages-stream-v2">
                {loadingMessages ? (
                  <div className="chat-empty-state-v2">
                    <Loader size={24} className="spinner" />
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-state-v2">
                    <MessageSquare size={36} />
                    <p>Say hello to {selectedConversation.partner_name}!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSentByMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-v2 ${isSentByMe ? "sent" : "received"}`}
                      >
                        <div className="bubble-content-v2">{msg.message_text}</div>
                        <div className="bubble-meta-v2">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isSentByMe && (
                            <span className={`receipt-icon ${msg.read_status ? "read" : ""}`}>
                              {msg.read_status ? <CheckCheck size={14} /> : <Check size={14} />}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {isPartnerTyping && (
                <div className="typing-indicator-bar-v2">
                  <span>{selectedConversation.partner_name} is typing</span>
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              <form className="chat-input-box-v2" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  className="chat-input-v2"
                  disabled={isSending}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className={`send-btn-v2 ${inputText.trim() ? "active" : "inactive"}`}
                  title="Send message"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader size={18} className="spinner" />
                  ) : (
                    <Send size={18} strokeWidth={2.2} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state-v2">
              <MessageSquare size={48} />
              <p>Select a conversation from the left to start chatting</p>
            </div>
          )}
        </div>
      </div>

      <NewConversationModalV2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleSelectUserFromModal}
      />
    </div>
  );
};

export default ChatWindowV2;
