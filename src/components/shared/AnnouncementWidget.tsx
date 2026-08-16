import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { AlertTriangle, Clock3, Megaphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./AnnouncementWidget.css";

/**
 * TypeScript definitions for the Announcement data structure
 */
type AnnouncementItem = {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
  author_id?: number | string;
  created_at: string;
  priority?: string;
  priority_level?: string;
  urgency?: string;
};

const API_BASE = "http://localhost:5000/api/announcements";

interface AnnouncementWidgetProps {
  title?: string;
  maxItems?: number;
  refreshDep?: number; // Dependency to trigger re-fetch from parent
  showEditDeleteButtons?: boolean;
  scope?: "all" | "own" | "others"; // Filter logic for which items to show
  useRoleQuery?: boolean; // Whether to filter by user role (Student/Supervisor)
  showOnlyMyAnnouncements?: boolean;
  showOnlyAllAudience?: boolean;
}

/**
 * AnnouncementWidget - Displays a list of announcements with optional
 * CRUD (Edit/Delete) capabilities and flexible filtering.
 */
const AnnouncementWidget = forwardRef<
  { refresh: () => void },
  AnnouncementWidgetProps
>(
  (
    {
      title = "Announcements",
      maxItems = 5,
      refreshDep = 0,
      showEditDeleteButtons = false,
      scope = "all",
      useRoleQuery = true,
      showOnlyMyAnnouncements = false,
      showOnlyAllAudience = false,
    },
    ref,
  ) => {
    // --- State & Context ---
    const { user } = useAuth();
    const [items, setItems] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // States for inline editing mode
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editMessage, setEditMessage] = useState("");
    const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<number | null>(null);

    // --- Helper Logic ---

    // Formats role for API compatibility (e.g., "supervisor" -> "Supervisor")
    const roleLabel = user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
      : "";

    const normalize = (value?: string) => value?.trim().toLowerCase() ?? "";

    /**
     * Determines if the current logged-in user is the author of an announcement
     * Checks by ID first, then falls back to Name matching.
     */
    const isOwnedByCurrentSupervisor = (item: AnnouncementItem) => {
      const currentId = String(user?.id ?? "").trim();
      const itemAuthorId = String(item.author_id ?? "").trim();

      if (currentId && itemAuthorId && currentId === itemAuthorId) return true;

      const currentName = normalize(user?.name);
      const authorName = normalize(item.author_name);
      return Boolean(currentName && authorName && currentName === authorName);
    };

    /**
     * Filters the fetched list based on the 'scope' prop
     */
    const applyScopeFilter = (items: AnnouncementItem[]) => {
      if (scope === "own")
        return items.filter((item) => isOwnedByCurrentSupervisor(item));
      if (scope === "others")
        return items.filter((item) => !isOwnedByCurrentSupervisor(item));
      return items;
    };

    // --- API Interactions ---

    /**
     * Main data fetching function
     * Constructs query parameters based on props (role, level, specific author)
     */
    const loadAnnouncements = async () => {
      if (!user?.name && !user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        let url = API_BASE;

        // Build URL parameters dynamically
        if (showOnlyMyAnnouncements) {
          const params = new URLSearchParams();
          if (user?.id) params.append("author_id", String(user.id));
          if (user?.name) params.append("author", user.name);
          url += `?${params.toString()}`;
        } else if (showOnlyAllAudience) {
          url += "?all_audience=true";
        } else if (useRoleQuery) {
          const params = new URLSearchParams();
          if (roleLabel) params.append("role", roleLabel);
          if (user?.level) params.append("level", String(user.level));
          if (user?.id) {
            params.append("supervisor_id", String(user.id));
            params.append("exclude_author_id", String(user.id));
          }
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Failed to load: ${response.statusText}`);

        const data = await response.json();
        // Handle different possible JSON response structures
        let list = Array.isArray(data)
          ? data
          : data?.announcements || data?.data || [];

        const filteredList = applyScopeFilter(list);
        setItems(filteredList.slice(0, maxItems));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load announcements.",
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    /**
     * Exposes the refresh function to parent components via ref
     */
    useImperativeHandle(ref, () => ({ refresh: loadAnnouncements }));

    /**
     * Handles Deletion of an announcement
     */
    const deleteAnnouncement = async (id: number) => {
      if (!window.confirm("Are you sure you want to delete this announcement?"))
        return;
      try {
        const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
        loadAnnouncements();
      } catch (err) {
        alert(
          `Error: ${err instanceof Error ? err.message : "Failed to delete."}`,
        );
      }
    };

    /**
     * Handles Updating an announcement (PUT request)
     */
    const updateAnnouncement = async (id: number) => {
      if (!editTitle.trim() || !editMessage.trim()) {
        alert("Title and message cannot be empty");
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle.trim(),
            message: editMessage.trim(),
          }),
        });
        if (!response.ok) throw new Error("Update failed");
        setEditingId(null); // Exit edit mode
        loadAnnouncements();
      } catch (err) {
        alert(
          `Error: ${err instanceof Error ? err.message : "Failed to update."}`,
        );
      }
    };

    // --- Lifecycle ---

    // Re-fetch data whenever user context changes or external refresh dependency updates
    useEffect(() => {
      loadAnnouncements();
    }, [user?.id, user?.name, refreshDep]);

    /**
     * Helper to format ISO strings to readable local time
     */
    const formatTime = (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? "Unknown time"
        : date.toLocaleString();
    };

    const formatCompactDate = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    };

    const isRecentAnnouncement = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
    };

    const getPriority = (item: AnnouncementItem) =>
      (item.priority ?? item.priority_level ?? item.urgency ?? "normal")
        .trim()
        .toLowerCase();

    const getAudienceLabel = (value: string) => {
      const normalized = value.trim().toLowerCase();

      const audienceMap: Record<string, string> = {
        all: "All Users",
        student: "Students",
        supervisor: "Supervisors",
        mentor: "Mentors",
        coordinator: "Coordinators",
        admin: "Admins",
        "assigned students": "Assigned Students",
        "level1": "Level 1 Students",
        "level2": "Level 2 Students",
        "level3": "Level 3 Students",
        "level4": "Level 4 Students",
        "level 1 assigned students": "Level 1 Assigned Students",
        "level 2 assigned students": "Level 2 Assigned Students",
        "level 3 assigned students": "Level 3 Assigned Students",
        "level 4 assigned students": "Level 4 Assigned Students",
      };

      return audienceMap[normalized] ?? value.replace(/_/g, " ");
    };

    const getAudienceTone = (value: string) => {
      const normalized = value.trim().toLowerCase();

      if (normalized.includes("student") || normalized.includes("level")) {
        return "blue";
      }

      if (normalized.includes("supervisor")) {
        return "violet";
      }

      if (normalized.includes("mentor")) {
        return "emerald";
      }

      if (normalized.includes("admin") || normalized.includes("coordinator")) {
        return "slate";
      }

      return "slate";
    };

    const toggleExpanded = (id: number) => {
      setExpandedAnnouncementId((current) => (current === id ? null : id));
    };

    return (
      <div className="announcement-widget-card">
        {/* Header Section */}
        <div className="announcement-widget-header">
          <div className="announcement-widget-title-wrap">
            <Megaphone size={18} />
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="announcement-widget-refresh"
            onClick={loadAnnouncements}
          >
            Refresh
          </button>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <p className="announcement-widget-muted">Loading announcements...</p>
        )}
        {!loading && error && (
          <p className="announcement-widget-error">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="announcement-widget-muted">
            No announcements available.
          </p>
        )}

        {/* Content List */}
        {!loading && !error && items.length > 0 && (
          <ul className="announcement-widget-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={`announcement-widget-item ${getPriority(item) === "urgent" ? "is-urgent" : ""}`}
              >
                {editingId === item.id ? (
                  /* Inline Edit Form Mode */
                  <div className="announcement-edit-form">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="edit-input"
                    />
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="edit-textarea"
                      rows={3}
                    />
                    <div className="edit-actions">
                      <button
                        className="edit-save-btn"
                        onClick={() => updateAnnouncement(item.id)}
                      >
                        Save
                      </button>
                      <button
                        className="edit-cancel-btn"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Display Mode */
                  <>
                    <div className="announcement-top-row">
                      <div className="announcement-title-block">
                        <div className="announcement-title-row">
                          {isRecentAnnouncement(item.created_at) && (
                            <span className="announcement-unread-dot" aria-hidden="true" />
                          )}
                          <h4 className="announcement-title">{item.title}</h4>
                          {getPriority(item) === "urgent" && (
                            <span className="announcement-priority-badge">
                              <AlertTriangle size={12} /> Urgent
                            </span>
                          )}
                        </div>
                        <div className="announcement-meta-row">
                          <span className={`announcement-audience-badge tone-${getAudienceTone(item.target_audience)}`}>
                            {getAudienceLabel(item.target_audience)}
                          </span>
                          <span className="announcement-author-text">by {item.author_name}</span>
                        </div>
                      </div>
                      <div className="announcement-date-pill">
                        <Clock3 size={12} />
                        <span>{formatCompactDate(item.created_at)}</span>
                      </div>
                      {showEditDeleteButtons && (
                        <div className="announcement-icon-buttons">
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditTitle(item.title);
                              setEditMessage(item.message);
                            }}
                            className="announcement-icon-btn"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(item.id)}
                            className="announcement-icon-btn"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="announcement-content-button"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className={`announcement-content ${expandedAnnouncementId === item.id ? "is-expanded" : ""}`}>
                        <p className="announcement-message">{item.message}</p>
                      </div>
                      <span className="announcement-read-more">
                        {expandedAnnouncementId === item.id ? "Show less" : "Read more"}
                      </span>
                    </button>

                    <div className="announcement-footnote">Posted {formatTime(item.created_at)}</div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

AnnouncementWidget.displayName = "AnnouncementWidget";
export default AnnouncementWidget;
