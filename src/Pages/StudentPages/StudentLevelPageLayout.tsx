import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import './StudentDashboard.css';

interface StudentLevelPageLayoutProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  // Optional element rendered right-aligned in the same row as the title —
  // e.g. the Level 3/4 Group/Individual toggle. Left unset (as Level 1 and
  // Level 2 do), the header renders exactly as it always has: title and
  // subtitle stacked, no row wrapper at all.
  headerRight?: React.ReactNode;
}

const StudentLevelPageLayout: React.FC<StudentLevelPageLayoutProps> = ({
  title,
  subtitle,
  children,
  headerRight,
}) => {
  return (
    <div className="app-layout student-level-shell">
      <Sidebar />

      <div className="main-viewport">
        <Header pageTitle={title} />

        <main className="content-container student-level-content">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              {headerRight ? (
                <div className="student-level-header-row">
                  <div className="student-level-header-text">
                    <h2 className="overview-title">{title}</h2>
                    <p className="overview-subtitle">{subtitle}</p>
                  </div>
                  <div className="student-level-header-actions">{headerRight}</div>
                </div>
              ) : (
                <>
                  <h2 className="overview-title">{title}</h2>
                  <p className="overview-subtitle">{subtitle}</p>
                </>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLevelPageLayout;
