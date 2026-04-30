import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import './MentorAnnouncementsPage.css';

const MentorAnnouncementsPage: React.FC = () => {
  return (
    <div className="app-layout mentor-shell">
      <Sidebar />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <section className="mentor-announcements-page">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Mentor Announcements</h2>
              <p className="overview-subtitle">
                Stay updated with system-wide notifications and announcements specifically for Industry Mentors.
              </p>
            </div>

            <div className="mentor-announcements-block">
              <AnnouncementWidget 
                title="Recent System Announcements" 
                maxItems={10} 
                showEditDeleteButtons={false}
                useRoleQuery={true}
                scope="all"
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default MentorAnnouncementsPage;