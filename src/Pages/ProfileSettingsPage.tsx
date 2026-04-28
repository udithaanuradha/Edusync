import React from 'react';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';

const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Profile Settings</h2>
              <p className="overview-subtitle">
                Review your account details and keep your profile information up to date.
              </p>
            </div>

            <section className="surface-card" style={{ padding: '28px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Name</p>
                  <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: '16px', fontWeight: 700 }}>
                    {user?.name || 'User'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Email</p>
                    <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: '14px' }}>{user?.email || '-'}</p>
                  </div>

                  <div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Role</p>
                    <span className="soft-badge neutral" style={{ marginTop: '6px' }}>
                      {user?.role || 'Unknown'}
                    </span>
                  </div>

                  <div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Account Status</p>
                    <span className="soft-badge success" style={{ marginTop: '6px' }}>Active</span>
                  </div>
                </div>

                <div style={{ paddingTop: '4px', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
                  This page is ready for future profile editing controls, password updates, and notification preferences.
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;