import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import AnnouncementWidget from "../../components/shared/AnnouncementWidget";
import "./SupervisorOverview.css";

// ------------------------------------------------------------------
// TYPES & INTERFACES
// ------------------------------------------------------------------
const notificationTabs = [
  "overall",
  "Level1",
  "level2",
  "level3",
  "admin",
  "coordinator",
] as const;
type NotificationTab = (typeof notificationTabs)[number];

type NotificationItem = {
  id: number;
  title: string;
  count: string;
};

type ProjectGroup = {
  id: number;
  name: string;
  progress: number;
  status: string;
};

type GroupStudent = {
  name: string;
  status: string;
  progress: string;
};

const SupervisorOverview: React.FC = () => {
  const navigate = useNavigate();

  // ------------------------------------------------------------------
  // 1. DYNAMIC STATS (Initialized to 0 - Waiting for DB)
  // ------------------------------------------------------------------
  const [stats, setStats] = useState({
    messagesCount: 0,
    messagesGroupCount: 0,
    meetingsToday: 0,
    upcomingEvents: 0,
    totalGroupsCount: 0,
    level2GroupsCount: 0,
  });

  // ------------------------------------------------------------------
  // 2. STRUCTURAL ARRAYS (Initialized Empty - Waiting for DB)
  // ------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<NotificationTab>("overall");
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const [notifications, setNotifications] = useState<
    Record<NotificationTab, NotificationItem[]>
  >({
    overall: [],
    Level1: [],
    level2: [],
    level3: [],
    admin: [],
    coordinator: [],
  });

  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([]);
  const [messagePreviews, setMessagePreviews] = useState<string[]>([]);

  // ------------------------------------------------------------------
  // API FETCH PLACEHOLDER
  // ------------------------------------------------------------------
  useEffect(() => {
    // This is where you will fetch data from your backend later:
    // fetch('/api/dashboard').then(res => res.json()).then(data => { ...set states })
  }, []);

  const activeGroup = projectGroups[currentGroupIndex];

  return (
    <section className="supervisor-overview">
      <div className="dashboard-header">
        <h1>
          <span>supervisor dashboard</span>
        </h1>
        <div className="welcome-section">
          <span>welcome again</span>
          <div className="profile-icon">
            <User size={14} />
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        {/* ========================================= */}
        {/* LEFT SECTION                              */}
        {/* ========================================= */}
        <div className="left-section">
          <div className="left-top-row">
            {/* NOTIFICATIONS CARD */}
            <div className="notifications-card">
              <h2>Notifications</h2>
              <div className="notification-tabs">
                {notificationTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="notification-items">
                {notifications[activeTab].length > 0 ? (
                  notifications[activeTab].map((notif) => (
                    <div key={notif.id} className="notification-row">
                      <div className="notif-title">
                        {notif.title}{" "}
                        {notif.count && (
                          <span className="count">{notif.count}</span>
                        )}
                      </div>
                      <button className="read-btn" type="button">
                        read
                      </button>
                    </div>
                  ))
                ) : (
                  // EMPTY STATE: minHeight prevents layout collapse!
                  <div
                    style={{
                      minHeight: "280px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "14px",
                    }}
                  >
                    No new notifications in this tab.
                  </div>
                )}
              </div>
            </div>

            {/* QUICK CARDS (Messages, Meetings, Upcoming) */}
            <div className="quick-cards">
              <div
                className="messages-card small"
                onClick={() => navigate("/blank")}
                role="button"
                tabIndex={0}
              >
                <div className="messages-label">messages</div>
                <div className="messages-count">
                  {stats.messagesCount} new messages from{" "}
                  {stats.messagesGroupCount} groups
                </div>
                <ul className="messages-preview">
                  {messagePreviews.length > 0 ? (
                    messagePreviews.map((msg, index) => (
                      <li key={index}>{msg}</li>
                    ))
                  ) : (
                    // EMPTY STATE: minHeight prevents layout collapse!
                    <li
                      style={{
                        minHeight: "180px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        border: "none",
                        background: "transparent",
                      }}
                    >
                      No recent messages
                    </li>
                  )}
                </ul>
              </div>

              <div
                className="meeting-card small"
                onClick={() => navigate("/blank")}
                role="button"
                tabIndex={0}
              >
                <div className="meeting-label">meeting time table</div>
                <div className="meeting-table">
                  <div className="meeting-number">{stats.meetingsToday}</div>
                  <div className="meeting-text">
                    meetings
                    <br />
                    today
                  </div>
                </div>
              </div>

              <div
                className="upcoming-event-card small"
                onClick={() => navigate("/blank")}
                role="button"
                tabIndex={0}
              >
                <h4>upcoming event</h4>
                <div className="upcoming-count">
                  {stats.upcomingEvents} upcoming
                </div>
              </div>
            </div>
          </div>

          <AnnouncementWidget title="Announcements" maxItems={4} />

          <div className="message-card">
            <div className="message-header">
              <h3>message box</h3>
              <span className="message-count">
                {stats.messagesCount}+ messages
              </span>
            </div>
            <div className="message-actions">
              <button className="msg-btn" type="button">
                compose
              </button>
              <button className="msg-btn" type="button">
                reply
              </button>
              <button className="msg-btn" type="button">
                read
              </button>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT SECTION                             */}
        {/* ========================================= */}
        <div className="right-section">
          <div className="groups-header">
            <h2>total groups {stats.totalGroupsCount}...</h2>
          </div>

          <div className="group-tabs">
            <button className="group-tab active" type="button">
              level1
            </button>
            <button className="group-tab" type="button">
              level2({stats.level2GroupsCount}group)
            </button>
            <button className="group-tab" type="button">
              level3
            </button>
            <button className="group-tab" type="button">
              level4
            </button>
          </div>

          <div className="groups-grid">
            {projectGroups.length > 0 && activeGroup ? (
              <div className="group-card">
                <h4>{activeGroup.name}</h4>
                <div className="progress-circle">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" className="progress-bg" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="progress-fill"
                      style={{
                        strokeDasharray: `${3.14 * 100 * (activeGroup.progress / 100)} 314`,
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="percentage">{activeGroup.progress}%</span>
                    <span className="status">{activeGroup.status}</span>
                  </div>
                </div>

                <div className="group-navigation">
                  <button
                    className="view-all-btn"
                    onClick={() =>
                      setCurrentGroupIndex(
                        (prev) =>
                          (prev - 1 + projectGroups.length) %
                          projectGroups.length,
                      )
                    }
                    type="button"
                  >
                    previous
                  </button>
                  <button
                    className="view-all-btn"
                    onClick={() =>
                      setCurrentGroupIndex(
                        (prev) => (prev + 1) % projectGroups.length,
                      )
                    }
                    type="button"
                  >
                    next
                  </button>
                </div>
                <button
                  className="view-full-detail-btn"
                  onClick={() => navigate("/blank")}
                  type="button"
                >
                  view full detail
                </button>
              </div>
            ) : (
              // EMPTY STATE: minHeight prevents layout collapse!
              <div
                className="group-card"
                style={{
                  minHeight: "340px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                }}
              >
                You have no assigned groups yet.
              </div>
            )}
          </div>

          <div
            className="group-progress"
            onClick={() => navigate("/blank")}
            role="button"
            tabIndex={0}
          >
            <h3>progress of {activeGroup ? activeGroup.id : "..."}</h3>
            <div className="progress-section-label">work done</div>

            <div className="progress-details">
              <span className="overall">
                overal{" "}
                <strong>+{activeGroup ? activeGroup.progress : 0}%</strong>
              </span>

              {groupStudents.length > 0 ? (
                groupStudents.map((student, idx) => (
                  <div key={idx} className="student-item">
                    <span>{student.name}</span>
                    <span className="status">{student.status}</span>
                    <span className="progress">{student.progress}</span>
                  </div>
                ))
              ) : (
                // EMPTY STATE: minHeight prevents layout collapse!
                <div
                  style={{
                    minHeight: "180px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  No student progress data available.
                </div>
              )}

              <button className="view-progress-btn" type="button">
                view all progress
              </button>
            </div>
          </div>

          <div
            className="report-card"
            onClick={() => navigate("/blank")}
            role="button"
            tabIndex={0}
          >
            <h3>report {activeGroup ? activeGroup.id : "..."}</h3>
            <p className="report-subtitle">
              +{activeGroup ? activeGroup.progress : 0}% overall project
            </p>
            <button className="report-btn" type="button">
              see report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupervisorOverview;
