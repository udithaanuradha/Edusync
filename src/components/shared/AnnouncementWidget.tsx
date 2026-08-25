import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { AlertTriangle, Clock3, Megaphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./AnnouncementWidget.css";

type AnnouncementItem = {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
  author_role?: string;
  supervisor_id?: number | string;
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
  refreshDep?: number;
  showEditDeleteButtons?: boolean;
  scope?: "all" | "own" | "others";
  useRoleQuery?: boolean;
  showOnlyMyAnnouncements?: boolean;
  showOnlyAllAudience?: boolean;
  // Opt-in, read-time-only filter: hides announcements older than this many
  // days from THIS view. Nothing is deleted (soft or otherwise) and no
  // scheduled job is involved — an announcement still shows normally in any
  // usage of this widget that doesn't pass recentDays (e.g. a dedicated
  // Announcements page), and an unread one is never hidden from someone who
  // hasn't seen it just because it's old — see the on-widget unread count.
  recentDays?: number;
}

const AnnouncementWidget = forwardRef<{ refresh: () => void }, AnnouncementWidgetProps>(
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
      recentDays,
    },
    ref
  ) => {
    const { user } = useAuth();
    const [items, setItems] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editMessage, setEditMessage] = useState("");
    const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<number | null>(null);
    const [readIds, setReadIds] = useState<number[]>(() => {
      if (!user?.id) return [];
      const stored = localStorage.getItem(`edusync_read_announcements_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    });

    const markAsRead = (id: number) => {
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        if (user?.id) {
          localStorage.setItem(`edusync_read_announcements_${user.id}`, JSON.stringify(updated));
        }
        window.dispatchEvent(new CustomEvent('announcementsReadUpdated', { detail: updated }));
        return updated;
      });
    };

    const roleLabel = user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
      : "";

    const normalize = (value?: string) => value?.trim().toLowerCase() ?? "";

    const isOwnedByCurrentSupervisor = (item: AnnouncementItem) => {
      // First try matching by ID
      const currentUserId = String(user?.id ?? "").trim();
      const itemAuthorId = String(item.author_id ?? item.supervisor_id ?? "").trim();
      if (
        currentUserId &&
        itemAuthorId &&
        currentUserId === itemAuthorId
      ) {
        return true;
      }

      // Fallback to name matching
      const currentName = normalize(user?.name);
      const authorName = normalize(item.author_name);

      return Boolean(currentName && authorName && currentName === authorName);
    };

    const applyScopeFilter = (items: AnnouncementItem[]) => {
      if (scope === "own") {
        return items.filter((item) => isOwnedByCurrentSupervisor(item));
      }

      if (scope === "others") {
        return items.filter((item) => !isOwnedByCurrentSupervisor(item));
      }

      return items;
    };

    const loadAnnouncements = async () => {
      if (useRoleQuery && !roleLabel && !user?.name) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        let url = API_BASE;

        if (showOnlyMyAnnouncements && user?.name) {
          url += `?author=${encodeURIComponent(user.name)}`;
        } else if (showOnlyAllAudience) {
          url += '?all_audience=true';
        } else if (useRoleQuery) {
          // Pass role, level, and user name for smart filtering based on Rule of Relevance
          const levelParam = user?.level ? `&level=${encodeURIComponent(String(user.level))}` : "";
          const nameParam = user?.name ? `&name=${encodeURIComponent(user.name)}` : "";
          const supervisorParam =
            user?.role === "supervisor" && user?.id
              ? `&supervisor_id=${encodeURIComponent(String(user.id))}`
              : "";
          // Exclude current user's own posts from dashboard view
          const excludeAuthorParam =
            user?.id ? `&exclude_author_id=${encodeURIComponent(String(user.id))}` : "";
          url += `?role=${encodeURIComponent(roleLabel)}${levelParam}${nameParam}${supervisorParam}${excludeAuthorParam}`;
        }

        console.log("Fetching announcements from:", url);
        console.log("User details:", {
          roleLabel,
          level: user?.level,
          name: user?.name,
          showOnlyMyAnnouncements,
          showOnlyAllAudience,
        });

        const response = await fetch(url);

        console.log(
          "Fetch response status:",
          response.status,
          response.statusText,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load announcements: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        console.log("Raw API response:", data);

        // Handle both array and object responses
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.announcements && Array.isArray(data.announcements)) {
          list = data.announcements;
        } else if (data?.data && Array.isArray(data.data)) {
          list = data.data;
        }

        console.log("Parsed announcements list:", list);

        let filteredList = applyScopeFilter(list);
        if (recentDays) {
          const cutoff = Date.now() - recentDays * 24 * 60 * 60 * 1000;
          // Age only hides an announcement once it's both old AND already
          // read — an unread one stays visible no matter how old, so it's
          // never silently missed.
          filteredList = filteredList.filter(
            (item) => readIds.includes(item.id) === false || new Date(item.created_at).getTime() >= cutoff
          );
        }
        setItems(filteredList.slice(0, maxItems));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load announcements.";
        console.error("Load announcements error:", err);
        setError(message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: loadAnnouncements,
    }));

    const deleteAnnouncement = async (id: number) => {
      if (
        !window.confirm("Are you sure you want to delete this announcement?")
      ) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to delete announcement: ${response.statusText}`,
          );
        }

        console.log("Announcement deleted successfully");
        loadAnnouncements(); // Refresh the list
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete announcement.";
        console.error("Delete announcement error:", err);
        alert(`Error: ${message}`);
      }
    };

    const startEdit = (item: AnnouncementItem) => {
      setEditingId(item.id);
      setEditTitle(item.title);
      setEditMessage(item.message);
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditTitle("");
      setEditMessage("");
    };

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

        if (!response.ok) {
          throw new Error(
            `Failed to update announcement: ${response.statusText}`,
          );
        }

        console.log("Announcement updated successfully");
        setEditingId(null);
        loadAnnouncements(); // Refresh the list
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update announcement.";
        console.error("Update announcement error:", err);
        alert(`Error: ${message}`);
      }
    };

    useEffect(() => {
      loadAnnouncements();
    }, [
      roleLabel,
      user?.level,
      user?.name,
      maxItems,
      refreshDep,
      scope,
      useRoleQuery,
      user?.id,
      showOnlyMyAnnouncements,
      showOnlyAllAudience,
      recentDays,
    ]);

    const formatTime = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Unknown time";
      return date.toLocaleString();
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

    const toggleRead = (id: number) => {
      setReadIds((prev) => {
        const isRead = prev.includes(id);
        const updated = isRead ? prev.filter((item) => item !== id) : [...prev, id];
        if (user?.id) {
          localStorage.setItem(`edusync_read_announcements_${user.id}`, JSON.stringify(updated));
        }
        window.dispatchEvent(new CustomEvent('announcementsReadUpdated', { detail: updated }));
        return updated;
      });
    };

    const toggleExpanded = (id: number) => {
      setExpandedAnnouncementId((current) => (current === id ? null : id));
      if (!readIds.includes(id)) {
        markAsRead(id);
      }
    };

    const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

    return (
      <div className="announcement-widget-card">
        <div className="announcement-widget-header">
          <div className="announcement-widget-title-wrap">
            <Megaphone size={18} />
            <h3>{title}</h3>
            {unreadCount > 0 ? (
              <span className="announcement-unread-badge" style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                {unreadCount} unread
              </span>
            ) : (
              <span className="announcement-unread-badge" style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
                All read
              </span>
            )}
          </div>
          <button
            type="button"
            className="announcement-widget-refresh"
            onClick={loadAnnouncements}
          >
            Refresh
          </button>
        </div>

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

        {!loading && !error && items.length > 0 && (
          <ul className="announcement-widget-list">
            {items.map((item) => {
              const isRead = readIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  className={`announcement-widget-item ${getPriority(item) === "urgent" ? "is-urgent" : ""} ${isRead ? "is-read" : ""}`}
                  style={isRead ? { opacity: 0.88, background: '#ffffff' } : {}}
                >
                  {editingId === item.id ? (
                    <div className="announcement-edit-form">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className="edit-input"
                      />
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        placeholder="Message"
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
                        <button className="edit-cancel-btn" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="announcement-top-row">
                        <div className="announcement-title-block">
                          <div className="announcement-title-row">
                            {!isRead && (
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
                        <div className="announcement-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="announcement-date-pill">
                            <Clock3 size={12} />
                            <span>{formatCompactDate(item.created_at)}</span>
                          </div>
                          {isRead ? (
                            <button
                              type="button"
                              className="announcement-dismiss-btn read-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRead(item.id);
                              }}
                              title="Click to mark unread"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              ✓ Read
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="announcement-dismiss-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRead(item.id);
                              }}
                              title="Click to mark as read"
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          {showEditDeleteButtons && (
                            <div className="announcement-icon-buttons">
                              <button
                                className="announcement-icon-btn announcement-edit-icon-btn"
                                onClick={() => startEdit(item)}
                                title="Edit announcement"
                                aria-label="Edit announcement"
                              >
                                ✎
                              </button>
                              <button
                                className="announcement-icon-btn announcement-delete-icon-btn"
                                onClick={() => deleteAnnouncement(item.id)}
                                title="Delete announcement"
                                aria-label="Delete announcement"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
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
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);

AnnouncementWidget.displayName = "AnnouncementWidget";

export default AnnouncementWidget;
