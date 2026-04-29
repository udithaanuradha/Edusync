import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StatCard from '../../components/admin/StatCard';
import LoginTable from '../../components/admin/LoginTable'; 
import AnnouncementWidget from '../../components/shared/AnnouncementWidget'; 
import './AdminDashboard.css';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalCoordinators: 0,
    totalSupervisors: 0,
    totalMentors: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleBatchPromotion = async () => {
    const isConfirmed = window.confirm(
      '⚠️ WARNING: Are you sure you want to promote ALL students to the next academic level? This action cannot be easily undone.'
    );
    if (!isConfirmed) return;

    try {
      const response = await fetch('http://localhost:5000/api/admin/promote-students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Success! ${data.studentsUpdated} students were promoted to the next year.`);
      } else {
        alert('❌ Failed to promote students.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to connect to server.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">

          <div className="dashboard-header-section">
            <h2 className="overview-title">Admin Dashboard</h2>
            <p className="overview-subtitle">System monitoring and user activity.</p>
          </div>

          <div className="stats-grid">
            <StatCard
              title="Total Users"
              value={loading ? '...' : stats.totalUsers}
              color="blue"
            />
            <StatCard
              title="Students"
              value={loading ? '...' : stats.totalStudents}
              color="green"
            />
            <StatCard
              title="Coordinators"
              value={loading ? '...' : stats.totalCoordinators}
              color="amber"
            />
            <StatCard
              title="Supervisors"
              value={loading ? '...' : stats.totalSupervisors}
              color="purple"
            />
            <StatCard
              title="Industry Mentors"
              value={loading ? '...' : stats.totalMentors}
              color="red" 
            />
          </div>

          {/* Promotion Banner */}
          <div style={{
            margin: '24px 0',
            padding: '24px',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div>
              <h3 style={{
                margin: '0 0 4px 0',
                color: '#9a3412',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                🎓 End of Year Student Promotion
              </h3>
              <p style={{
                margin: 0,
                color: '#c2410c',
                fontSize: '14px'
              }}>
                Promote all eligible students to the next academic level
              </p>
            </div>
            <button
              onClick={handleBatchPromotion}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              Promote All Students
            </button>
          </div>

          {/* 2. Added AnnouncementWidget here */}
          <div style={{ marginBottom: '24px' }}>
            <AnnouncementWidget />
          </div>

          <div className="overview-row">
            <LoginTable />
          </div>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;