import React, { useCallback } from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import ChatWindow from "../../components/shared/ChatWindow";
import { useAuth } from "../../context/AuthContext";
import "./CommunicationPage.css";

type Recipient = {
  id: number;
  name: string;
  role: string;
  email?: string;
  last_message?: string;
  last_message_time?: string;
};

type CommunicationPageProps = {
  variant?: "shared" | "supervisor";
};

const USER_API_BASE = "http://localhost:5000/api/users";
const ALL_ROLES = ["student", "supervisor", "coordinator", "admin", "mentor"];

const CommunicationPage: React.FC<CommunicationPageProps> = ({
  variant = "shared",
}) => {
  const { user } = useAuth();

  const getAvailableRecipients = useCallback(
    async (callback: (recipients: Recipient[]) => void) => {
      if (!user) {
        callback([]);
        return;
      }

      try {
        // 1. Filter out the 'admin' role from the fetch queue if the user is a student
        const rolesToFetch = ALL_ROLES.filter((role) => {
          if (user?.role === "student" && role === "admin") return false;
          return true;
        });

        // 2. Fetch all permitted users across roles
        const responses = await Promise.all(
          rolesToFetch.map((role) =>
            fetch(`${USER_API_BASE}?role=${role}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }),
          ),
        );

        const payloads = await Promise.all(
          responses.map(async (response) => {
            if (!response.ok) {
              return [] as Recipient[];
            }

            const data = await response.json();
            return Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
                ? data.data
                : [];
          }),
        );

        const allUsers = payloads
          .flat()
          .filter((person) => person && person.id !== user.id);

        const uniqueUsers = Array.from(
          new Map(allUsers.map((item) => [item.id, item])).values(),
        );

        // 3. Filter down to ONLY users who have a message history
        const activeConversationsPromises = uniqueUsers.map(async (person) => {
          try {
            const params = new URLSearchParams({
              sender_id: user.id.toString(),
              receiver_id: person.id.toString(),
            });

            const msgResponse = await fetch(
              `http://localhost:5000/api/messages?${params}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              },
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
            console.error(
              `Failed to fetch messages for user ${person.id}`,
              err,
            );
            return null;
          }
        });

        // 4. Wait for all checks to finish and filter out the nulls
        const resolvedConversations = await Promise.all(
          activeConversationsPromises,
        );
        const activeRecipients = resolvedConversations.filter(
          (recipient) => recipient !== null,
        ) as Recipient[];

        // 5. Send the filtered list to the chat window
        callback(activeRecipients);
      } catch (error) {
        console.error("Error loading recipients:", error);
        callback([]);
      }
    },
    [user],
  );

  return (
    <div
      className={
        variant === "supervisor"
          ? "supervisor-communication-page"
          : "communication-layout"
      }
    >
      <Header />
      <div
        className={
          variant === "supervisor"
            ? "supervisor-communication-layout"
            : "communication-main"
        }
      >
        <Sidebar />
        {variant === "supervisor" && <SupervisorSidebar />}
        <main
          className={
            variant === "supervisor"
              ? "supervisor-communication-content"
              : "communication-content"
          }
        >
          <ChatWindow
            title="Communication"
            getAvailableRecipients={getAvailableRecipients}
          />
        </main>
      </div>
    </div>
  );
};

export default CommunicationPage;
