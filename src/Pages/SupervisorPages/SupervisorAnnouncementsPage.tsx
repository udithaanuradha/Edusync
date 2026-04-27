import React from "react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import AnnouncementWidget from "../../components/shared/AnnouncementWidget";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import SupervisorAnnouncements from "../../components/supervisor/Announcements";
import "./SupervisorDashboard.css";
import "./SupervisorAnnouncementsPage.css";

const SupervisorAnnouncementsPage: React.FC = () => {
  return (
    <div className="app-layout supervisor-shell">
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header />

        <main className="content-container supervisor-content-container">
          <section className="supervisor-announcements-page">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Supervisor Announcements</h2>
              <p className="overview-subtitle">
                Review announcements from others, then manage your own recent
                announcements below.
              </p>
            </div>

            <div className="supervisor-announcements-note">
              The top section shows announcements uploaded by other users. The
              lower section contains only your own recent announcements, where
              you can edit or delete items.
            </div>

            <div className="supervisor-announcements-block">
              <div className="supervisor-announcements-block-header">
                <h3>Recent Announcements</h3>
                <p>Announcements uploaded by others.</p>
              </div>

              <AnnouncementWidget
                title="Recent Announcements"
                maxItems={8}
                showEditDeleteButtons={false}
                scope="others"
                useRoleQuery={false}
              />
            </div>

            <div className="supervisor-announcements-block">
              <div className="supervisor-announcements-block-header">
                <h3>Supervisor's Recent Announcements</h3>
                <p>Create, edit, and delete your own announcements here.</p>
              </div>

              <SupervisorAnnouncements />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SupervisorAnnouncementsPage;
