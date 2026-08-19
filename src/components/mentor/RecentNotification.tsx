// src/components/mentor/RecentNotifications.tsx
import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, MessageCircle, Clock } from 'lucide-react';
import './RecentNotifications.css';

interface Notification {
  id: string;
  text: string;
  date: string;
  type: 'file' | 'alert' | 'feedback' | 'deadline';
}

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/mentor/notifications');
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <div className="notifications-card">
      <h2 className="section-title">Recent Notifications</h2>

      {loading ? (
        <p className="notif-date">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="notif-date">No notifications yet.</p>
      ) : (
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
      )}
    </div>
  );
};

export default RecentNotifications;