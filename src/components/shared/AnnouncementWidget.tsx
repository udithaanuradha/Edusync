import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Megaphone } from "lucide-react";
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
  created_at: string;
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

    const roleLabel = user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
      : "";

    const normalize = (value?: string) => value?.trim().toLowerCase() ?? "";

    const isOwnedByCurrentSupervisor = (item: AnnouncementItem) => {
      if (user?.role !== "supervisor") {
        return false;
      }

      const currentSupervisorId = String(user?.id ?? "").trim();
      const itemSupervisorId = String(item.supervisor_id ?? "").trim();
      if (
        currentSupervisorId &&
        itemSupervisorId &&
        currentSupervisorId === itemSupervisorId
      ) {
        return true;
      }

      const currentName = normalize(user?.name);
      const authorName = normalize(item.author_name);
      const authorRole = normalize(item.author_role);

      return (
        authorRole === "supervisor" &&
        Boolean(currentName && authorName && currentName === authorName)
      );
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
          url += `?role=${encodeURIComponent(roleLabel)}${levelParam}${nameParam}${supervisorParam}`;
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

        const filteredList = applyScopeFilter(list);
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
    ]);

    const formatTime = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Unknown time";
      return date.toLocaleString();
    };

    return (
      <div className="announcement-widget-card">
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
            {items.map((item) => (
              <li key={item.id} className="announcement-widget-item">
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
                    <div className="announcement-header-row">
                      <h4 className="announcement-title">{item.title}</h4>
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

                    <div className="announcement-metadata-line">
                      Target: {item.target_audience} • By: {item.author_name} •{" "}
                      {formatTime(item.created_at)}
                    </div>

                    <div className="announcement-content">
                      <p>{item.message}</p>
                    </div>
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
