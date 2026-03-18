import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import SupervisorOverview from './SupervisorOverview';
import SupervisorSidebar from '../../components/supervisor/SupervisorSidebar';
import './SupervisorDashboard.css';

const SupervisorPage = () => (
  <div className="app-layout supervisor-shell">
    <div className="supervisor-side-stack">
      <Sidebar />
      <SupervisorSidebar compact />
    </div>
    <div className="main-viewport">
      <Header />
      <main className="content-container supervisor-content-container">
        <SupervisorOverview />
      </main>
    </div>
  </div>
);
export default SupervisorPage;