import React, { useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StageManagement from '../../components/coordinator/StageManagement';
import GroupManagement from '../../components/coordinator/GroupManagement';
import ApprovedRequests from '../../components/coordinator/ApprovedRequests';
import GradebookTable from '../../components/coordinator/GradebookTable';
import { ApprovedGroupRequest } from '../../components/coordinator/groupRequestTypes';
import './CoordinatorDashboard.css';
import './CoordinatorLevelPage.css';

type TabKey = 'stages' | 'requests' | 'groups' | 'marking';

interface CoordinatorLevelPageProps {
  levelNumber: number;
}

const CoordinatorLevelPage: React.FC<CoordinatorLevelPageProps> = ({ levelNumber }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('stages');
  const [prefillRequest, setPrefillRequest] = useState<ApprovedGroupRequest | null>(null);

  // Let coordinators jump from an approved submission directly into group creation.
  const handleCreateGroupFromRequest = (request: ApprovedGroupRequest) => {
    setPrefillRequest(request);
    setActiveTab('groups');
  };

  return (
    <div
      className="app-layout coordinator-level-shell"
      style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}
    >
      <Sidebar />

      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />

        <main className="content-container coordinator-level-content">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ color: '#0f172a' }}>
                Level {levelNumber} Management
              </h2>
              <p className="overview-subtitle" style={{ color: '#64748b' }}>
                Manage and create project stages and groups for Level {levelNumber} students
              </p>
            </div>

            <div className="level-tabs-wrap" role="tablist" aria-label={`Level ${levelNumber} management tabs`}>
              {/* Split the level workflow into stage setup, submissions, group management, and marking. */}
              <button
                role="tab"
                className={`level-tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
                aria-selected={activeTab === 'stages'}
                onClick={() => setActiveTab('stages')}
              >
                Project Stages
              </button>
              <button
                role="tab"
                className={`level-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                aria-selected={activeTab === 'requests'}
                onClick={() => setActiveTab('requests')}
              >
                Student Submissions
              </button>
              <button
                role="tab"
                className={`level-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                aria-selected={activeTab === 'groups'}
                onClick={() => setActiveTab('groups')}
              >
                Project Groups
              </button>
              <button
                role="tab"
                className={`level-tab-btn ${activeTab === 'marking' ? 'active' : ''}`}
                aria-selected={activeTab === 'marking'}
                onClick={() => setActiveTab('marking')}
              >
                Marking & Evaluation
              </button>
            </div>

            <section className="level-tab-panel">
              {activeTab === 'stages' ? (
                <StageManagement levelNumber={levelNumber} />
              ) : activeTab === 'requests' ? (
                <ApprovedRequests
                  levelNumber={levelNumber}
                  onCreateGroup={handleCreateGroupFromRequest}
                />
              ) : activeTab === 'groups' ? (
                <GroupManagement
                  levelNumber={levelNumber}
                  initialRequest={prefillRequest}
                  onPrefillHandled={() => setPrefillRequest(null)}
                />
              ) : (
                <GradebookTable levelNumber={levelNumber} />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoordinatorLevelPage;
