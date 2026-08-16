import React, { useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AnnouncementWidget from "../shared/AnnouncementWidget";
import "../coordinator/Announcements.css";

/**
 * LOGIC: Configuration Data
 * Defines the available targeting options for announcements.
 * Maps human-readable labels to technical values used for filtering in the DB.
 */
const audienceOptions = [
  { value: "Assigned Students", label: "All students assigned to me" },
  { value: "Level 1 Assigned Students", label: "Level 1 assigned students" },
  { value: "Level 2 Assigned Students", label: "Level 2 assigned students" },
  { value: "Level 3 Assigned Students", label: "Level 3 assigned students" },
  { value: "Level 4 Assigned Students", label: "Level 4 assigned students" },
];

const Announcements: React.FC = () => {
  /**
   * LOGIC: State & Context Management
   * - user: Retrieves authenticated user details (ID, name).
   * - Form States: Tracks input values (title, message, audience).
   * - UI States: Manages loading status (posting) and feedback (statusText).
   * - Component Sync: refreshTrigger and widgetRef allow the form to trigger
   *   an update in the sibling AnnouncementWidget after a successful post.
   */
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState(audienceOptions[0].value);
  const [priority, setPriority] = useState("normal");
  const [posting, setPosting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const widgetRef = useRef<{ refresh: () => void }>(null);

  /**
   * FUNCTION: handlePostAnnouncement
   * LOGIC:
   * 1. Validation: Ensures title and message aren't empty after trimming whitespace.
   * 2. Payload Construction: Builds an object with author metadata and target audience.
   * 3. API Communication: Sends a POST request to the backend.
   * 4. Error Handling: Catches network or server errors and displays them to the user.
   * 5. State Reset: Clears the form and triggers a refresh of the list upon success.
   */
  const handlePostAnnouncement = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setStatusText("Please add both title and message.");
      return;
    }

    try {
      setPosting(true);
      setStatusText("");

      const payload = {
        title: trimmedTitle,
        message: trimmedMessage,
        target_audience: audience,
        priority,
        author_name: user?.name || "Supervisor",
        author_role: "supervisor",
        author_id: user?.id ?? null,
        supervisor_id: user?.id ?? null,
      };

      const response = await fetch("http://localhost:5000/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || `API Error: ${response.statusText}`);
      }

      // Logic: Post-success cleanup
      setTitle("");
      setMessage("");
      setAudience(audienceOptions[0].value);
      setPriority("normal");
      setStatusText("Announcement posted successfully!");

      // Logic: Notify the Widget component to re-fetch data
      setRefreshTrigger((previous) => previous + 1);
      widgetRef.current?.refresh?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to post announcement.";
      setStatusText(`Error: ${msg}`);
    } finally {
      setPosting(false);
    }
  };

  /**
   * RENDER LOGIC:
   * - Form Card: Captures user input via controlled components (input, textarea, select).
   * - Conditional Styling: statusText color changes based on "Error:" prefix.
   * - Shared Component: Renders AnnouncementWidget with specific props to
   *   show only the current supervisor's history.
   */
  return (
    <div className="announcements-shell">
      <div className="announcements-card">
        <div className="card-header">
          <Megaphone size={20} className="header-icon" />
          <h3 className="card-title">Post Supervisor Announcement</h3>
        </div>

        <div className="announcements-form">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Write announcement message"
          />

          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
          >
            {audienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="normal">Normal priority</option>
            <option value="urgent">Urgent</option>
          </select>

          {statusText && (
            <p
              className={`announcement-status ${statusText.startsWith("Error:") ? "error" : "success"}`}
            >
              {statusText}
            </p>
          )}

          <button
            type="button"
            className="view-all-btn"
            onClick={handlePostAnnouncement}
            disabled={posting}
          >
            {posting ? "Posting..." : "Publish Announcement"}
          </button>
        </div>
      </div>

      {/* Logic: Historical list restricted to 'own' scope */}
      <AnnouncementWidget
        ref={widgetRef}
        title="Supervisor's Recent Announcements"
        maxItems={6}
        refreshDep={refreshTrigger}
        showEditDeleteButtons={true}
        scope="own"
        showOnlyMyAnnouncements={true}
        useRoleQuery={false}
      />
    </div>
  );
};

export default Announcements;
