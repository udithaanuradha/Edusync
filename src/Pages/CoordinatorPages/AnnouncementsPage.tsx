import React from 'react';
import AppShell from '../../components/shared/layout/AppShell';
import Announcements from '../../components/coordinator/Announcements';
import './AnnouncementsPage.css';

const AnnouncementsPage: React.FC = () => {
  return (
    <AppShell>
      <div className="announcements-page-shell">
        <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Manage System Announcements</h2>
              <p className="overview-subtitle">
                Create and manage announcements for different user roles and levels
              </p>
            </div>

            {/* This includes both the form to post and the widget to view announcements */}
            <Announcements />
        </div>
      </div>
    </AppShell>
  );
};

export default AnnouncementsPage;