import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const ProjectManagementPage: React.FC = () => {
  return (
    <div className="app-layout">
      {/* SIDEBAR: Stays on the left */}
      <Sidebar />
      
      <div className="main-viewport">
        {/* HEADER: Stays at the top */}
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            {/* Content will be arranged later */}
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Project Management
              </h2>
              <p className="overview-subtitle">
                Manage your project here.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectManagementPage;