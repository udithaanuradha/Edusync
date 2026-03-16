 import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import MyProjectStatus from '../../components/student/MyProjectStatus';
import Announcements from '../../components/coordinator/Announcements';
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';
import RecentProjects from '../../components/coordinator/RecentProjects';

import './StudentDashboard.css';

const StudentDashboard: React.FC = () => {
  return (
    <div className="app-layout">
      {/* FIXED SIDEBAR */}
      <Sidebar />
      
      <div className="main-viewport">
        {/* FIXED HEADER */}
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            
            {/* HEADER SECTION */}
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Dashboard Overview
              </h2>
              <p className="overview-subtitle">
                Welcome back! Here's what's happening.
              </p>
            </div>

            {/* ROW 1: THE 5 CARDS (1 Row, 5 Columns) */}
            <MyProjectStatus />

            {/* ROW 2: RECENT PROJECTS (Full Width White Section) */}
            <div className="dashboard-row">
              <RecentProjects />
            </div>

            {/* ROW 3: ANNOUNCEMENTS & DEADLINES (Equal 50/50 Split) */}
            <div className="dashboard-row equal-split">
              <Announcements />
              <UpcomingDeadlines />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;