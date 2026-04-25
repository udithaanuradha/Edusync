 import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MentorSidebar from '../../components/mentor/MentorSidebar';
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
      <MentorSidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <Routes>
            {/* This renders at /mentor */}
            <Route index element={<MentorDashboard />} />

            {/* Placeholder routes for Sidebar links */}
            <Route path="calendar" element={<div>Calendar Content</div>} />
            <Route path="communication" element={<div>Communication Content</div>} />
            <Route path="announcements" element={<div>Announcements Content</div>} />
            <Route path="project-groups" element={<div>Groups Content</div>} />
            <Route path="guidelines" element={<div>Guidelines Content</div>} />
            <Route path="project-delays" element={<div>Delays Content</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// FIXED: Essential for App.tsx to find this file
export default MentorOverview;