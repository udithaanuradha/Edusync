import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StatCards from '../../components/mentor/StatCard'; // FIXED: Plural import
import RecentProjects from '../../components/mentor/RecentProjects';
import StudentAttention from '../../components/mentor/StudentAttention';
import RecentNotifications from '../../components/mentor/RecentNotification';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import './MentorDashboard.css';

// 1. Internal Dashboard Content
const MentorDashboard: React.FC = () => {
  return (
    <div className="mentor-overview">
      <div className="dashboard-header-section">
        <h2 className="overview-title">Dashboard Overview</h2>
        <p className="overview-subtitle">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>
      
      {/* FIXED: Using StatCards (plural) which handles its own data fetching */}
      <StatCards />
    
      <div className="overview-row"><RecentProjects /></div>
      <div className="overview-row"><AnnouncementWidget title="Announcements" maxItems={4} /></div>
      <div className="overview-row"><StudentAttention /></div>
      <div className="overview-row"><RecentNotifications /></div>
    </div>
  );
};

// 2. Main Layout Wrapper
const MentorOverview: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <MentorDashboard />
        </main>
      </div>
    </div>
  );
};

// FIXED: Essential for App.tsx to find this file
export default MentorOverview;