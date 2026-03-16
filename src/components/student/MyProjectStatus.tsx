 import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle, FiUsers, FiCalendar } from 'react-icons/fi';
import './MyProjectStatus.css';

const MyProjectStatus: React.FC = () => {
  const stats = [
    { label: 'Completion', value: '75%', icon: <FiCheckCircle />, color: '#059669', bg: '#ecfdf5' },
    { label: 'Tasks Done', value: '12/15', icon: <FiClock />, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Delayed', value: '1', icon: <FiAlertCircle />, color: '#dc2626', bg: '#fef2f2' },
    { label: 'Members', value: '3', icon: <FiUsers />, color: '#d97706', bg: '#fffbeb' },
    { label: 'Deadline', value: '20 Dec', icon: <FiCalendar />, color: '#4b5563', bg: '#f9fafb' },
  ];

  return (
    <div className="student-stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card-view">
          <div className="stat-icon-box" style={{ backgroundColor: stat.bg, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="stat-text-content">
            <span className="stat-value-text">{stat.value}</span>
            <span className="stat-label-text">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyProjectStatus;