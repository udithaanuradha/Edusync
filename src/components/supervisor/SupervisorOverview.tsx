import React, { useMemo, useState } from 'react';
import './SupervisorOverview.css';

type Group = {
  id: number;
  name: string;
  progress: number;
  status: 'Completed' | 'Active';
};

const tabs = ['overall', 'Level1', 'level2', 'level3', 'admin', 'coordinator'];

const tabNotifications: Record<string, Array<{ title: string; count?: string }>> = {
  overall: [
    { title: 'progress updates', count: '30+' },
    { title: 'pending report submission', count: '2+' },
    { title: 'pending approval', count: '1' },
    { title: 'meeting request', count: '3' },
    { title: 'pending meeting', count: '2+' },
    { title: 'announcement' }
  ],
  Level1: [
    { title: 'Group L1 progress update' },
    { title: 'Level 1 pending review', count: '1' }
  ],
  level2: [
    { title: 'Code review pending', count: '2' },
    { title: 'Submission review' }
  ],
  level3: [{ title: 'Final evaluation pending', count: '1' }],
  admin: [{ title: 'System maintenance' }],
  coordinator: [{ title: 'Coordination needed', count: '1' }]
};

const groups: Group[] = [
  { id: 1, name: 'Group 1', progress: 84, status: 'Completed' },
  { id: 2, name: 'Group 2', progress: 92, status: 'Completed' },
  { id: 3, name: 'Group 3', progress: 76, status: 'Active' },
  { id: 4, name: 'Group 4', progress: 65, status: 'Active' }
];

const studentRows = [
  { name: 'student 1', status: 'active 20min ago', progress: '8%' },
  { name: 'student 2', status: 'active now', progress: '100%' },
  { name: 'student 3', status: 'active hour ago', progress: '99%' },
  { name: 'student 4', status: 'offline since 2h', progress: '76%' }
];

const messageItems = [
  'Group 1: New interim report uploaded',
  'Group 2: Code review scheduled',
  'Group 1: Meeting confirmed at 10:00',
  'Group 3: Report pending feedback',
  'Group 2: Meeting request accepted'
];

const SupervisorOverview: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overall');
  const [groupIndex, setGroupIndex] = useState(0);

  const currentGroup = groups[groupIndex];

  const progressStyle = useMemo(() => {
    const r = 52;
    const circumference = 2 * Math.PI * r;
    const dash = (currentGroup.progress / 100) * circumference;
    return {
      strokeDasharray: `${dash} ${circumference}`
    };
  }, [currentGroup.progress]);

  return (
    <section className="supervisor-overview">
      <div className="supervisor-headline">
        <h2>supervisor dashboard</h2>
      </div>

      <div className="supervisor-grid">
        <div className="left-column">
          <article className="card notifications">
            <div className="notifications-main">
              <h3>Notifications</h3>
              <div className="tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={tab === activeTab ? 'tab active' : 'tab'}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="notification-list">
                {tabNotifications[activeTab].map((item, idx) => (
                  <div className="notification-row" key={`${item.title}-${idx}`}>
                    <div className="notification-title">
                      {item.title} {item.count ? <span>{item.count}</span> : null}
                    </div>
                    <button type="button" className="small-read-btn">read</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="notifications-side">
              <article className="mini-card messages-mini-card">
                <h4>messages</h4>
                <p>10 new messages from 3 groups</p>
                <ul>
                  {messageItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="mini-card meeting-mini-card">
                <h4>meeting time table</h4>
                <div className="meeting-mini-box">
                  <strong>2</strong>
                  <span>meetings today</span>
                </div>
              </article>

              <article className="mini-card upcoming-mini-card">
                <h4>upcoming event</h4>
                <p>4 upcoming</p>
              </article>
            </div>
          </article>

          <article className="card actions">
            <h3>Create announcement</h3>
            <button type="button" className="create-btn">create</button>
          </article>

          <article className="card actions">
            <div className="message-top">
              <h3>message box</h3>
              <span>10+messages</span>
            </div>
            <div className="message-buttons">
              <button type="button">compose</button>
              <button type="button">reply</button>
              <button type="button">read</button>
            </div>
          </article>
        </div>

        <div className="right-column">
          <article className="card groups-title">
            <h3>total groups 10...</h3>
          </article>

          <article className="card levels">
            <button type="button" className="active">level1</button>
            <button type="button">level2(3group)</button>
            <button type="button">level3</button>
            <button type="button">level4</button>
          </article>

          <article className="card group-card">
            <h4>{currentGroup.name}</h4>
            <div className="ring-wrap">
              <svg viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="52" className="ring-bg" />
                <circle cx="65" cy="65" r="52" className="ring-fill" style={progressStyle} />
              </svg>
              <div className="ring-label">
                <strong>{currentGroup.progress}%</strong>
                <span>{currentGroup.status}</span>
              </div>
            </div>
            <div className="group-switch">
              <button type="button" onClick={() => setGroupIndex((prev) => (prev - 1 + groups.length) % groups.length)}>
                previous
              </button>
              <button type="button" onClick={() => setGroupIndex((prev) => (prev + 1) % groups.length)}>
                next
              </button>
            </div>
            <button type="button" className="primary-btn">view full detail</button>
          </article>

          <article className="card progress-board">
            <div className="progress-header">
              <h3>progress of 1</h3>
              <span>work done</span>
            </div>
            <p className="progress-summary">
              overal <strong>+84%</strong>
            </p>
            {studentRows.map((row) => (
              <div className="student-row" key={row.name}>
                <span>{row.name}</span>
                <span>{row.status}</span>
                <span>{row.progress}</span>
              </div>
            ))}
            <button type="button" className="primary-btn">view all progress</button>
          </article>

          <article className="card report-card">
            <h3>report 1</h3>
            <p>+33% overall project</p>
            <button type="button" className="purple-btn">see report</button>
          </article>
        </div>
      </div>
    </section>
  );
};

export default SupervisorOverview;
