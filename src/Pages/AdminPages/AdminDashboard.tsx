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
        <main className="content-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

          {/* FIXED HEADER SECTION */}
          <div className="dashboard-header-section" style={{ 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            justifyContent: 'flex-start',
            textAlign: 'left',
            marginBottom: '32px'
          }}>
            <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>Admin Dashboard</h2>
            <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>
              System monitoring and user activity.
            </p>
          </div>

          <div className="stats-grid" style={{ width: '100%' }}>
            <StatCard
              title="Total Users"
              value={loading ? '...' : stats.totalUsers}
              color="blue"
              subtitle="Registered system accounts"
            />
            <StatCard
              title="Students"
              value={loading ? '...' : stats.totalStudents}
              color="green"
              subtitle="Registered student accounts"
            />
            <StatCard
              title="Coordinators"
              value={loading ? '...' : stats.totalCoordinators}
              color="amber"
              subtitle="Assigned coordinators"
            />
            <StatCard
              title="Supervisors"
              value={loading ? '...' : stats.totalSupervisors}
              color="purple"
              subtitle="Project supervisors"
            />
            <StatCard
              title="Industry Mentors"
              value={loading ? '...' : stats.totalMentors}
              color="red"
              subtitle="External industry experts"
            />
          </div>

          {/* Promotion Banner */}
          <div style={{
            width: '100%',
            margin: '24px 0',
            padding: '24px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{
                margin: '0 0 4px 0',
                color: '#0f172a',
                fontSize: '16px',
                fontWeight: '700'
              }}>
                🎓 End of Year Student Promotion
              </h3>
              <p style={{
                margin: 0,
                color: '#64748b',
                fontSize: '14px'
              }}>
                Promote all eligible students to the next academic level
              </p>
            </div>
            <button
              onClick={handleBatchPromotion}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              Promote All Students
            </button>
          </div>

          {/* AnnouncementWidget */}
          <div style={{ marginBottom: '24px', width: '100%' }}>
            <AnnouncementWidget title="Latest Announcements" maxItems={2} />
          </div>

          <div className="overview-row" style={{ width: '100%' }}>
            <LoginTable />
          </div>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;