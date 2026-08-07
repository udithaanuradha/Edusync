import React, { useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AnnouncementWidget from "../shared/AnnouncementWidget";
import "../coordinator/Announcements.css";

const audienceOptions = [
  { value: "Assigned Students", label: "All students assigned to me" },
  { value: "Level 1 Assigned Students", label: "Level 1 assigned students" },
  { value: "Level 2 Assigned Students", label: "Level 2 assigned students" },
  { value: "Level 3 Assigned Students", label: "Level 3 assigned students" },
  { value: "Level 4 Assigned Students", label: "Level 4 assigned students" },
];

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState(audienceOptions[0].value);
  const [priority, setPriority] = useState("normal");
  const [posting, setPosting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const widgetRef = useRef<{ refresh: () => void }>(null);

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

      setTitle("");
      setMessage("");
      setAudience(audienceOptions[0].value);
      setPriority("normal");
      setStatusText("Announcement posted successfully!");

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
              className={`announcement-status ${statusText.startsWith("Error:") ? "error" : ""}`}
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

      <AnnouncementWidget
        ref={widgetRef}
        title="Supervisor's Recent Announcements"
        maxItems={6}
        refreshDep={refreshTrigger}
        showEditDeleteButtons={true}
        scope="own"
        useRoleQuery={true}
      />
    </div>
  );
};

export default Announcements;
