import React, { useCallback } from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import ChatWindow from "../../components/shared/ChatWindow";
import { useAuth } from "../../context/AuthContext";
import '../AdminPages/AdminDashboard.css';
import "../shared/CommunicationPage.css";

type Recipient = {
  id: number;
  name: string;
  role: string;
  email?: string;
  last_message?: string;
  last_message_time?: string;
};

const USER_API_BASE = "http://localhost:5000/api/users";
const ALL_ROLES = ["student", "supervisor", "coordinator", "mentor"];

const AdminCommunicationPage: React.FC = () => {
  const { user } = useAuth();

  const getAvailableRecipients = useCallback(
    async (callback: (recipients: Recipient[]) => void) => {
      if (!user) { callback([]); return; }

      try {
        const responses = await Promise.all(
          ALL_ROLES.map((role) =>
            fetch(`${USER_API_BASE}?role=${role}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            })
          )
        );

        const payloads = await Promise.all(
          responses.map(async (response) => {
            if (!response.ok) return [] as Recipient[];
            const data = await response.json();
            return Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
              ? data.data
              : [];
          })
        );

        const allUsers = payloads
          .flat()
          .filter((person) => person && person.id !== user.id);

        const uniqueUsers = Array.from(
          new Map(allUsers.map((item) => [item.id, item])).values()
        );

        const activeConversationsPromises = uniqueUsers.map(async (person) => {
          try {
            const params = new URLSearchParams({
              sender_id: user.id.toString(),
              receiver_id: person.id.toString(),
            });

            const msgResponse = await fetch(
              `http://localhost:5000/api/messages?${params}`,
              { method: "GET", headers: { "Content-Type": "application/json" } }
            );

            if (msgResponse.ok) {
              const messages = await msgResponse.json();
              if (messages && messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                return {
                  id: person.id,
                  name: person.name,
                  role: person.role,
                  email: person.email,
                  last_message: lastMsg.message_text,
                  last_message_time: lastMsg.created_at,
                };
              }
            }
            return null;
          } catch (err) {
            console.error(`Failed to fetch messages for user ${person.id}`, err);
            return null;
          }
        });

        const resolvedConversations = await Promise.all(activeConversationsPromises);
        const activeRecipients = resolvedConversations.filter(
          (r) => r !== null
        ) as Recipient[];

        callback(activeRecipients);
      } catch (error) {
        console.error("Error loading recipients:", error);
        callback([]);
      }
    },
    [user]
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', padding: '24px', gap: '24px' }}>

          
          <div className="dashboard-header-section" style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            textAlign: 'left',
            marginBottom: '8px',
            flexShrink: 0
          }}>
            <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>
              Message Center 
            </h2>
            <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>
              Manage and monitor all system-wide conversations.
            </p>
          </div>

          
          <div style={{ flex: 1, minHeight: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <ChatWindow
              title="Communication"
              getAvailableRecipients={getAvailableRecipients}
            />
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminCommunicationPage;