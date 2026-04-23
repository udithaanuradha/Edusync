import React, { useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StageManagement from '../../components/coordinator/StageManagement';
import GroupManagement from '../../components/coordinator/GroupManagement';
import './CoordinatorDashboard.css';
import './CoordinatorLevelPage.css';

type TabKey = 'stages' | 'groups';

interface CoordinatorLevelPageProps {
  levelNumber: number;
}

const CoordinatorLevelPage: React.FC<CoordinatorLevelPageProps> = ({ levelNumber }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('stages');

  return (
    <div className="app-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />

        <main className="content-container">
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
                className={`level-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                aria-selected={activeTab === 'groups'}
                onClick={() => setActiveTab('groups')}
              >
                Project Groups
              </button>
            </div>

            <section className="level-tab-panel">
              {activeTab === 'stages' ? (
                <StageManagement levelNumber={levelNumber} />
              ) : (
                <GroupManagement levelNumber={levelNumber} />
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoordinatorLevelPage;
