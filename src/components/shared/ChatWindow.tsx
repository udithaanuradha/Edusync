import React, { useEffect, useState, useRef, useCallback } from "react";
import { Send, Loader, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NewConversationModal from "./NewConversationModal";
import "./ChatWindow.css";

/**
 * TYPE DEFINITIONS
 */
type Message = {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  receiver_id: number;
  receiver_name: string;
  receiver_role: string;
  message_text: string;
  created_at: string;
  read_status?: boolean;
};

type Recipient = {
  id: number;
  name: string;
  role: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
};

interface ChatWindowProps {
  title?: string;
  // logic: function passed from parent to fetch list of active chat partners[cite: 4]
  getAvailableRecipients: (callback: (recipients: Recipient[]) => void) => void;
}

const API_BASE = "http://localhost:5000/api/messages";

const ChatWindow: React.FC<ChatWindowProps> = ({
  title = "Messages",
  getAvailableRecipients,
}) => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // logic: reference to the end of the message list for auto-scrolling[cite: 4]
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * function: scrollToBottom
   * logic: smoothly scrolls the message container to the most recent message[cite: 4]
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * trigger: scroll on message update
   * logic: ensures the user sees the new message immediately[cite: 4]
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * trigger: load active conversations
   * logic: populates the sidebar and auto-selects the first chat if available[cite: 4]
   */
  useEffect(() => {
    const loadRecipients = async () => {
      try {
        setLoading(true);
        getAvailableRecipients((data) => {
          setRecipients(data);
          if (data.length > 0 && !selectedRecipient) {
            setSelectedRecipient(data[0]);
          }
        });
      } catch (error) {
        console.error("Error loading recipients:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipients();
  }, [getAvailableRecipients, selectedRecipient]);

  /**
   * function: fetchMessages
   * logic: retrieves conversation history between current user and selected recipient[cite: 4]
   * utilizes URLSearchParams for clean query string construction[cite: 4]
   */
  const fetchMessages = useCallback(
    async (isManualRefresh = false) => {
      if (!selectedRecipient || !user) return;

      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({
          sender_id: user.id.toString(),
          receiver_id: selectedRecipient.id.toString(),
        });

        const response = await fetch(`${API_BASE}?${params}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedRecipient, user],
  );

  /**
   * trigger: load messages on recipient change
   * logic: automatically refreshes the chat thread when the user clicks a different person[cite: 4]
   */
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /**
   * function: handleSendMessage
   * logic: validates input, sends POST request, and updates UI state[cite: 4, 5]
   * also triggers a sidebar refresh to update the "last message" preview[cite: 4]
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    // guard logic: prevent empty messages or double sending[cite: 4]
    if (!newMessage.trim() || !selectedRecipient || !user || sending) return;

    try {
      setSending(true);
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: user.id,
          sender_name: user.name,
          sender_role: user.role,
          receiver_id: selectedRecipient.id,
          receiver_name: selectedRecipient.name,
          receiver_role: selectedRecipient.role,
          message_text: newMessage,
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        // logic: optimistic update of the local message list[cite: 4]
        setMessages([...messages, newMsg]);
        setNewMessage("");

        // logic: update sidebar to reflect the latest message sent[cite: 4]
        getAvailableRecipients((updatedRecipients) => {
          setRecipients(updatedRecipients);
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  /**
   * function: handleSelectUserFromModal
   * logic: processes user selection from the "New Conversation" modal[cite: 4]
   * checks for existing entries to avoid list duplication[cite: 4]
   */
  const handleSelectUserFromModal = (selectedUser: Recipient) => {
    const newRecipient: Recipient = {
      id: selectedUser.id,
      name: selectedUser.name,
      role: selectedUser.role,
    };

    const existingRecipient = recipients.find((r) => r.id === newRecipient.id);

    if (existingRecipient) {
      // logic: just switch to the chat if it already exists[cite: 4]
      setSelectedRecipient(existingRecipient);
    } else {
      // logic: add a temporary entry to the list until a message is sent[cite: 4]
      setRecipients([...recipients, newRecipient]);
      setSelectedRecipient(newRecipient);
    }

    setIsModalOpen(false);
  };

  /**
   * logic: initial full-screen loading state[cite: 4]
   */
  if (loading && recipients.length === 0) {
    return (
      <div className="chat-window">
        <div className="chat-loading">
          <Loader size={32} className="spinner" />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>{title}</h2>
      </div>

      <div className="chat-container">
        {/* Recipients Panel: Sidebar for selecting conversations[cite: 4] */}
        <div className="recipients-panel">
          <div className="recipients-header">
            <h3>Conversations</h3>
            <button
              className="new-conversation-btn"
              onClick={() => setIsModalOpen(true)}
              title="Start new conversation"
            >
              <Plus size={18} />
            </button>
            <span className="recipient-count">{recipients.length}</span>
          </div>
          <div className="recipients-list">
            {recipients.length === 0 ? (
              <div className="no-recipients">No recipients available</div>
            ) : (
              recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className={`recipient-item ${selectedRecipient?.id === recipient.id ? "active" : ""}`}
                  onClick={() => setSelectedRecipient(recipient)}
                >
                  <div className="recipient-avatar">
                    {recipient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="recipient-info">
                    <div className="recipient-name">{recipient.name}</div>
                    <div className="recipient-role">{recipient.role}</div>
                    {/* logic: truncate long message previews in sidebar[cite: 4] */}
                    {recipient.last_message && (
                      <div className="recipient-last-message">
                        {recipient.last_message.substring(0, 40)}...
                      </div>
                    )}
                  </div>
                  {/* logic: badge to show unread notification count[cite: 4] */}
                  {recipient.unread_count && recipient.unread_count > 0 && (
                    <div className="unread-badge">{recipient.unread_count}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel: Main chat thread display[cite: 4] */}
        <div className="messages-panel">
          {selectedRecipient ? (
            <>
              <div className="messages-header">
                <div className="recipient-avatar-large">
                  {selectedRecipient.name.charAt(0).toUpperCase()}
                </div>
                <div className="recipient-info-large">
                  <h3>{selectedRecipient.name}</h3>
                  <p>{selectedRecipient.role}</p>
                </div>
                {/* Manual refresh button for the specific thread[cite: 4] */}
                <button
                  className="refresh-messages-btn"
                  onClick={() => fetchMessages(true)}
                  disabled={isRefreshing}
                  title="Refresh messages"
                >
                  <RefreshCw
                    size={20}
                    className={isRefreshing ? "spinner" : ""}
                  />
                </button>
              </div>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    /* logic: CSS class toggle to differentiate sent/received messages[cite: 4] */
                    <div
                      key={msg.id}
                      className={`message ${msg.sender_id === user?.id ? "sent" : "received"}`}
                    >
                      <div className="message-content">
                        <p className="message-text">{msg.message_text}</p>
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {/* ref: element used as a target for auto-scrolling[cite: 4] */}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form[cite: 4] */}
              <form className="message-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="message-input"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="send-button"
                >
                  {sending ? (
                    <Loader size={18} className="spinner" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </>
          ) : (
            /* logic: placeholder view when no conversation is active[cite: 4] */
            <div className="no-recipient-selected">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Logic: Overlay modal for finding new users to chat with[cite: 4] */}
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleSelectUserFromModal}
      />
    </div>
  );
};

export default ChatWindow;
