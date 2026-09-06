import React, { useState } from 'react';
import AppShell from '../../components/shared/layout/AppShell';
import { coordinatorMenuItems } from '../../components/shared/Sidebar';
import StageManagement from '../../components/coordinator/StageManagement';
import GroupManagement from '../../components/coordinator/GroupManagement';
import ApprovedRequests from '../../components/coordinator/ApprovedRequests';
import GradebookTable from '../../components/coordinator/GradebookTable';
import CoordinatorReportPanel from '../../components/coordinator/CoordinatorReportPanel';
import { ApprovedGroupRequest } from '../../components/coordinator/groupRequestTypes';
import { useAuth } from '../../context/AuthContext';
import './CoordinatorDashboard.css';
import './CoordinatorLevelPage.css';

type TabKey = 'stages' | 'requests' | 'groups' | 'marking' | 'reports';

const LEVEL_TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'stages', label: 'Project Stages' },
  { key: 'requests', label: 'Group Requests' },
  { key: 'groups', label: 'Project Groups' },
  { key: 'marking', label: 'Submissions' },
  { key: 'reports', label: 'Reports' },
];

interface CoordinatorLevelPageProps {
  levelNumber: number;
}

const CoordinatorLevelPage: React.FC<CoordinatorLevelPageProps> = ({ levelNumber }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('stages');
  const [prefillRequest, setPrefillRequest] = useState<ApprovedGroupRequest | null>(null);

  // Let coordinators jump from an approved submission directly into group creation.
  const handleCreateGroupFromRequest = (request: ApprovedGroupRequest) => {
    setPrefillRequest(request);
    setActiveTab('groups');
  };

  return (
    <AppShell navItems={coordinatorMenuItems}>
      <div className="coordinator-level-shell">
        <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ wordSpacing: '3px', letterSpacing: '0.2px' }}>Level {levelNumber} Management</h2>
              <p className="overview-subtitle">
                Manage and create project stages and groups for Level {levelNumber} students
              </p>
            </div>

            <div className="level-tabs-wrap" role="tablist" aria-label={`Level ${levelNumber} management tabs`}>
              {LEVEL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  className={`level-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
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
              ) : activeTab === 'reports' ? (
                <CoordinatorReportPanel levelNumber={levelNumber} coordinatorId={user?.id} />
              ) : (
                <GradebookTable levelNumber={levelNumber} />
              )}
            </section>
        </div>
      </div>
    </AppShell>
  );
};

export default CoordinatorLevelPage;
