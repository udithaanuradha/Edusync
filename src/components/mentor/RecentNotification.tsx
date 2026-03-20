// src/components/mentor/RecentNotifications.tsx
import React from 'react';
import { FileText, AlertCircle, MessageCircle, Clock } from 'lucide-react';
import './RecentNotifications.css';

// ── Inline mock data (replace with API call when backend is ready) ─────────
const notifications = [
  { id: 'n1', text: 'Map_Integration_Notes.docx uploaded by Group A', date: '2 hours ago', type: 'file'     },
  { id: 'n2', text: 'Prototype task delayed in Group C',               date: '1 day ago',   type: 'alert'    },
  { id: 'n3', text: 'New feedback on Group B project',                 date: '2 days ago',  type: 'feedback' },
  { id: 'n4', text: 'Deadline approaching: Testing Phase - Group C',   date: '3 days ago',  type: 'deadline' },
  { id: 'n5', text: 'Database_Schema.pdf submitted by Group B',        date: '5 days ago',  type: 'file'     },
];
// ──────────────────────────────────────────────────────────────────────────

type NotifType = 'file' | 'alert' | 'feedback' | 'deadline';

const notifIcons: Record<NotifType, React.ReactNode> = {
  file:     <FileText size={15} />,
  alert:    <AlertCircle size={15} />,
  feedback: <MessageCircle size={15} />,
  deadline: <Clock size={15} />,
};

const notifColorClass: Record<NotifType, string> = {
  file:     'notif-icon-file',
  alert:    'notif-icon-alert',
  feedback: 'notif-icon-feedback',
  deadline: 'notif-icon-deadline',
};

const RecentNotifications: React.FC = () => {
  return (
    <div className="notifications-card">
      <h2 className="section-title">Recent Notifications</h2>

      <div className="notifications-list">
        {notifications.map(notif => {
          const type = notif.type as NotifType;
          return (
            <div key={notif.id} className="notif-item">
              <div className={`notif-icon-wrapper ${notifColorClass[type]}`}>
                {notifIcons[type]}
              </div>
              <div className="notif-body">
                <p className="notif-text">{notif.text}</p>
                <p className="notif-date">{notif.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentNotifications;