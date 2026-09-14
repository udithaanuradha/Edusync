import React, {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { AlertTriangle, Clock3, Megaphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
// Reuses the shared widget's stylesheet only — no shared .tsx logic is
// imported or modified, so this file can't change AnnouncementWidget's
// behavior for any other role/page that still renders it directly.
import "../shared/AnnouncementWidget.css";

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

const ANNOUNCEMENTS_API = "http://localhost:5000/api/announcements";
const GROUPS_API = "http://localhost:5000/api/groups";

// An "...Assigned Students" audience label (e.g. "Level 2 Assigned
// Students") is meant to reach only the students that specific supervisor
// actually supervises — but /api/announcements has no way to check that
// server-side, so every student matches it today. This is the client-side
// guard: for any such label, only trust it if this student's own approved
// supervisor (for their current level) is the one who posted it.
const isAssignedAudienceLabel = (value: string) =>
  value.trim().toLowerCase().includes("assigned");

/**
 * Student dashboard's Announcements widget — visually and behaviorally the
 * same as AnnouncementWidget, but adds the one missing safety check: an
 * "...Assigned Students" post only shows here if it actually came from a
 * supervisor this student is assigned to. Kept as its own file specifically
 * so fixing that doesn't touch AnnouncementWidget.tsx, which every other
 * role's dashboard/page still renders unchanged.
 */
const SupervisorAssignedAnnouncement = forwardRef<
  { refresh: () => void },
  { title?: string; maxItems?: number }
>(({ title = "Announcements", maxItems = 5 }, ref) => {
  const { user } = useAuth();
  const userAny = user as any;

  const [rawItems, setRawItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<number[]>(() => {
    if (!user?.id) return [];
    const stored = localStorage.getItem(`edusync_read_announcements_${user.id}`);
    return stored ? JSON.parse(stored) : [];
  });

  // This student's own approved supervisor(s) for their current level —
  // same source and matching logic StudentAnnouncementsPage.tsx already
  // uses for its "Your Supervisors' Announcements" row (read-only, no
  // change to that page or the endpoint it calls).
  const [assignedSupervisorIds, setAssignedSupervisorIds] = useState<number[]>([]);

  const markAsRead = (id: number) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      if (user?.id) {
        localStorage.setItem(`edusync_read_announcements_${user.id}`, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent("announcementsReadUpdated", { detail: updated }));
      return updated;
    });
  };

  const toggleRead = (id: number) => {
    setReadIds((prev) => {
      const isRead = prev.includes(id);
      const updated = isRead ? prev.filter((item) => item !== id) : [...prev, id];
      if (user?.id) {
        localStorage.setItem(`edusync_read_announcements_${user.id}`, JSON.stringify(updated));
      }
      window.dispatchEvent(new CustomEvent("announcementsReadUpdated", { detail: updated }));
      return updated;
    });
  };

  const toggleExpanded = (id: number) => {
    setExpandedAnnouncementId((current) => (current === id ? null : id));
    if (!readIds.includes(id)) {
      markAsRead(id);
    }
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : "";

  const loadAnnouncements = async () => {
    if (!roleLabel && !user?.name) {
      setRawItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const levelParam = user?.level ? `&level=${encodeURIComponent(String(user.level))}` : "";
      const excludeAuthorParam = user?.id ? `&exclude_author_id=${encodeURIComponent(String(user.id))}` : "";
      const url = `${ANNOUNCEMENTS_API}?role=${encodeURIComponent(roleLabel)}${levelParam}${excludeAuthorParam}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load announcements: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const list: AnnouncementItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.announcements)
          ? data.announcements
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setRawItems(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load announcements.";
      console.error("[SupervisorAssignedAnnouncement] load error:", err);
      setError(message);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Mirrors StudentAnnouncementsPage.tsx's Row 3 resolution exactly: this
  // student's request for their current level, then whichever
  // supervisor_responses on it are 'approved'.
  const loadAssignedSupervisors = async () => {
    if (!userAny?.id) return;
    try {
      const res = await fetch(`${GROUPS_API}/my-requests/${userAny.id}?includeCreated=true`);
      if (!res.ok) return;
      const data = await res.json();
      const requests = Array.isArray(data) ? data : [data];
      const latest = requests.find(
        (r: any) => Number(r.project_level || r.level) === Number(userAny.level),
      );
      const responses = Array.isArray(latest?.supervisor_responses) ? latest.supervisor_responses : [];
      const approvedIds = responses
        .filter((r: any) => r.status === "approved")
        .map((r: any) => Number(r.supervisor_id))
        .filter((id: number) => Number.isFinite(id));

      setAssignedSupervisorIds(approvedIds);
    } catch (err) {
      console.error("[SupervisorAssignedAnnouncement] Failed to load assigned supervisors", err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLabel, user?.level, user?.name, user?.id]);

  useEffect(() => {
    loadAssignedSupervisors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAny?.id, userAny?.level]);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      loadAnnouncements();
      loadAssignedSupervisors();
    },
  }));

  // The one extra safety filter beyond what AnnouncementWidget does: an
  // "...Assigned Students" post only survives if it's actually from one of
  // this student's approved supervisors. Every other audience ("All",
  // coordinator/admin broadcasts, etc.) passes through untouched, same as
  // today. Recomputed whenever either input changes, so a late-arriving
  // assignedSupervisorIds fetch still corrects the list once it lands.
  const items = useMemo(() => {
    const scoped = rawItems.filter(
      (item) =>
        !isAssignedAudienceLabel(item.target_audience) ||
        assignedSupervisorIds.includes(Number(item.author_id)),
    );
    return scoped.slice(0, maxItems);
  }, [rawItems, assignedSupervisorIds, maxItems]);

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString();
  };

  const formatCompactDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getPriority = (item: AnnouncementItem) =>
    (item.priority ?? item.priority_level ?? item.urgency ?? "normal").trim().toLowerCase();

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
      level1: "Level 1 Students",
      level2: "Level 2 Students",
      level3: "Level 3 Students",
      level4: "Level 4 Students",
      "level 1 assigned students": "Level 1 Assigned Students",
      "level 2 assigned students": "Level 2 Assigned Students",
      "level 3 assigned students": "Level 3 Assigned Students",
      "level 4 assigned students": "Level 4 Assigned Students",
    };

    return audienceMap[normalized] ?? value.replace(/_/g, " ");
  };

  const getAudienceTone = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes("student") || normalized.includes("level")) return "blue";
    if (normalized.includes("supervisor")) return "violet";
    if (normalized.includes("mentor")) return "emerald";
    if (normalized.includes("admin") || normalized.includes("coordinator")) return "slate";
    return "slate";
  };

  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div className="announcement-widget-card">
      <div className="announcement-widget-header">
        <div className="announcement-widget-title-wrap">
          <Megaphone size={18} />
          <h3>{title}</h3>
          {unreadCount > 0 ? (
            <span
              className="announcement-unread-badge"
              style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}
            >
              {unreadCount} unread
            </span>
          ) : (
            <span
              className="announcement-unread-badge"
              style={{ background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 500 }}
            >
              All read
            </span>
          )}
        </div>
        <button
          type="button"
          className="announcement-widget-refresh"
          onClick={() => {
            loadAnnouncements();
            loadAssignedSupervisors();
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p className="announcement-widget-muted">Loading announcements...</p>}
      {!loading && error && <p className="announcement-widget-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="announcement-widget-muted">No announcements available.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="announcement-widget-list">
          {items.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={`announcement-widget-item ${getPriority(item) === "urgent" ? "is-urgent" : ""} ${isRead ? "is-read" : ""}`}
                style={isRead ? { opacity: 0.88, background: "#ffffff" } : {}}
              >
                <div className="announcement-top-row">
                  <div className="announcement-title-block">
                    <div className="announcement-title-row">
                      {!isRead && <span className="announcement-unread-dot" aria-hidden="true" />}
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
                  <div className="announcement-actions-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#64748b",
                          cursor: "pointer",
                          transition: "all 0.15s",
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
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#1d4ed8",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        Mark Read
                      </button>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

SupervisorAssignedAnnouncement.displayName = "SupervisorAssignedAnnouncement";

export default SupervisorAssignedAnnouncement;
