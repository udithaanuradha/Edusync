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
  fetchRecipientsV2,
} from "../../utils/apiV2";
import { ConversationV2, MessageV2, UserV2 } from "../../types/chatV2";
import NewConversationModalV2 from "./NewConversationModalV2";
import "./ChatWindowV2.css";

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

  // Load conversations and group by assigned group for supervisors
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const data = await fetchConversationsV2(user.id);

      if (user.role === "supervisor" || user.role === "lecturer") {
        try {
          const token = localStorage.getItem("token") || localStorage.getItem("jwt");
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const [groupsRes, studentsData] = await Promise.all([
            fetch(`http://localhost:5000/api/groupdetailstosupervisordashboard/supervisor/${user.id}`, { headers }),
            fetchRecipientsV2("student", user.id),
          ]);

          if (groupsRes.ok) {
            const assignedGroups = await groupsRes.json();
            if (Array.isArray(assignedGroups) && assignedGroups.length > 0) {
              const processedConversations: ConversationV2[] = [];
              const matchedMemberIds = new Set<number>();

              for (const group of assignedGroups) {
                const memberNames = (group.members || "")
                  .split(",")
                  .map((s: string) => s.trim().toLowerCase())
                  .filter(Boolean);

                const matchedMembers = studentsData.filter((s: UserV2) =>
                  memberNames.some((m: string) => s.name.trim().toLowerCase().includes(m) || m.includes(s.name.trim().toLowerCase()))
                );

                const groupMemberIds = new Set(matchedMembers.map((m: UserV2) => m.id));
                groupMemberIds.forEach((id: number) => matchedMemberIds.add(id));

                const leaderMatch = studentsData.find(
                  (s: UserV2) => s.name.trim().toLowerCase() === (group.leader || "").trim().toLowerCase()
                ) || matchedMembers[0];

                const leaderId = leaderMatch ? leaderMatch.id : (group.groupId || 99999);

                // Find all conversations belonging to any member of this group
                const relatedConvs = data.filter((c) => groupMemberIds.has(c.partner_id));

                if (relatedConvs.length > 0) {
                  const sortedRelated = [...relatedConvs].sort(
                    (a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
                  );
                  const latestConv = sortedRelated[0];
                  const totalUnread = relatedConvs.reduce((sum, c) => sum + (c.unread_count || 0), 0);

                  const groupConv: ConversationV2 = {
                    partner_id: leaderId,
                    partner_name: `[Level ${group.level}] ${group.groupName}`,
                    partner_role: `Level ${group.level} Group`,
                    partner_email: leaderMatch ? leaderMatch.email : `${group.groupName.toLowerCase().replace(/\s+/g, '')}@student.uom.lk`,
                    last_message_id: latestConv.last_message_id,
                    last_message_text: latestConv.last_message_text,
                    last_message_time: latestConv.last_message_time,
                    last_sender_id: latestConv.last_sender_id,
                    unread_count: totalUnread,
                  };
                  (groupConv as any).isGroupChat = true;
                  (groupConv as any).groupMembers = matchedMembers.length > 0 ? matchedMembers : (leaderMatch ? [leaderMatch] : []);
                  (groupConv as any).groupId = group.groupId;
                  (groupConv as any).groupName = group.groupName;
                  (groupConv as any).level = group.level;

                  processedConversations.push(groupConv);
                }
              }

              // Add all other non-group conversations
              const nonGroupConvs = data.filter((c) => !matchedMemberIds.has(c.partner_id));
              const combinedList = [...processedConversations, ...nonGroupConvs].sort(
                (a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
              );

              setConversations(combinedList);
              if (combinedList.length > 0) {
                if (!selectedConversation || !combinedList.some((c) => c.partner_id === selectedConversation.partner_id)) {
                  setSelectedConversation(combinedList[0]);
                } else {
                  const updatedSelected = combinedList.find((c) => c.partner_id === selectedConversation.partner_id);
                  if (updatedSelected) setSelectedConversation(updatedSelected);
                }
              }
              return;
            }
          }
        } catch (groupErr) {
          console.warn("Failed loading assigned groups for conversations:", groupErr);
        }
      }

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
        const groupMembers: UserV2[] = (selectedConversation as any).groupMembers || [];
        if (groupMembers.length > 1) {
          const allHistories = await Promise.all(
            groupMembers.map((m) => fetchMessageHistoryV2(user.id, m.id))
          );
          const merged = allHistories.flat();
          const uniqueMap = new Map();
          merged.forEach((msg) => uniqueMap.set(msg.id, msg));
          const sorted = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          if (isMounted) setMessages(sorted);
        } else {
          const history = await fetchMessageHistoryV2(user.id, selectedConversation.partner_id);
          if (isMounted) setMessages(history);
        }

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
          incomingMsg.receiver_id === selectedConversation.partner_id ||
          ((selectedConversation as any).groupMembers || []).some(
            (m: UserV2) => m.id === incomingMsg.sender_id || m.id === incomingMsg.receiver_id
          ));

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

        const existingIndex = prev.findIndex(
          (c) =>
            c.partner_id === partnerId ||
            ((c as any).groupMembers || []).some((m: UserV2) => m.id === partnerId)
        );

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
    const unsubscribe = subscribeToReadReceipts(({ sender_id }) => {
      if (user && sender_id === user.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === user.id ? { ...m, read_status: 1 } : m
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

  // Send message via Socket.IO with automatic REST fallback and group broadcasting
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

      if (!savedMsg) {
        savedMsg = await sendMessageV2(user.id, selectedConversation.partner_id, messageText);
      }

      // If this conversation is an Assigned Group with multiple student members, broadcast to all other members in parallel
      const groupMembers: UserV2[] = (selectedConversation as any).groupMembers || [];
      if (groupMembers.length > 0) {
        const otherMembers = groupMembers.filter((m) => m.id !== selectedConversation.partner_id && m.id !== user.id);
        if (otherMembers.length > 0) {
          Promise.allSettled(
            otherMembers.map((m) => sendMessageV2(user.id, m.id, messageText))
          ).catch((e) => console.warn("Group broadcast error:", e));
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

  const handleSelectUserFromModal = (
    newContact: UserV2 & { groupMembers?: UserV2[]; isGroupChat?: boolean; groupName?: string; level?: number }
  ) => {
    const existingIdx = conversations.findIndex((c) => c.partner_id === newContact.id);
    const displayName = newContact.groupName
      ? `[Level ${newContact.level || 2}] ${newContact.groupName}`
      : newContact.name;

    if (existingIdx >= 0) {
      const existing = conversations[existingIdx];
      const updated: ConversationV2 = {
        ...existing,
        partner_name: displayName,
      };
      if (newContact.groupMembers) {
        (updated as any).groupMembers = newContact.groupMembers;
        (updated as any).isGroupChat = true;
        (updated as any).groupName = newContact.groupName;
        (updated as any).level = newContact.level;
      }
      setConversations((prev) => prev.map((c, idx) => (idx === existingIdx ? updated : c)));
      setSelectedConversation(updated);
    } else {
      const newConv: ConversationV2 = {
        partner_id: newContact.id,
        partner_name: displayName,
        partner_role: newContact.role,
        partner_email: newContact.email,
        last_message_id: 0,
        last_message_text: "New conversation",
        last_message_time: new Date().toISOString(),
        last_sender_id: user?.id || 0,
        unread_count: 0,
      };
      if (newContact.groupMembers) {
        (newConv as any).groupMembers = newContact.groupMembers;
        (newConv as any).isGroupChat = true;
        (newConv as any).groupName = newContact.groupName;
        (newConv as any).level = newContact.level;
      }
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {(user?.role === "supervisor" || user?.role === "lecturer") && (
                <button
                  className="assigned-groups-btn-v2"
                  onClick={() => {
                    setModalInitialTab("assigned_groups");
                    setIsModalOpen(true);
                  }}
                  title="View and Message Assigned Groups"
                >
                  <Users size={14} />
                  Assigned Groups
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
                      style={(conv as any).isGroupChat ? { background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" } : {}}
                    >
                      {(conv as any).isGroupChat ? <Users size={16} /> : conv.partner_name.charAt(0).toUpperCase()}
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
                  style={(selectedConversation as any).isGroupChat ? { background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" } : {}}
                >
                  {(selectedConversation as any).isGroupChat ? <Users size={18} /> : selectedConversation.partner_name.charAt(0).toUpperCase()}
                  {isPartnerOnline && <span className="avatar-online-badge" />}
                </div>
                <div className="header-partner-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3>{selectedConversation.partner_name}</h3>
                    {(selectedConversation as any).isGroupChat && (
                      <span style={{ fontSize: "11px", background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                        👥 Group Broadcast ({(selectedConversation as any).groupMembers?.length || 5} Students)
                      </span>
                    )}
                  </div>
                  <div className={`header-partner-status ${isPartnerOnline ? "online" : ""}`}>
                    {(selectedConversation as any).isGroupChat
                      ? `Broadcasting messages to all ${(selectedConversation as any).groupMembers?.length || 5} group members`
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
                        {!isSentByMe && (selectedConversation as any).isGroupChat && msg.sender_name && (
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
        initialTab={modalInitialTab}
      />
    </div>
  );
};

export default ChatWindowV2;
