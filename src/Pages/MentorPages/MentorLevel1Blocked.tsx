import React from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';

const MentorLevel1Blocked: React.FC = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    <MentorSidebarWrapper />
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--eds-color-bg-surface-soft)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          background: 'white',
          padding: '48px 40px',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid var(--eds-color-border)',
          maxWidth: 420,
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 20 }}>🚫</div>
        <h2
          style={{
            margin: '0 0 12px',
            color: 'var(--eds-color-text-strong)',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Access Restricted
        </h2>
        <p
          style={{
            color: 'var(--eds-color-text-muted)',
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Industry mentors are not assigned to Level 1 stages. Please navigate
          to Level 2, 3, or 4 using the sidebar.
        </p>
      </div>
    </div>
  </div>
);

export default MentorLevel1Blocked;