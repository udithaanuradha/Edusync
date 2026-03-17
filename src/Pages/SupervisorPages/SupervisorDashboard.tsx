import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const SupervisorPage = () => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-viewport">
      <Header />
      <main className="content-container">
        <h2 className="overview-title">Supervisor Dashboard</h2>
        <p className="overview-subtitle">Project Evaluations View</p>
      </main>
    </div>
  </div>
);
export default SupervisorPage;