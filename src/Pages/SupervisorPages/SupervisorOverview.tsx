import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import './SupervisorOverview.css';

const notificationTabs = ['overall', 'Level1', 'level2', 'level3', 'admin', 'coordinator'] as const;
type NotificationTab = (typeof notificationTabs)[number];

type NotificationItem = {
  id: number;
  title: string;
  count: string;
};

type GroupStudent = {
  name: string;
  status: string;
  progress: string;
};

const notifications: Record<NotificationTab, NotificationItem[]> = {
  overall: [
    { id: 1, title: 'progress updates', count: '30+' },
    { id: 2, title: 'pending report submission', count: '2+' },
    { id: 3, title: 'pending approval', count: '1' },
    { id: 4, title: 'meeting request', count: '3' },
    { id: 5, title: 'pending meeting', count: '2+' },
    { id: 6, title: 'announcement', count: '' }
  ],
  Level1: [
    { id: 1, title: 'Group L1 progress update', count: '' },
    { id: 2, title: 'Level 1 pending review', count: '1' }
  ],
  level2: [
    { id: 1, title: 'Code review pending', count: '2' },
    { id: 2, title: 'Submission review', count: '' }
  ],
  level3: [{ id: 1, title: 'Final evaluation pending', count: '1' }],
  admin: [{ id: 1, title: 'System maintenance', count: '' }],
  coordinator: [{ id: 1, title: 'Coordination needed', count: '1' }]
};

const projectGroups = [
  { id: 1, name: 'group 1', progress: 84, status: 'Completed' },
  { id: 2, name: 'group 2', progress: 92, status: 'Completed' },
  { id: 3, name: 'group 3', progress: 76, status: 'Active' },
  { id: 4, name: 'group 4', progress: 65, status: 'Active' }
];

