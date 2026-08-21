import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Send,
  Loader,
  Plus,
  Users,
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
import {
  fetchMyGroupConversationsV2,
  fetchGroupMessagesV2,
  sendGroupMessageV2Rest,
  markGroupConversationReadV2,
} from "../../utils/groupChatApiV2";
import { ConversationV2, MessageV2, UserV2, GroupConversationV2, GroupMessageV2 } from "../../types/chatV2";
import NewConversationModalV2 from "./NewConversationModalV2";
import "./ChatWindowV2.css";

// A group conversation is stored in the same ConversationV2[] list as 1:1
// contacts (keeps the existing card/selection UI as-is), keyed by a
// negative synthetic partner_id (a group conv has no single "partner", and
// this can never collide with a real positive user id). The real backend
// conversation id lives in the groupConversationId extension field.
type GroupConversationExt = {
  isGroupChat: true;
  groupConversationId: number;
  groupConversationType: "supervisor" | "mentor";
  groupName: string;
  level: number;
  memberCount: number;
};

const isGroupConv = (
  c: ConversationV2 | null | undefined
): c is ConversationV2 & GroupConversationExt => Boolean(c && (c as Partial<GroupConversationExt>).isGroupChat);

const toGroupConversationItem = (g: GroupConversationV2): ConversationV2 & GroupConversationExt => ({
  partner_id: -g.conversation_id,
  partner_name: `[Level ${g.level}] ${g.group_name}`,
  partner_role: g.type === "mentor" ? "Mentor Group" : "Supervisor Group",
  last_message_id: 0,
  last_message_text: g.last_message_text || "No messages yet",
  last_message_time: g.last_message_time || "",
  last_sender_id: g.last_sender_id || 0,
  unread_count: g.unread_count,
  isGroupChat: true,
  groupConversationId: g.conversation_id,
  groupConversationType: g.type,
  groupName: g.group_name,
  level: g.level,
  memberCount: g.member_count,
});

// Normalizes a GroupMessageV2 into the MessageV2 shape the existing bubble
// rendering expects, since that rendering is shared between 1:1 and group
// messages. Group chat doesn't have a single-peer read receipt the way 1:1
// does, so read_status here is always false (sent-check only) for now.
const toMessageV2Shape = (gm: GroupMessageV2): MessageV2 => ({
  id: gm.id,
  sender_id: gm.sender_id,
  sender_name: gm.sender_name,
  sender_role: gm.sender_role,
  receiver_id: 0,
  receiver_name: "",
  receiver_role: "",
  message_text: gm.message_text,
  read_status: false,
  created_at: gm.created_at,
});

interface ChatWindowV2Props {
  title?: string;
}

