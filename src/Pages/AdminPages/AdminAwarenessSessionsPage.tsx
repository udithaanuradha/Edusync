import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import AdminAwarenessSessionPanel from '../../components/admin/AdminAwarenessSessionPanel';
import './AdminDashboard.css';

const AdminAwarenessSessionsPage: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container" style={{ padding: '24px 32px' }}>
          <AdminAwarenessSessionPanel />
        </main>
      </div>
    </div>
  );
};

export default AdminAwarenessSessionsPage;
