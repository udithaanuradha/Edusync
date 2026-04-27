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
        const responses = await Promise.all(
          ALL_ROLES.map((role) =>
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

        const recipients = payloads
          .flat()
          .filter((person) => person && person.id !== user.id)
          .map((person) => ({
            id: person.id,
            name: person.name,
            role: person.role,
            email: person.email,
          }));

        const uniqueRecipients = Array.from(
          new Map(recipients.map((item) => [item.id, item])).values(),
        );

        callback(uniqueRecipients);
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
