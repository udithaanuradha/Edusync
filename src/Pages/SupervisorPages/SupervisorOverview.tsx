import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Users, Calendar, Megaphone, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import { useAuth } from '../../context/AuthContext';
import { useSocketV2 } from '../../hooks/useSocketV2';
import { fetchConversationsV2 } from '../../utils/apiV2';
import { ConversationV2, MessageV2 } from '../../types/chatV2';
import { fetchPendingApprovalRequests, getViewerIdentity } from '../../utils/supervisorApprovals';
import SupervisorTaskScheduler from './SupervisorTaskScheduler';
import './SupervisorOverview.css';

const PANEL_STORAGE_KEY = 'edusync.calendar.panels';

type StoredPanel = {
  id: string;
  title: string;
  level: number;
  groupName: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  meetingLink: string;
  notes: string;
  evaluators?: string[];
};

const notificationTabs = ['overall', 'Level1', 'level2', 'level3', 'admin', 'coordinator'] as const;
type NotificationTab = (typeof notificationTabs)[number];

type NotificationItem = {
  id: number | string;
  title: string;
  count: string;
  path?: string;
};

type GroupStudent = {
  name: string;
  status: string;
  progress: string;
};

const defaultNotifications: Record<NotificationTab, NotificationItem[]> = {
  overall: [
    { id: 'appr-1', title: 'pending approval', count: '1', path: '/supervisor/approval' },
    { id: 'meet-1', title: 'meeting request', count: '3', path: '/dashboard/calendar' },
    { id: 'meet-2', title: 'pending meeting', count: '2+', path: '/dashboard/calendar' },
    { id: 'ann-1', title: 'announcements', count: '', path: '/dashboard/announcements' }
  ],
  Level1: [
    { id: 'l1-1', title: 'Level 1 pending review', count: '1', path: '/supervisor/approval' }
  ],
  level2: [
    { id: 'l2-1', title: 'Code review pending', count: '2', path: '/dashboard/calendar' }
  ],
  level3: [
    { id: 'l3-1', title: 'Final evaluation pending', count: '1', path: '/dashboard/calendar' }
  ],
  admin: [
    { id: 'adm-1', title: 'System announcements', count: '', path: '/dashboard/announcements' }
  ],
  coordinator: [
    { id: 'co-1', title: 'Coordination updates', count: '1', path: '/dashboard/communication-v2' }
  ]
};

type GroupItem = {
  groupId: number;
  groupName: string;
  level: number;
  supervisorId: number;
  supervisorName: string;
  leader: string;
  memberCount: number;
  members: string;
};

// Shape returned by GET /api/supervice-st-progress/group/:groupId — the
// same payload SupervisorLevelPage's Progress tab uses, just picking up the
// extra milestone dates / raw tasks here too so this widget can show
// on-time-vs-delayed status without any backend change.
type ActiveGroupMilestone = {
  id: number;
  title: string;
  status: string;
  due_date?: string;
  total: number;
  completed: number;
  percent: number;
};

type ActiveGroupTask = {
  id: number;
  assigned_to: number | string;
  due_date?: string;
  status: string;
};

type ActiveGroupProgress = {
  overall: { total: number; completed: number; percent: number };
  milestones: ActiveGroupMilestone[];
  members: { id: number | string; name: string; total: number; completed: number; percent: number }[];
  tasks: ActiveGroupTask[];
};

const PROGRESS_API_BASE = "http://localhost:5000/api/supervice-st-progress";

// A milestone/task counts as delayed once its due date has passed and it
// hasn't reached its "done" state (APPROVED for a milestone, COMPLETED for
// a task) — same rule SupervisorLevelPage's Progress tab uses.
const isPastDue = (dueDate?: string): boolean =>
  Boolean(dueDate) && new Date(dueDate as string).getTime() < Date.now();

const daysLate = (dueDate: string): number =>
  Math.max(1, Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000));

const SupervisorOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToMessages } = useSocketV2();

  const [activeTab, setActiveTab] = useState<NotificationTab>('overall');
  const [conversations, setConversations] = useState<ConversationV2[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [allGroups, setAllGroups] = useState<GroupItem[]>([]);
  const [activeLevel, setActiveLevel] = useState<number>(1);
  // Only jump to a level with groups once, the first time group data
  // arrives — after that, the supervisor's own tab clicks always win, even
  // if that level happens to be empty.
  const autoSelectedLevelRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [pendingMeetingsCount, setPendingMeetingsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [evaluationPanels, setEvaluationPanels] = useState<StoredPanel[]>([]);
  const [activeGroupProgress, setActiveGroupProgress] = useState<ActiveGroupProgress | null>(null);
  const [loadingActiveGroupProgress, setLoadingActiveGroupProgress] = useState(false);

  const supervisorName = useMemo(() => {
    if (user?.name) return user.name;
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      return u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || "";
    } catch {
      return "";
    }
  }, [user]);

  useEffect(() => {
    const fetchUpcomingEvaluationPanels = async () => {
      if (!supervisorName) return;
      try {
        const token = localStorage.getItem("token");
        const url = `http://localhost:5000/api/evaluation-panels/my-groups?evaluatorName=${encodeURIComponent(supervisorName)}`;
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (res.ok) {
          const resData = await res.json();
          const list = resData.data || [];

          // Filter only upcoming evaluation panels (today or future dates)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const upcomingList: StoredPanel[] = list
            .filter((p: any) => {
              if (!p.panel_date) return false;
              const pDate = new Date(p.panel_date);
              if (isNaN(pDate.getTime())) return false;
              pDate.setHours(0, 0, 0, 0);
              return pDate.getTime() >= today.getTime();
            })
            .map((p: any) => ({
              id: String(p.panel_id || p.id),
              title: p.evaluation_type || p.stage_name || 'Evaluation Panel',
              level: String(p.academic_level || p.level || '1'),
              groupName: p.group_name || p.project_title || 'Assigned Group',
              date: p.panel_date,
              time: p.start_time || '',
              duration: p.duration || '',
              location: p.location || '',
              meetingLink: p.meeting_link || '',
              notes: '',
              evaluators: typeof p.evaluators === 'string' ? JSON.parse(p.evaluators) : (p.evaluators || []),
            }));

          // Sort chronologically (earliest first)
          upcomingList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEvaluationPanels(upcomingList);
        } else {
          setEvaluationPanels([]);
        }
      } catch (err) {
        console.error("Failed to fetch supervisor evaluation panels:", err);
        setEvaluationPanels([]);
      }
    };

    fetchUpcomingEvaluationPanels();
  }, [supervisorName]);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchConversationsV2(user.id);
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations in SupervisorOverview", e);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to real-time incoming messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((incomingMsg: MessageV2) => {
      setConversations((prev) => {
        const partnerId = incomingMsg.sender_id === user?.id ? incomingMsg.receiver_id : incomingMsg.sender_id;
        const exists = prev.find((c) => c.partner_id === partnerId);
        if (exists) {
          return prev.map((c) =>
            c.partner_id === partnerId
              ? {
                  ...c,
                  last_message_text: incomingMsg.message_text,
                  last_message_time: incomingMsg.created_at,
                  last_sender_id: incomingMsg.sender_id,
                  unread_count: incomingMsg.sender_id === user?.id ? c.unread_count : (c.unread_count || 0) + 1,
                }
              : c
          );
        } else {
          return [
            {
              partner_id: partnerId,
              partner_name: incomingMsg.sender_name || `User #${partnerId}`,
              partner_role: incomingMsg.sender_role || "student",
              last_message_id: incomingMsg.id,
              last_message_text: incomingMsg.message_text,
              last_message_time: incomingMsg.created_at,
              last_sender_id: incomingMsg.sender_id,
              unread_count: incomingMsg.sender_id === user?.id ? 0 : 1,
            },
            ...prev,
          ];
        }
      });
    });

    return () => unsubscribe();
  }, [user, subscribeToMessages]);

  useEffect(() => {
    const fetchGroupsAndStats = async () => {
      const raw = localStorage.getItem("user");
      let idStr = "";
      if (user?.id) {
        idStr = String(user.id);
      } else if (raw) {
        try {
          const storedUser = JSON.parse(raw);
          idStr = String(storedUser.id ?? storedUser.user_id ?? "");
        } catch {
          // ignore
        }
      }
      if (!idStr) return;

      const token = localStorage.getItem("token") || localStorage.getItem("jwt") || "auth_token";
      const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`
      };

      // 1. Fetch group details independently
      try {
        const response = await fetch(`http://localhost:5000/api/groupdetailstosupervisordashboard/supervisor/${idStr}`);
        if (response.ok) {
          const data = await response.json();
          setAllGroups(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn("Failed fetching groups:", err);
      }

      // 2. Fetch pending meeting requests independently
      try {
        const meetingRes = await fetch(`http://localhost:5000/api/meeting-requests/supervisor/${idStr}`, {
          headers: authHeaders,
        });
        if (meetingRes.ok) {
          const meetingData = await meetingRes.json();
          const list = Array.isArray(meetingData) ? meetingData : (meetingData.data || meetingData.requests || []);
          const pending = list.filter((r: any) => String(r.status || "").toLowerCase() === "pending");
          setPendingMeetingsCount(pending.length);
        }
      } catch (err) {
        console.warn("Failed fetching meeting requests:", err);
      }

      // 3. Fetch pending group-approval requests independently
      try {
        const viewer = getViewerIdentity();
        const { requests } = await fetchPendingApprovalRequests(viewer);
        setPendingApprovalsCount(requests.length);
      } catch (err) {
        console.warn("Failed fetching pending approval requests:", err);
      }

      // 4. Fetch announcements independently
      try {
        const annRes = await fetch(`http://localhost:5000/api/announcements`, { headers: authHeaders });
        if (annRes.ok) {
          const annData = await annRes.json();
          const list: any[] = Array.isArray(annData) ? annData : (annData.announcements || annData.data || []);
          const storedRead = localStorage.getItem(`edusync_read_announcements_${idStr}`);
          const readList: number[] = storedRead ? JSON.parse(storedRead) : [];
          const unread = list.filter((item) => !readList.includes(item.id));
          setAnnouncementsCount(unread.length);
        }
      } catch (err) {
        console.warn("Failed fetching announcements:", err);
      }
    };

    fetchGroupsAndStats();

    const interval = setInterval(fetchGroupsAndStats, 4000);

    const handleReadUpdate = () => {
      fetchGroupsAndStats();
    };
    window.addEventListener("announcementsReadUpdated", handleReadUpdate);
    window.addEventListener("meetingRequestUpdated", handleReadUpdate);
    window.addEventListener("approvalRequestUpdated", handleReadUpdate);
    window.addEventListener("storage", handleReadUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("announcementsReadUpdated", handleReadUpdate);
      window.removeEventListener("meetingRequestUpdated", handleReadUpdate);
      window.removeEventListener("approvalRequestUpdated", handleReadUpdate);
      window.removeEventListener("storage", handleReadUpdate);
    };
  }, [user]);

  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Filter groups by the currently active level
  const groupsInLevel = allGroups.filter((g) => g.level === activeLevel);
  const activeGroup = groupsInLevel[currentGroupIndex] || null;

  // Handle Level Tab Clicks
  const handleLevelClick = (level: number) => {
    autoSelectedLevelRef.current = true; // a manual pick always wins from here on
    setActiveLevel(level);
    setCurrentGroupIndex(0);
  };

  // On first load, land on the first level (1-4) that actually has an
  // assigned group instead of always defaulting to Level 1.
  useEffect(() => {
    if (autoSelectedLevelRef.current || allGroups.length === 0) return;
    autoSelectedLevelRef.current = true;

    const hasCurrentLevelGroups = allGroups.some((g) => g.level === activeLevel);
    if (hasCurrentLevelGroups) return;

    const firstLevelWithGroups = [1, 2, 3, 4].find((level) =>
      allGroups.some((g) => g.level === level),
    );
    if (firstLevelWithGroups) {
      setActiveLevel(firstLevelWithGroups);
      setCurrentGroupIndex(0);
    }
  }, [allGroups, activeLevel]);

  // Only the currently-browsed group is on screen at a time (prev/next just
  // flips currentGroupIndex), so fetch its progress detail whenever it
  // changes rather than pre-fetching every group in the level.
  useEffect(() => {
    if (!activeGroup) {
      setActiveGroupProgress(null);
      return;
    }

    let cancelled = false;
    setLoadingActiveGroupProgress(true);
    fetch(`${PROGRESS_API_BASE}/group/${activeGroup.groupId}`)
      .then((res) => res.json().catch(() => ({})))
      .then((payload) => {
        if (cancelled) return;
        setActiveGroupProgress(payload?.success ? (payload.data as ActiveGroupProgress) : null);
      })
      .catch(() => {
        if (!cancelled) setActiveGroupProgress(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingActiveGroupProgress(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeGroup?.groupId]);

  const goToFullProgress = () => {
    if (!activeGroup) return;
    navigate(`/dashboard/level-${activeGroup.level}?tab=progress&groupId=${activeGroup.groupId}`);
  };

  return (
    <section className="supervisor-overview">
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>Supervisor Dashboard</h1>
          <p className="dashboard-subtitle">Manage project groups, meetings & weekly schedule</p>
        </div>

        <div className="top-header-quick-cards">
          <div
            className="header-stat-card"
            onClick={() => navigate('/dashboard/communication-v2')}
            role="button"
            tabIndex={0}
            title="Open Communication"
          >
            {totalUnreadMessages > 0 && <span className="stat-card-badge-dot" />}
            <div className="stat-badge-icon messages-bg">
              <MessageSquare size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Incoming Messages</div>
              <div className="stat-value">
                <span className="num">{totalUnreadMessages}</span>
                <span className="unit">unread</span>
              </div>
            </div>
          </div>

          <div
            className="header-stat-card"
            onClick={() => {
              sessionStorage.setItem("openMeetingRequests", "true");
              sessionStorage.setItem("openScheduler", "true");
              navigate('/dashboard/calendar?open=meeting-requests', { state: { openMeetingRequests: true, openTimelineScheduler: true } });
            }}
            role="button"
            tabIndex={0}
            title="View Meeting Requests"
          >
            {pendingMeetingsCount > 0 && <span className="stat-card-badge-dot" />}
            <div className="stat-badge-icon meeting-bg">
              <Users size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Meeting Requests</div>
              <div className="stat-value">
                <span className="num">{pendingMeetingsCount}</span>
                <span className="unit">pending</span>
              </div>
            </div>
          </div>

          <div
            className="header-stat-card"
            onClick={() => navigate('/supervisor/approval')}
            role="button"
            tabIndex={0}
            title="View Pending Approvals"
          >
            {pendingApprovalsCount > 0 && <span className="stat-card-badge-dot" />}
            <div className="stat-badge-icon approval-bg">
              <ClipboardCheck size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Pending Approvals</div>
              <div className="stat-value">
                <span className="num">{pendingApprovalsCount}</span>
                <span className="unit">pending</span>
              </div>
            </div>
          </div>

          <div
            className="header-stat-card"
            onClick={() => navigate('/dashboard/announcements')}
            role="button"
            tabIndex={0}
            title="View Announcements"
          >
            {announcementsCount > 0 && <span className="stat-card-badge-dot" />}
            <div className="stat-badge-icon announcements-bg">
              <Megaphone size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Announcements</div>
              <div className="stat-value">
                <span className="num">{announcementsCount}</span>
                <span className="unit">new</span>
              </div>
            </div>
          </div>

          <div
            className="header-stat-card"
            onClick={() => navigate('/dashboard/calendar')}
            role="button"
            tabIndex={0}
            title="View Incoming Panels"
          >
            {evaluationPanels.length > 0 && <span className="stat-card-badge-dot" />}
            <div className="stat-badge-icon schedule-bg">
              <Calendar size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Incoming Panels</div>
              <div className="stat-value">
                <span className="num">{evaluationPanels.length}</span>
                <span className="unit">panels</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="left-section">
          <div className="left-top-row">
            <SupervisorTaskScheduler inline={true} />
          </div>

          <AnnouncementWidget title="Announcements" maxItems={4} />

          <div className="message-card" style={{ marginTop: '16px' }}>
            <div className="message-header">
              <h3>evaluation panels</h3>
              <span className="message-count">{evaluationPanels.length} scheduled</span>
            </div>

            <div className="notification-items">
              {evaluationPanels.length === 0 ? (
                <div className="notification-row">
                  <div className="notif-title">No upcoming evaluation panels scheduled.</div>
                </div>
              ) : (
                evaluationPanels.slice(0, 4).map((panel) => (
                  <div key={panel.id} className="notification-row">
                    <div className="notif-title">
                      {panel.title} • Level {panel.level} • {panel.groupName}
                    </div>
                    <button
                      className="read-btn"
                      type="button"
                      onClick={() => navigate('/dashboard/calendar')}
                      title="View in Calendar"
                    >
                      view
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="right-section">
          <div className="groups-header">
            <h2>total groups {allGroups.length}...</h2>
          </div>

          <div className="group-tabs">
            {[1, 2, 3, 4].map((level) => {
              const levelGroupsCount = allGroups.filter((g) => g.level === level).length;
              return (
                <button
                  key={level}
                  className={`group-tab ${activeLevel === level ? 'active' : ''}`}
                  onClick={() => handleLevelClick(level)}
                  type="button"
                >
                  level{level}{levelGroupsCount > 0 ? `(${levelGroupsCount}group)` : ''}
                </button>
              );
            })}
          </div>

          <div className="group-overview-card">
            <button
              className="group-nav-arrow group-nav-arrow-left"
              onClick={() =>
                setCurrentGroupIndex(
                  (currentGroupIndex - 1 + groupsInLevel.length) % groupsInLevel.length
                )
              }
              type="button"
              disabled={groupsInLevel.length <= 1}
              aria-label="Previous group"
              title="Previous group"
            >
              <ChevronLeft size={20} />
            </button>

            {activeGroup ? (
              <div key={activeGroup.groupId} className="group-overview-body">
                <div className="group-overview-circle-col">
                  <h4>{activeGroup.groupName}</h4>
                  <div className="progress-circle">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" className="progress-bg" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="progress-fill"
                        style={{
                          strokeDasharray: `${3.14 * 100 * ((activeGroupProgress?.overall.percent ?? 0) / 100)} 314`,
                        }}
                      />
                    </svg>
                    <div className="progress-text">
                      <span className="percentage">{activeGroupProgress?.overall.percent ?? 0}%</span>
                      <span className="status">
                        {activeGroupProgress
                          ? `${activeGroupProgress.overall.completed}/${activeGroupProgress.overall.total} tasks`
                          : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="group-overview-divider" />

                <div className="group-overview-milestones-col">
                  <h4>Milestones</h4>
                  {loadingActiveGroupProgress ? (
                    <p className="overall">Loading milestones...</p>
                  ) : !activeGroupProgress || activeGroupProgress.milestones.length === 0 ? (
                    <p className="overall">No milestones created yet.</p>
                  ) : (
                    <div className="milestone-mini-list">
                      {activeGroupProgress.milestones.map((m) => {
                        const delayed = isPastDue(m.due_date) && m.status !== "APPROVED";
                        return (
                          <div key={m.id} className="milestone-mini-row">
                            <div className="milestone-mini-top">
                              <span className="milestone-mini-title">{m.title}</span>
                              <span className={`milestone-mini-badge ${delayed ? "delayed" : "on-time"}`}>
                                {delayed ? `Delayed ${daysLate(m.due_date as string)}d` : "On time"}
                              </span>
                            </div>
                            <div className="milestone-mini-track">
                              <div
                                className="milestone-mini-fill"
                                style={{ width: `${Math.min(100, Math.max(0, m.percent))}%` }}
                              />
                            </div>
                            <span className="milestone-mini-percent">
                              {m.percent}% ({m.completed}/{m.total} tasks)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="group-overview-body">
                <p>no groups found for level {activeLevel}</p>
              </div>
            )}

            <button
              className="group-nav-arrow group-nav-arrow-right"
              onClick={() => setCurrentGroupIndex((currentGroupIndex + 1) % groupsInLevel.length)}
              type="button"
              disabled={groupsInLevel.length <= 1}
              aria-label="Next group"
              title="Next group"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {activeGroup && (
            <div className="group-progress" onClick={goToFullProgress} role="button" tabIndex={0}>
              <h3>{activeGroup.groupName} — Group Details</h3>
              <p className="overall">
                Leader: <strong>{activeGroup.leader}</strong> · {activeGroup.memberCount} members
              </p>

              {loadingActiveGroupProgress ? (
                <p className="overall">Loading progress summary...</p>
              ) : activeGroupProgress ? (
                <div className="progress-details">
                  <p className="overall">
                    Overall:{" "}
                    <strong>
                      {activeGroupProgress.overall.completed}/{activeGroupProgress.overall.total}
                    </strong>{" "}
                    tasks completed ({activeGroupProgress.overall.percent}%)
                  </p>
                  <p className="overall">
                    Milestones:{" "}
                    <strong>
                      {activeGroupProgress.milestones.filter((m) => m.status === "APPROVED").length}/
                      {activeGroupProgress.milestones.length}
                    </strong>{" "}
                    approved
                  </p>

                  {activeGroupProgress.members.map((member) => {
                    const delayedCount = activeGroupProgress.tasks.filter(
                      (t) =>
                        t.assigned_to === member.id &&
                        isPastDue(t.due_date) &&
                        t.status !== "COMPLETED",
                    ).length;

                    return (
                      <div key={member.id} className="student-item">
                        <span>{member.name}</span>
                        <span className="status">
                          {member.total === 0
                            ? "No tasks"
                            : member.percent === 100
                              ? "Completed"
                              : member.percent === 0
                                ? "Not started"
                                : "In progress"}
                        </span>
                        <span className={`student-delay-badge ${delayedCount > 0 ? "delayed" : "on-time"}`}>
                          {delayedCount > 0 ? `${delayedCount} task(s) delayed` : "On time"}
                        </span>
                        <span className="progress">{member.percent}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="overall">Progress summary unavailable.</p>
              )}

              <button
                type="button"
                className="view-full-detail-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  goToFullProgress();
                }}
              >
                View Full Progress
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SupervisorOverview;
