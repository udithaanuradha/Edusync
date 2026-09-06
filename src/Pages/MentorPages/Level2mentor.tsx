import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import GroupTasksTab from '../../components/mentor/GroupTasksTab';
import MentorStudentSubmissions from '../../components/mentor/MentorStudentSubmissions';
import MentorDelayedTasksTab from '../../components/mentor/MentorDelayedTasksTab';
import './Level3mentor.css';   /* Shared layout CSS for all mentor level pages */
import './LevelTabs.css';      /* Shared tab utility styles */

/**
 * Level2mentor Component
 *
 * PURPOSE: Main workspace page for Mentor's Level 2 interface.
 *
 * RESTRICTION LOGIC:
 *   - Checks if the logged-in mentor has any active project groups assigned at Level 2.
 *   - If assigned: displays operational tabs (Stage Documents, Tasks, Student Submissions, Delayed Tasks).
 *   - If not assigned: displays an access notification card with return to dashboard action.
 */
const Level2mentor = () => {
  const navigate = useNavigate();

  /* Active tab state — 4 operational tabs (Stage Documents, Tasks, Student Submissions, Delayed Tasks) */
  const [activeTab, setActiveTab] = useState<'guidelines' | 'tasks' | 'submissions' | 'delays'>('guidelines');
  const [hasAssignedGroup, setHasAssignedGroup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /* This page is Level 2 */
  const levelNumber = 2;

  // Check assignment status on mount
  useEffect(() => {
    const checkAssignment = async () => {
      try {
        setLoading(true);
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (mentorId) headers['x-user-id'] = String(mentorId);
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = mentorId
          ? `http://localhost:5000/api/mentor/groups?mentorId=${mentorId}&level=${levelNumber}`
          : `http://localhost:5000/api/groups/level/${levelNumber}`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          const result = await res.json();
          let groups: any[] = [];
          if (Array.isArray(result)) groups = result;
          else if (result && Array.isArray(result.data)) groups = result.data;
          else if (result && Array.isArray(result.groups)) groups = result.groups;

          setHasAssignedGroup(groups.length > 0);
        } else {
          setHasAssignedGroup(false);
        }
      } catch (err) {
        console.error(`Assignment check error for Level ${levelNumber}:`, err);
        setHasAssignedGroup(false);
      } finally {
        setLoading(false);
      }
    };

    checkAssignment();
  }, [levelNumber]);

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
              Manage assigned stages and tasks for Level {levelNumber}.
            </p>
          </div>

          {loading ? (
            <div className="mentor-level-loading">
              <div className="mentor-level-spinner"></div>
              <span>Checking level assignment...</span>
            </div>
          ) : hasAssignedGroup === false ? (
            /* ── Unassigned Notification Card ── */
            <div className="mentor-unassigned-card">
              <div className="mentor-unassigned-icon-wrap">
                <ShieldAlert size={32} />
              </div>
              <span className="mentor-unassigned-badge">Access Notice</span>
              <h3 className="mentor-unassigned-title">You are not assigned to Level {levelNumber}</h3>
              <p className="mentor-unassigned-desc">
                You do not currently have any active project groups assigned at Level {levelNumber}.
                You can only view project guidelines and tasks for academic levels where you have active group assignments.
              </p>
              <button
                className="mentor-unassigned-btn"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft size={16} />
                Return to Dashboard
              </button>
            </div>
          ) : (
            /* ── Assigned Level Workspace ── */
            <>
              {/* ── Tab Navigation  ────────────────── */}
              <div className="tab-container-mentor">
                <div className="tab-buttons-mentor">

                  {/* Stage Documents tab */}
                  <button
                    className={`tab-btn-mentor ${activeTab === 'guidelines' ? 'active' : ''}`}
                    onClick={() => setActiveTab('guidelines')}
                  >
                    Stage Documents
                  </button>

                  {/* Tasks tab */}
                  <button
                    className={`tab-btn-mentor ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                  >
                    Tasks
                  </button>

                  {/* Student Submissions tab */}
                  <button
                    className={`tab-btn-mentor ${activeTab === 'submissions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('submissions')}
                  >
                    Student Submissions
                  </button>

                  {/* Delayed Tasks tab */}
                  <button
                    className={`tab-btn-mentor ${activeTab === 'delays' ? 'active' : ''}`}
                    onClick={() => setActiveTab('delays')}
                  >
                    Delayed Tasks
                  </button>

                </div>
              </div>

              {/* ── Tab Content ───────────────────────────────────── */}
              <div className="tab-content-viewport">
                {activeTab === 'guidelines' && <MentorStageManagement levelNumber={levelNumber} />}
                {activeTab === 'tasks' && <GroupTasksTab levelNumber={levelNumber} />}
                {activeTab === 'submissions' && <MentorStudentSubmissions levelNumber={levelNumber} />}
                {activeTab === 'delays' && <MentorDelayedTasksTab levelNumber={levelNumber} />}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
};

export default Level2mentor;