const ChatWindowV2: React.FC<ChatWindowV2Props> = ({ title = "Chat System" }) => {
  const { user } = useAuth();
  const {
    isConnected,
    onlineUserIds,
    typingUsers,
    sendMessage: sendSocketMessage,
    sendTypingStatus,
    markConversationAsRead,
    subscribeToMessages,
    subscribeToReadReceipts,
    sendGroupMessage: sendSocketGroupMessage,
    subscribeToGroupMessages,
  } = useSocketV2();

  const [conversations, setConversations] = useState<ConversationV2[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationV2 | null>(null);
  const [messages, setMessages] = useState<MessageV2[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<string>("assigned_groups");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Loads 1:1 conversations plus every real group conversation (supervisor
  // <->group, mentor<->group) this user belongs to — backend-scoped per
  // role (a mentor only ever gets their 'mentor' conversations back), so no
  // client-side name-matching or role branching is needed here.
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const [directData, groupData] = await Promise.all([
        fetchConversationsV2(user.id),
        fetchMyGroupConversationsV2(user.id),
      ]);

      const groupConvs = groupData.map(toGroupConversationItem);
      const combinedList = [...groupConvs, ...directData].sort(
        (a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
      );

      setConversations(combinedList);
      if (combinedList.length > 0) {
        setSelectedConversation((prev) => {
          if (prev) {
            const stillPresent = combinedList.find((c) => c.partner_id === prev.partner_id);
            if (stillPresent) return stillPresent;
          }
          return prev ?? combinedList[0];
        });
      }
    } catch (err) {
      console.error("[ChatWindowV2] Error loading conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

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
        if (isGroupConv(selectedConversation)) {
          const history = await fetchGroupMessagesV2(selectedConversation.groupConversationId, user.id);
          if (isMounted) setMessages(history.map(toMessageV2Shape));
        } else {
          const history = await fetchMessageHistoryV2(user.id, selectedConversation.partner_id);
          if (isMounted) setMessages(history);
        }

        if (selectedConversation.unread_count > 0) {
          if (isGroupConv(selectedConversation)) {
            markGroupConversationReadV2(selectedConversation.groupConversationId, user.id);
          } else {
            markConversationAsRead(selectedConversation.partner_id);
            markMessagesAsReadV2(selectedConversation.partner_id, user.id);
          }

          setConversations((prev) =>
            prev.map((c) =>
              c.partner_id === selectedConversation.partner_id
                ? { ...c, unread_count: 0 }
                : c
            )
          );
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

  // Subscribe to real-time incoming 1:1 messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((incomingMsg: MessageV2) => {
      const isFromCurrentChat =
        selectedConversation &&
        !isGroupConv(selectedConversation) &&
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

  // Subscribe to real-time incoming group messages (separate event from the
  // 1:1 ones above — a single room emit reaches every group member at once).
  useEffect(() => {
    const unsubscribe = subscribeToGroupMessages((incomingMsg: GroupMessageV2) => {
      const conversationId = incomingMsg.group_conversation_id;
      const isFromCurrentChat =
        isGroupConv(selectedConversation) && selectedConversation.groupConversationId === conversationId;

      if (isFromCurrentChat) {
        setMessages((prev) => [...prev, toMessageV2Shape(incomingMsg)]);
        if (user && incomingMsg.sender_id !== user.id) {
          markGroupConversationReadV2(conversationId, user.id);
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (!isGroupConv(c) || c.groupConversationId !== conversationId) return c;
          return {
            ...c,
            last_message_id: incomingMsg.id,
            last_message_text: incomingMsg.message_text,
            last_message_time: incomingMsg.created_at,
            last_sender_id: incomingMsg.sender_id,
            unread_count:
              isFromCurrentChat || incomingMsg.sender_id === user?.id ? 0 : c.unread_count + 1,
          };
        })
      );
    });

    return () => unsubscribe();
  }, [selectedConversation, user, subscribeToGroupMessages]);

  // Subscribe to read receipts
  useEffect(() => {
    const unsubscribe = subscribeToReadReceipts(({ sender_id }) => {
      if (user && sender_id === user.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === user.id ? { ...m, read_status: true } : m
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

  // Send message via Socket.IO with automatic REST fallback. Group sends
  // are a single call (socket room emit reaches every member), not a
  // per-member loop.
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation || !user || isSending) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      let savedMsg: MessageV2 | null;

      if (isGroupConv(selectedConversation)) {
        const conversationId = selectedConversation.groupConversationId;
        let savedGroupMsg = await sendSocketGroupMessage(conversationId, messageText);
        if (!savedGroupMsg) {
          savedGroupMsg = await sendGroupMessageV2Rest(conversationId, user.id, messageText);
        }
        savedMsg = savedGroupMsg ? toMessageV2Shape(savedGroupMsg) : null;
      } else {
        sendTypingStatus(selectedConversation.partner_id, false);
        savedMsg = await sendSocketMessage(selectedConversation.partner_id, messageText);
        if (!savedMsg) {
          savedMsg = await sendMessageV2(user.id, selectedConversation.partner_id, messageText);
        }
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
    const existingIdx = conversations.findIndex((c) => c.partner_id === newContact.id);

    if (existingIdx >= 0) {
      setSelectedConversation(conversations[existingIdx]);
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

  // Group conversations are already real, backend-provisioned entries in
  // `conversations` (loaded by loadConversations) — picking one from the
  // modal's "My Groups" tab just selects it, nothing to create.
  const handleSelectGroupConversation = (conversationId: number) => {
    const match = conversations.find((c) => isGroupConv(c) && c.groupConversationId === conversationId);
    if (match) {
      setSelectedConversation(match);
      setMessages([]);
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {(user?.role === "supervisor" ||
                user?.role === "lecturer" ||
                user?.role === "mentor" ||
                user?.role === "student") && (
                <button
                  className="assigned-groups-btn-v2"
                  onClick={() => {
                    setModalInitialTab("assigned_groups");
                    setIsModalOpen(true);
                  }}
                  title="View and Message Assigned Group"
                >
                  <Users size={14} />
                  Assigned Group
                </button>
              )}
              <button
                className="new-chat-btn-v2"
                onClick={() => {
                  setModalInitialTab(user?.role === "supervisor" || user?.role === "lecturer" ? "assigned_groups" : "supervisor");
                  setIsModalOpen(true);
                }}
                title="Start new conversation"
              >
                <Plus size={16} />
                New Chat
              </button>
            </div>
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
                    <div
                      className="conversation-avatar-v2"
                      style={isGroupConv(conv) ? { background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" } : {}}
                    >
                      {isGroupConv(conv) ? <Users size={16} /> : conv.partner_name.charAt(0).toUpperCase()}
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
                <div
                  className="conversation-avatar-v2"
                  style={isGroupConv(selectedConversation) ? { background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" } : {}}
                >
                  {isGroupConv(selectedConversation) ? <Users size={18} /> : selectedConversation.partner_name.charAt(0).toUpperCase()}
                  {isPartnerOnline && <span className="avatar-online-badge" />}
                </div>
                <div className="header-partner-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3>{selectedConversation.partner_name}</h3>
                    {isGroupConv(selectedConversation) && (
                      <span style={{ fontSize: "11px", background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                        👥 {selectedConversation.groupConversationType === "mentor" ? "Mentor" : "Supervisor"} Group ({selectedConversation.memberCount} Members)
                      </span>
                    )}
                  </div>
                  <div className={`header-partner-status ${isPartnerOnline ? "online" : ""}`}>
                    {isGroupConv(selectedConversation)
                      ? `Broadcasting messages to all ${selectedConversation.memberCount} group members`
                      : `${isPartnerOnline ? "Online" : "Offline"} • ${selectedConversation.partner_role.replace("_", " ")}`}
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
                        {!isSentByMe && isGroupConv(selectedConversation) && msg.sender_name && (
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", marginBottom: "3px" }}>
                            {msg.sender_name}
                          </div>
                        )}
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
                  className="chat-input-v2"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="send-btn-v2"
                  title="Send message"
                >
                  {isSending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
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
        onSelectGroupConversation={handleSelectGroupConversation}
        initialTab={modalInitialTab}
      />
    </div>
  );
};

export default ChatWindowV2;
