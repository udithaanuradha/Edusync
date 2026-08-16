import React from "react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import AnnouncementWidget from "../../components/shared/AnnouncementWidget";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import SupervisorAnnouncements from "../../components/supervisor/Announcements";
import "./SupervisorDashboard.css";
import "./SupervisorAnnouncementsPage.css";

/**
 * SupervisorAnnouncementsPage Component
 *
 * Provides a specialized view for supervisors to interact with announcements.
 * Structure:
 * 1. Global View: Recent announcements from other roles (Read-only).
 * 2. Personal Management: Supervisor's own announcements (Create/Edit/Delete).
 */
const SupervisorAnnouncementsPage: React.FC = () => {
  return (
    /* Main application layout using the shared supervisor shell grid */
    <div className="app-layout supervisor-shell">
      {/* 
          SIDEBAR STACK 
          Combines the global navigation with the supervisor-specific menu.
      */}
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        {/* Top navigation/profile bar */}
        <Header />

        {/* 
            MAIN CONTENT AREA 
            The 'supervisor-content-container' handles padding and scroll behavior.
        */}
        <main className="content-container supervisor-content-container">
          <section className="supervisor-announcements-page">
            {/* PAGE HEADER: Provides context for the supervisor */}
            <div className="dashboard-header-section">
              <h2 className="overview-title">Supervisor Announcements</h2>
              <p className="overview-subtitle">
                Review announcements from others, then manage your own recent
                announcements below.
              </p>
            </div>

            {/* INFORMATIONAL NOTE: Explains the distinction between the two sections */}
            <div className="supervisor-announcements-note">
              The top section shows announcements uploaded by other users. The
              lower section contains only your own recent announcements, where
              you can edit or delete items.
            </div>

            {/* 
                SECTION 1: GLOBAL ANNOUNCEMENTS 
                Uses the shared 'AnnouncementWidget' configured to 'others' scope.
                Editing capabilities are disabled here.
            */}
            <div className="supervisor-announcements-block">
              <div className="supervisor-announcements-block-header">
                <h3>Recent Announcements</h3>
                <p>Announcements uploaded by others.</p>
              </div>

              <AnnouncementWidget
                title="Recent Announcements"
                maxItems={8}
                showEditDeleteButtons={false} // Read-only mode
                scope="others" // Fetches non-supervisor posts
                useRoleQuery={false}
              />
            </div>

            {/* 
                SECTION 2: PERSONAL MANAGEMENT 
                Uses the supervisor-specific 'Announcements' component.
                This component handles the CRUD (Create, Read, Update, Delete) logic.
            */}
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
