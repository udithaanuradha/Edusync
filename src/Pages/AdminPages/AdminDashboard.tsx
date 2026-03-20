 // src/Pages/AdminPages/AdmonDashboard.tsx
import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StatCard from '../../components/admin/StatCard';
import ActivityTable from '../../components/admin/ActivityTable';
import './AdminDashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="app-layout">
      {/* 1. Fixed Sidebar */}
      <Sidebar />

      <div className="main-viewport">
        {/* 2. Fixed Header at the top of the viewport */}
        <Header />

        {/* 3. Scrollable Content Area */}
        <main className="content-container">
          <div className="dashboard-header-section">
            <h2 className="overview-title">Admin Dashboard</h2>
            <p className="overview-subtitle">System monitoring and user activity.</p>
          </div>

          {/* This grid will now fit the width of the remaining space */}
          <div className="stats-grid">
            <StatCard title="Total Users" value="2248" color="blue" />
            <StatCard title="Active Today" value="1587" color="green" />
            <StatCard title="Pending Approvals" value="14" color="amber" />
            <StatCard title="Failed Attempts" value="3" color="purple" />
          </div>

          <div className="overview-row">
            <ActivityTable />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;