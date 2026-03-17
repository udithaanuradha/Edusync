import React from 'react';
import { Megaphone } from 'lucide-react';
import './Announcements.css';

interface Announcement {
  id: number;
  title: string;
  time: string;
  priority: 'High' | 'Medium' | 'Low';
}

const announcementsData: Announcement[] = [
  {
    id: 1,
    title: 'System Maintenance scheduled for Friday night.',
    time: '2 hours ago',
    priority: 'High',
  },
  {
    id: 2,
    title: 'New evaluation guidelines uploaded for Level 4.',
    time: 'Yesterday',
    priority: 'Medium',
  },
  {
    id: 3,
    title: 'Welcome to the new EduSync portal!',
    time: 'Oct 10, 2025',
    priority: 'Low',
  },
];

const Announcements: React.FC = () => {
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-default';
    }
  };

  return (
    <div className="announcements-card">
      <div className="card-header">
        <Megaphone size={20} className="header-icon" />
        <h3 className="card-title">Announcements</h3>
      </div>

      <div className="announcements-list">
        {announcementsData.map((announcement) => (
          <div className="announcement-item" key={announcement.id}>
            <div className="announcement-content">
              <h4 className="announcement-title">{announcement.title}</h4>
              <span className="announcement-time">{announcement.time}</span>
            </div>
            <span className={`priority-badge ${getPriorityClass(announcement.priority)}`}>
              {announcement.priority}
            </span>
          </div>
        ))}
      </div>

      <button className="view-all-btn">View All Updates</button>
    </div>
  );
};

export default Announcements;