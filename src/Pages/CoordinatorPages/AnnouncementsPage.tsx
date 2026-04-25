import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import Announcements from '../../components/coordinator/Announcements';
import './AnnouncementsPage.css';

const AnnouncementsPage: React.FC = () => {
  return (
    <div className="app-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />

        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ color: '#0f172a' }}>
                Manage System Announcements
              </h2>
              <p className="overview-subtitle" style={{ color: '#64748b' }}>
                Create and manage announcements for different user roles and levels
              </p>
            </div>

            {/* This includes both the form to post and the widget to view announcements */}
            <Announcements />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnnouncementsPage;