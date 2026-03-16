import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentPage = () => {
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <h2 className="overview-title">Student Dashboard</h2>
          <p className="overview-subtitle">My Projects & Submissions</p>
          <button onClick={() => { switchRole('coordinator'); navigate('/coordinator'); }}>Test: Go to Coordinator</button>
        </main>
      </div>
    </div>
  );
};
export default StudentPage;