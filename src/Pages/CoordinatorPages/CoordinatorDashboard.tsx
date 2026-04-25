 import React from 'react';
import Sidebar from '../../components/shared/Sidebar'; 
import Header from '../../components/shared/Header';
import StatCards from '../../components/coordinator/StatCards';
import RecentProjects from '../../components/coordinator/RecentProjects';
import './CoordinatorDashboard.css'; 
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';

const CoordinatorDashboard: React.FC = () => {
  return (
    /* Added minHeight and display flex to ensure the layout holds together */
    <div className="app-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      
      <div className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            
            <div className="dashboard-header-section">
              <h2 className="overview-title" style={{ color: '#1e293b' }}>
                Dashboard Overview
              </h2>
              <p className="overview-subtitle" style={{ color: '#64748b' }}>
                Welcome back! Here's what's happening.
              </p>
            </div>

            {/* These are now properly called as components */}
            <StatCards />
             <div className="dashboard-grid">
  
  {/* Left Column (Wider) */}
  <div className="main-content-column">
    <RecentProjects />
  </div>

  {/* Right Column (Narrower) */}
  <div className="side-content-column">
    <UpcomingDeadlines />
    <AnnouncementWidget title="Announcements" maxItems={3} showEditDeleteButtons={false} />
  </div>

</div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;