import React, { useState } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import AssignedGroupTab from '../../components/mentor/AssignedGroupTab';
import GroupTasksTab from '../../components/mentor/GroupTasksTab';
import './Level3mentor.css';
import './LevelTabs.css';

/**
 * Level3mentor Component
 *
 * PURPOSE: Main workspace page for Mentor's Level 3 interface.
 * Identical structure to Level2mentor — only levelNumber differs.
 *
 * TABS:
 *   guidelines → MentorStageManagement (backend connected — DO NOT remove)
 *   group      → AssignedGroupTab (UI only — no backend yet)
 *   tasks      → GroupTasksTab (UI only — no backend yet)
 */
const Level3mentor = () => {

  const [activeTab, setActiveTab] = useState<'guidelines' | 'group' | 'tasks'>('guidelines');
  const levelNumber = 3;

  return (
    <div className="app-layout">

      <MentorSidebarWrapper />

      <div className="main-viewport">

        <Header pageTitle="" />

        <main className="content-container">

          <div className="mentor-page-header">
            <h1 className="mentor-page-title">Level {levelNumber} Projects</h1>
            <p className="mentor-page-subtitle">
              Manage assigned groups and view project stages for Level {levelNumber}.
            </p>
          </div>

          <div className="tab-container-mentor">
            <div className="tab-buttons-mentor">

              <button
                className={`tab-btn-mentor ${activeTab === 'guidelines' ? 'active' : ''}`}
                onClick={() => setActiveTab('guidelines')}
              >
                Guidelines
              </button>

              <button
                className={`tab-btn-mentor ${activeTab === 'group' ? 'active' : ''}`}
                onClick={() => setActiveTab('group')}
              >
                Assigned Group
              </button>

              <button
                className={`tab-btn-mentor ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>

            </div>
          </div>

          <div className="tab-content-viewport">
            {activeTab === 'guidelines' ? (
              <MentorStageManagement levelNumber={levelNumber} />
            ) : activeTab === 'group' ? (
              <AssignedGroupTab onNavigateToTasks={() => setActiveTab('tasks')} />
            ) : (
              <GroupTasksTab />
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default Level3mentor;