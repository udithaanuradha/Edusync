import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminPage = () => {
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <h2 className="overview-title">Admin Dashboard</h2>
          <p className="overview-subtitle">System Management View</p>
          <button onClick={() => { switchRole('student'); navigate('/student'); }}>Test: Go to Student</button>
        </main>
      </div>
    </div>
  );
};
export default AdminPage;