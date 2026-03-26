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
      {/* 1. SIDEBAR: Stays on the left */}
      <Sidebar />
      
      <div className="main-viewport">
        {/* 2. HEADER: Stays at the top */}
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Dashboard Overview
              </h2>
              <p className="overview-subtitle">
                Welcome back! Here's what's happening.
              </p>
            </div>

            {/* ROW 1: Project Cards */}
            <MyProjectStatus />

            {/* ROW 2: Full Width Section */}
            <div className="dashboard-row">
              <RecentProjects />
            </div>

            {/* ROW 3: Split View */}
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