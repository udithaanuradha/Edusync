import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StageManagement from '../../components/coordinator/StageManagement';
import './CoordinatorDashboard.css';

const Level1Page: React.FC = () => {
  return (
    <div className="app-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ color: '#0f172a' }}>
                Level 1 Project Stages
              </h2>
              <p className="overview-subtitle" style={{ color: '#64748b' }}>
                Manage and create project stages for Level 1 students
              </p>
            </div>

            <StageManagement levelNumber={1} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Level1Page;
