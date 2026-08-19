import React, { useState } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import AssignedGroupTab from '../../components/mentor/AssignedGroupTab';
import GroupTasksTab from '../../components/mentor/GroupTasksTab';
import './Level3mentor.css';   /* Shared layout CSS for all mentor level pages */
import './LevelTabs.css';      /* Shared tab utility styles */

/**
 * Level2mentor Component
 *
 * PURPOSE: Main workspace page for Mentor's Level 2 interface.
 *
 * TABS:
 *   guidelines → MentorStageManagement (backend connected — DO NOT remove)
 *   group      → AssignedGroupTab (UI only — no backend yet)
 *   tasks      → GroupTasksTab (UI only — no backend yet)
 *
 * The "See Tasks" button inside AssignedGroupTab calls
 * setActiveTab('tasks') via the onNavigateToTasks prop.
 *
 * LEVEL NUMBER: hardcoded as 2 for this page instance.
 */
const Level2mentor = () => {

  /* Active tab state — 'tasks' added for the Group Tasks view */
  const [activeTab, setActiveTab] = useState<'guidelines' | 'group' | 'tasks'>('guidelines');

  /* This page is always Level 2 */
  const levelNumber = 2;

  return (
    <div className="app-layout">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <MentorSidebarWrapper />

      <div className="main-viewport">

        {/* ── Shared Header ─────────────────────────────────── */}
        <Header pageTitle="" />

        <main className="content-container">

          {/* ── Page title ───────────────────── */}
          <div className="mentor-page-header">
            <h1 className="mentor-page-title">Level {levelNumber} Projects</h1>
            <p className="mentor-page-subtitle">
              Manage assigned groups and view project stages for Level {levelNumber}.
            </p>
          </div>

          {/* ── Tab Navigation  ────────────────── */}
          <div className="tab-container-mentor">
            <div className="tab-buttons-mentor">

              {/* Guidelines tab */}
              <button
                className={`tab-btn-mentor ${activeTab === 'guidelines' ? 'active' : ''}`}
                onClick={() => setActiveTab('guidelines')}
              >
                Guidelines
              </button>

              {/* Assigned Group tab */}
              <button
                className={`tab-btn-mentor ${activeTab === 'group' ? 'active' : ''}`}
                onClick={() => setActiveTab('group')}
              >
                Assigned Group
              </button>

              {/* Tasks tab — reachable via "See Tasks" button or direct click */}
              <button
                className={`tab-btn-mentor ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>

            </div>
          </div>

          {/* ── Tab Content ───────────────────────────────────── */}
          <div className="tab-content-viewport">
            {activeTab === 'guidelines' ? (
              /* BACKEND CONNECTED — do not remove or change */
              <MentorStageManagement levelNumber={levelNumber} />
            ) : activeTab === 'group' ? (
              /* UI ONLY — passes callback to navigate to tasks tab */
              <AssignedGroupTab onNavigateToTasks={() => setActiveTab('tasks')} />
            ) : (
              /* UI ONLY — group tasks view */
              <GroupTasksTab />
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default Level2mentor;