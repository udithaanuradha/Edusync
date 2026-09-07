import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import StatCard from '../../components/admin/StatCard';
import LoginTable from '../../components/admin/LoginTable'; 
import AdminAnnouncementWidget from '../../components/admin/AdminAnnouncementWidget'; 
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

  const [promoting, setPromoting] = useState(false);

  const fetchStats = () => {
    fetch('http://localhost:5000/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const [promotionBanner, setPromotionBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleBatchPromotion = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to promote eligible students to the next level?\n\nOnly students who have achieved a final grade of C- or higher (>= 40%) will be promoted.'
    );
    if (!confirmed) return;

    setPromoting(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/promote-students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        const count = data.studentsUpdated || 0;
        setPromotionBanner({ 
          type: count > 0 ? 'success' : 'info', 
          message: count > 0
            ? `✅ Success! ${count} passed student(s) were promoted to the next academic level.`
            : `ℹ️ Notice: No students currently qualify for promotion.`
        });
        fetchStats();
        setTimeout(() => setPromotionBanner(null), 6000);
      } else {
        setPromotionBanner({ type: 'error', message: data.message || '❌ Failed to promote students.' });
        setTimeout(() => setPromotionBanner(null), 5000);
      }
    } catch (error) {
      console.error('Error:', error);
      setPromotionBanner({ type: 'error', message: '❌ Failed to connect to server.' });
      setTimeout(() => setPromotionBanner(null), 4000);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

          {promotionBanner && (
            <div style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: promotionBanner.type === 'success' ? '#f0fdf4' : promotionBanner.type === 'info' ? '#eff6ff' : '#fef2f2',
              color: promotionBanner.type === 'success' ? '#15803d' : promotionBanner.type === 'info' ? '#1d4ed8' : '#b91c1c',
              border: `1px solid ${promotionBanner.type === 'success' ? '#bbf7d0' : promotionBanner.type === 'info' ? '#bfdbfe' : '#fecaca'}`,
            }}>
              {promotionBanner.message}
            </div>
          )}

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
              subtitle="Registered industry mentors"
            />
          </div>

          {/* Promotion Banner */}
          <div style={{
            width: '100%',
            margin: '24px 0',
            padding: '24px',
            backgroundColor: 'var(--eds-color-bg-surface)',
            border: '1px solid var(--eds-color-border)',
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
                color: 'var(--eds-color-text-strong)',
                fontSize: '16px',
                fontWeight: '700'
              }}>
                🎓 End of Year Student Promotion
              </h3>
              <p style={{
                margin: 0,
                color: 'var(--eds-color-text-muted)',
                fontSize: '14px'
              }}>
                Promote all passed students to the next academic level
              </p>
            </div>
            <button
              onClick={handleBatchPromotion}
              disabled={promoting}
              style={{
                backgroundColor: promoting ? 'var(--eds-color-border)' : 'var(--eds-color-border-soft)',
                color: 'var(--eds-color-text-strong)',
                border: '1px solid var(--eds-color-border)',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: promoting ? 'not-allowed' : 'pointer',
                opacity: promoting ? 0.7 : 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (!promoting) {
                  e.currentTarget.style.backgroundColor = 'var(--eds-color-border)';
                  e.currentTarget.style.borderColor = 'var(--eds-color-text-faint)';
                }
              }}
              onMouseOut={(e) => {
                if (!promoting) {
                  e.currentTarget.style.backgroundColor = 'var(--eds-color-border-soft)';
                  e.currentTarget.style.borderColor = 'var(--eds-color-border)';
                }
              }}
            >
              {promoting ? 'Promoting...' : 'Promote Passed Students'}
            </button>
          </div>

          {/* Admin Announcement Widget */}
          <div style={{ marginBottom: '24px', width: '100%' }}>
            <AdminAnnouncementWidget title="Latest Announcements" maxItems={3} />
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