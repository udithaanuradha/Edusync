import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Users, Calendar, Megaphone } from 'lucide-react';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import { useAuth } from '../../context/AuthContext';
import { useSocketV2 } from '../../hooks/useSocketV2';
import { fetchConversationsV2 } from '../../utils/apiV2';
import { ConversationV2, MessageV2 } from '../../types/chatV2';
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

const SupervisorOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToMessages } = useSocketV2();

  const [activeTab, setActiveTab] = useState<NotificationTab>('overall');
  const [conversations, setConversations] = useState<ConversationV2[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [allGroups, setAllGroups] = useState<GroupItem[]>([]);
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [pendingMeetingsCount, setPendingMeetingsCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [evaluationPanels, setEvaluationPanels] = useState<StoredPanel[]>([]);

  useEffect(() => {
    const readPanels = () => {
      try {
        const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
        if (!raw) {
          setEvaluationPanels([]);
          return;
        }

        const parsed = JSON.parse(raw) as StoredPanel[];
        setEvaluationPanels(Array.isArray(parsed) ? parsed : []);
      } catch {
        setEvaluationPanels([]);
      }
    };

    readPanels();
    window.addEventListener('storage', readPanels);
    return () => window.removeEventListener('storage', readPanels);
  }, []);

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

      // 3. Fetch announcements independently
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
    window.addEventListener("storage", handleReadUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("announcementsReadUpdated", handleReadUpdate);
      window.removeEventListener("meetingRequestUpdated", handleReadUpdate);
      window.removeEventListener("storage", handleReadUpdate);
    };
  }, [user]);

  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Filter groups by the currently active level
  const groupsInLevel = allGroups.filter((g) => g.level === activeLevel);
  const activeGroup = groupsInLevel[currentGroupIndex] || null;

  // Handle Level Tab Clicks
  const handleLevelClick = (level: number) => {
    setActiveLevel(level);
    setCurrentGroupIndex(0);
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
            className="header-stat-card highlight-card"
            onClick={() => {
              sessionStorage.setItem("openScheduler", "true");
              navigate('/dashboard/calendar?open=scheduler', { state: { openTimelineScheduler: true } });
            }}
            role="button"
            tabIndex={0}
            title="Open Timeline Scheduler"
          >
            <div className="stat-badge-icon schedule-bg">
              <Calendar size={18} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Timeline Scheduler</div>
              <div className="stat-value">
                <span className="schedule-link">Open Planner ↗</span>
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
                  <div className="notif-title">No evaluation panels scheduled yet.</div>
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
                      onClick={() => navigate('/supervisor/evaluation-panel')}
                    >
                      view
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="message-card">
            <div className="message-header">
              <h3>message box</h3>
              <span className="message-count">
                {totalUnreadMessages > 0 ? `${totalUnreadMessages} unread` : `${conversations.length} active`}
              </span>
            </div>
            <div className="message-actions">
              <button
                className="msg-btn"
                type="button"
                onClick={() => navigate('/dashboard/communication-v2')}
              >
                open chat (v2)
              </button>
              <button
                className="msg-btn"
                type="button"
                onClick={() => navigate('/dashboard/communication-v2')}
              >
                read
              </button>
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

          <div className="groups-grid">
            {activeGroup ? (
              <div key={activeGroup.groupId} className="group-card">
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
                        strokeDasharray: `${3.14 * 100 * (0 / 100)} 314`,
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="percentage">0%</span>
                    <span className="status">Active</span>
                  </div>
                </div>
                <div className="group-navigation">
                  <button
                    className="view-all-btn"
                    onClick={() =>
                      setCurrentGroupIndex(
                        (currentGroupIndex - 1 + groupsInLevel.length) % groupsInLevel.length
                      )
                    }
                    type="button"
                    disabled={groupsInLevel.length <= 1}
                  >
                    previous
                  </button>
                  <button
                    className="view-all-btn"
                    onClick={() =>
                      setCurrentGroupIndex((currentGroupIndex + 1) % groupsInLevel.length)
                    }
                    type="button"
                    disabled={groupsInLevel.length <= 1}
                  >
                    next
                  </button>
                </div>
              </div>
            ) : (
              <div className="group-card">
                <p>no groups found for level {activeLevel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupervisorOverview;
