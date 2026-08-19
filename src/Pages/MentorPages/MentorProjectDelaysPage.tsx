import React from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import { AlertTriangle, Clock } from 'lucide-react';

const MentorProjectDelaysPage: React.FC = () => {
  return (
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div className="dashboard-header-section" style={{ marginBottom: '24px' }}>
            <h2 className="overview-title" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle style={{ color: '#ef4444' }} size={28} />
              Project Delays (Mentor View)
            </h2>
            <p className="overview-subtitle" style={{ color: '#64748b', marginTop: '4px' }}>
              Monitor and review delayed project milestones and tasks across your assigned groups.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '48px 24px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Clock style={{ color: '#ef4444' }} size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              Mentor Project Delays Tracking
            </h3>
            <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Overdue student tasks and flagged milestones for your mentored groups will appear here. Currently, all tasks are on track.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MentorProjectDelaysPage;
