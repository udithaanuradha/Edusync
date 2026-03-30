import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import SupervisorSidebar from '../../components/supervisor/SupervisorSidebar';
import StageManagement from '../../components/coordinator/StageManagement';
import './SupervisorDashboard.css';
import './SupervisorLevelPage.css';

interface SupervisorLevelPageProps {
  levelNumber: number;
}

const SupervisorLevelPage: React.FC<SupervisorLevelPageProps> = ({ levelNumber }) => {
  return (
    <div className="app-layout supervisor-shell">
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header />

        <main className="content-container supervisor-content-container">
          <div className="supervisor-level-page">
            <div className="supervisor-level-header">
              <h2>Level {levelNumber} Coordinator Instructions</h2>
              <p>
                Review and manage the coordinator stage instructions configured for Level {levelNumber}.
              </p>
            </div>

            <StageManagement levelNumber={levelNumber} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorLevelPage;
