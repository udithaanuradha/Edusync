import React, { useEffect, useState, useRef } from "react";
import { Send, Loader, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NewConversationModal from "./NewConversationModal";
import "./ChatWindow.css";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load available recipients
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

  // Load messages for selected recipient
  useEffect(() => {
    if (!selectedRecipient || !user) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
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
      }
    };

    loadMessages();
  }, [selectedRecipient, user]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setMessages([...messages, newMsg]);
        setNewMessage("");

        // Refresh recipients to update last message
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

  // Handle new conversation - user selected from modal
  const handleSelectUserFromModal = (selectedUser: Recipient) => {
    // Create or switch to conversation with selected user
    const newRecipient: Recipient = {
      id: selectedUser.id,
      name: selectedUser.name,
      role: selectedUser.role,
    };

    // Check if recipient already exists in list
    const existingRecipient = recipients.find((r) => r.id === newRecipient.id);

    if (existingRecipient) {
      setSelectedRecipient(existingRecipient);
    } else {
      // Add new recipient to the list
      setRecipients([...recipients, newRecipient]);
      setSelectedRecipient(newRecipient);
    }

    setIsModalOpen(false);
  };

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
        {/* Recipients List */}
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
                    {recipient.last_message && (
                      <div className="recipient-last-message">
                        {recipient.last_message.substring(0, 40)}...
                      </div>
                    )}
                  </div>
                  {recipient.unread_count && recipient.unread_count > 0 && (
                    <div className="unread-badge">{recipient.unread_count}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
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
              </div>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
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
                <div ref={messagesEndRef} />
              </div>

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
            <div className="no-recipient-selected">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleSelectUserFromModal}
      />
    </div>
  );
};

export default ChatWindow;
