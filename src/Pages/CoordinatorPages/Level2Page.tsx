import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StageManagement from '../../components/coordinator/StageManagement';
import './CoordinatorDashboard.css';

const Level2Page: React.FC = () => {
  return (
    <div className="app-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ color: '#0f172a' }}>
                Level 2 Project Stages
              </h2>
              <p className="overview-subtitle" style={{ color: '#64748b' }}>
                Manage and create project stages for Level 2 students
              </p>
            </div>

            <StageManagement levelNumber={2} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Level2Page;