const groupProgress: { name: string; students: GroupStudent[]; workDone: boolean }[] = [
  {
    name: 'cyan(Jan)',
    students: [
      { name: 'student 1', status: 'active 20min ago', progress: '8%' },
      { name: 'student 2', status: 'active now', progress: '100%' },
      { name: 'student 3', status: 'active hour age', progress: '99%' },
      { name: 'student 4', status: 'offline since 2h', progress: '76%' }
    ],
    workDone: true
  }
];

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
  const [activeTab, setActiveTab] = React.useState<NotificationTab>('overall');
  const [messages] = React.useState(10);
  const [currentGroupIndex, setCurrentGroupIndex] = React.useState(0);
  const [allGroups, setAllGroups] = React.useState<GroupItem[]>([]);
  const [activeLevel, setActiveLevel] = React.useState<number>(1);
  const [loading, setLoading] = React.useState(false);
  const [pendingMeetingsCount, setPendingMeetingsCount] = React.useState(0);

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const raw = localStorage.getItem("user");
        let idStr = "";
        if (raw) {
          const storedUser = JSON.parse(raw);
          idStr = String(storedUser.id ?? storedUser.user_id ?? "");
        }
        if (!idStr) return;

        const response = await fetch(`http://localhost:5000/api/groupdetailstosupervisordashboard/supervisor/${idStr}`);
        if (response.ok) {
          const data = await response.json();
          setAllGroups(data);
        }

        // Fetch pending meeting requests count
        const meetingRes = await fetch(`http://localhost:5000/api/meeting-requests/supervisor/${idStr}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (meetingRes.ok) {
          const meetingData = await meetingRes.json();
          setPendingMeetingsCount(meetingData.length || 0);
        }
      } catch (error) {
        console.error("Failed to fetch groups", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  // Filter groups by the currently active level
  const groupsInLevel = allGroups.filter((g) => g.level === activeLevel);
  const activeGroup = groupsInLevel[currentGroupIndex] || null;

  // Handle Level Tab Clicks
  const handleLevelClick = (level: number) => {
    setActiveLevel(level);
    setCurrentGroupIndex(0); // Reset index when changing level
  };

  return (
    <section className="supervisor-overview">
      <div className="dashboard-header">
        <h1><span>supervisor dashboard</span></h1>
        <div className="welcome-section">
          <span>welcome again</span>
          <div className="profile-icon"><User size={14} /></div>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="left-section">
          <div className="left-top-row">
            <div className="notifications-card">
              <h2>Notifications</h2>

              <div className="notification-tabs">
                {notificationTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="notification-items">
                {notifications[activeTab].map((notif) => (
                  <div key={notif.id} className="notification-row">
                    <div className="notif-title">
                      {notif.title} {notif.count && <span className="count">{notif.count}</span>}
                    </div>
                    <button className="read-btn" type="button">read</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="quick-cards">
              <div className="messages-card small" onClick={() => navigate('/supervisor/approval')} role="button" tabIndex={0}>
                <div className="messages-label">messages</div>
                <div className="messages-count">10 new messages from 3 groups</div>
                <ul className="messages-preview">
                  <li>Group 1: New interim report uploaded</li>
                  <li>Group 2: Code review scheduled</li>
                  <li>Group 1: Meeting confirmed at 10:00</li>
                  <li>Group 3: Documentation updated</li>
                  <li>Group 2: Request for clarification</li>
                  <li>Group 1: Final slides uploaded</li>
                  <li>Group 3: Prototype demo ready</li>
                  <li>Group 2: Bug reported in module X</li>
                  <li>Group 1: Added project code link</li>
                  <li>Group 3: Interim feedback received</li>
                </ul>
              </div>

              <div className="meeting-card small" onClick={() => navigate('/dashboard/calendar', { state: { openMeetingRequests: true } })} role="button" tabIndex={0}>
                <div className="meeting-label">incoming meeting requests</div>
                <div className="meeting-table">
                  <div className="meeting-number">{pendingMeetingsCount}</div>
                  <div className="meeting-text">requests<br />pending</div>
                </div>
              </div>

              <div className="upcoming-event-card small" onClick={() => navigate('/supervisor/schedule-meeting')} role="button" tabIndex={0}>
                <h4>upcoming event</h4>
                <div className="upcoming-count">4 upcomming</div>
              </div>
            </div>
          </div>

          <AnnouncementWidget title="Announcements" maxItems={4} />

          <div className="message-card">
            <div className="message-header">
              <h3>message box</h3>
              <span className="message-count">{messages}+messages</span>
            </div>
            <div className="message-actions">
              <button className="msg-btn" type="button">compose</button>
              <button className="msg-btn" type="button">reply</button>
              <button className="msg-btn" type="button">read</button>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="groups-header">
            <h2>total groups {allGroups.length}...</h2>
          </div>

          <div className="group-tabs">
            {[1, 2, 3, 4].map((level) => {
              const levelGroupsCount = allGroups.filter(g => g.level === level).length;
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
                        strokeDasharray: `${3.14 * 100 * (0 / 100)} 314`
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
                    onClick={() => setCurrentGroupIndex((currentGroupIndex - 1 + groupsInLevel.length) % groupsInLevel.length)}
                    type="button"
                    disabled={groupsInLevel.length <= 1}
                  >
                    previous
                  </button>
                  <button
                    className="view-all-btn"
                    onClick={() => setCurrentGroupIndex((currentGroupIndex + 1) % groupsInLevel.length)}
                    type="button"
                    disabled={groupsInLevel.length <= 1}
                  >
                    next
                  </button>
                </div>
                <button className="view-full-detail-btn" onClick={() => navigate('/supervisor/approval')} type="button">
                  view full detail
                </button>
              </div>
            ) : (
              <div className="group-card">
                <h4>No Groups Found</h4>
                <p style={{ marginTop: '1rem', color: '#666' }}>No groups are assigned for Level {activeLevel}.</p>
              </div>
            )}
          </div>

          {activeGroup && (
            <>
              <div className="group-progress" onClick={() => navigate('/supervisor/approval')} role="button" tabIndex={0}>
                <h3>progress of {activeGroup.groupName}</h3>
                <div className="progress-section-label">work done</div>
                <div className="progress-details">
                  <span className="overall">
                    overal <strong>+0%</strong>
                  </span>
                  {activeGroup.members.split(', ').map((studentName, idx) => (
                    <div key={idx} className="student-item">
                      <span>{studentName}</span>
                      <span className="status">active</span>
                      <span className="progress">0%</span>
                    </div>
                  ))}
                  <button className="view-progress-btn" type="button">view all progress</button>
                </div>
              </div>

              <div className="report-card" onClick={() => navigate('/supervisor/approval')} role="button" tabIndex={0}>
                <h3>report {activeGroup.groupName}</h3>
                <p className="report-subtitle">+0% overall project</p>
                <button className="report-btn" type="button">see report</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default SupervisorOverview;
