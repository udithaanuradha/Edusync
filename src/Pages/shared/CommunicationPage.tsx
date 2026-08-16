import React, { useCallback } from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import ChatWindow from "../../components/shared/ChatWindow";
import { useAuth } from "../../context/AuthContext";
import "./CommunicationPage.css";

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

/**
 * Recipient: Defines the data structure for users appearing in the chat list.
 * Includes messaging metadata to show "last message" previews in the UI[cite: 4].
 */
type Recipient = {
  id: number;
  name: string;
  role: string;
  email?: string;
  last_message?: string; // The text content of the most recent exchange[cite: 4]
  last_message_time?: string; // ISO timestamp used for sorting conversations[cite: 4]
};

/**
 * CommunicationPageProps: 'variant' determines which CSS classes and
 * supplementary sidebars (like the SupervisorSidebar) are rendered[cite: 4].
 */
type CommunicationPageProps = {
  variant?: "shared" | "supervisor";
};

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const USER_API_BASE = "http://localhost:5000/api/users";
const ALL_ROLES = ["student", "supervisor", "coordinator", "admin", "mentor"];

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

const CommunicationPage: React.FC<CommunicationPageProps> = ({
  variant = "shared",
}) => {
  // Access current authenticated user context[cite: 4]
  const { user } = useAuth();

  /**
   * getAvailableRecipients
   * Logic: Orchestrates the discovery of users who have an active chat history with the current user[cite: 4].
   *
   * Internal Process:
   * 1. Filter roles based on user permissions (e.g., Students cannot fetch Admins)[cite: 4].
   * 2. Fetch users across all allowed roles in parallel for efficiency[cite: 4].
   * 3. For every found user, verify if a message history exists via the Messages API[cite: 4].
   * 4. Populate the list only with users who have at least one exchanged message[cite: 4].
   */
  const getAvailableRecipients = useCallback(
    async (callback: (recipients: Recipient[]) => void) => {
      // Logic: Exit early if no user is authenticated[cite: 4]
      if (!user) {
        callback([]);
        return;
      }

      try {
        // --- STEP 1: Role Filtering ---
        // Business Rule: Students are restricted from seeing/messaging Admins in the global list[cite: 4].
        const rolesToFetch = ALL_ROLES.filter((role) => {
          if (user?.role === "student" && role === "admin") return false;
          return true;
        });

        // --- STEP 2: Fetch Users ---
        // Logic: Promise.all executes multiple fetch requests concurrently to reduce wait time[cite: 4].
        const responses = await Promise.all(
          rolesToFetch.map((role) =>
            fetch(`${USER_API_BASE}?role=${role}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }),
          ),
        );

        // Logic: Extract JSON and handle varied API response structures (arrays vs nested data)[cite: 4].
        const payloads = await Promise.all(
          responses.map(async (response) => {
            if (!response.ok) return [] as Recipient[];
            const data = await response.json();
            return Array.isArray(data) ? data : data?.data || [];
          }),
        );

        // Logic: Flatten results and filter out the current logged-in user[cite: 4].
        const allUsers = payloads
          .flat()
          .filter((person) => person && person.id !== user.id);

        // Logic: Remove duplicates using a Map in case a user exists in multiple roles[cite: 4].
        const uniqueUsers = Array.from(
          new Map(allUsers.map((item) => [item.id, item])).values(),
        );

        // --- STEP 3: Message History Check ---
        // Logic: Only users with an existing message history should appear in the primary list[cite: 4].
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

              // Logic: Include recipient only if history exists (messages length > 0)[cite: 4].
              if (messages && messages.length > 0) {
                // Extract metadata from the most recent message[cite: 4].
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
            console.error(`Failed to fetch history for user ${person.id}`, err);
            return null;
          }
        });

        // --- STEP 4: Final Cleanup ---
        // Resolve all history checks and filter out any null results[cite: 4].
        const resolvedConversations = await Promise.all(
          activeConversationsPromises,
        );
        const activeRecipients = resolvedConversations.filter(
          (recipient) => recipient !== null,
        ) as Recipient[];

        // Logic: Pass the final curated list back to the ChatWindow UI[cite: 4].
        callback(activeRecipients);
      } catch (error) {
        console.error("Error loading recipients:", error);
        callback([]);
      }
    },
    [user], // Logic: Memoize the function to prevent unnecessary re-renders unless the user changes[cite: 4].
  );

  // --- Render ---
  // Logic: Use the 'variant' prop to toggle between supervisor and general shared layouts[cite: 4].
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
        {/* Conditional Logic: Render SupervisorSidebar only if the variant is set to 'supervisor'[cite: 4]. */}
        {variant === "supervisor" && <SupervisorSidebar />}

        <main
          className={
            variant === "supervisor"
              ? "supervisor-communication-content"
              : "communication-content"
          }
        >
          {/* 
            ChatWindow Component: 
            The getAvailableRecipients logic is passed as a prop, allowing the 
            ChatWindow to trigger the fetching process internally[cite: 4].
          */}
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
