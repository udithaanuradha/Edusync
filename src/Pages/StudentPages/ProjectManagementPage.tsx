 import React, { useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import './ProjectManagementPage.css';

const tabItems = [
  { key: 'timeline', label: 'Project Timeline' },
  { key: 'createTasks', label: 'Task Creation' },
  { key: 'myTasks', label: 'My Tasks' },
] as const;

type TabKey = (typeof tabItems)[number]['key'];
type UserRole = 'leader' | 'member';

const ProjectManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [userRole, setUserRole] = useState<UserRole>('member'); // Default to member

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Project Timeline ({userRole === 'leader' ? 'Leader View' : 'Member View'})</h3>
              <p>View the timeline of your project stages and milestones.</p>
            </div>
            {/* Timeline content here */}
          </div>
        );
      case 'createTasks':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Task Creation</h3>
              {userRole === 'leader' ? (
                <p>Create and assign tasks to your group members.</p>
              ) : (
                <p className="role-warning">Only Leaders can create tasks. You are currently viewing as a Member.</p>
              )}
            </div>
          </div>
        );
      case 'myTasks':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>My Tasks</h3>
              <p>View and track your assigned tasks.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 className="overview-title">Project Management</h2>
                <p className="overview-subtitle">Manage your project milestones and tasks.</p>
              </div>

              {/* NEW ROLE SELECTOR BUTTONS */}
              <div className="role-selector-container">
                <button 
                  className={`role-btn ${userRole === 'leader' ? 'active-leader' : ''}`}
                  onClick={() => setUserRole('leader')}
                >
                  Leader
                </button>
                <button 
                  className={`role-btn ${userRole === 'member' ? 'active-member' : ''}`}
                  onClick={() => setUserRole('member')}
                >
                  Member
                </button>
              </div>
            </div>

            <div className="student-inner-pages">
              <div className="student-inner-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab.key}
                    className={`student-inner-tab ${activeTab === tab.key ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="student-inner-content">
                <div className="student-inner-panel">{renderContent()}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectManagementPage;