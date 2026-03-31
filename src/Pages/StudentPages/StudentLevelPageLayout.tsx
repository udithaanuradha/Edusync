import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import './StudentDashboard.css';

interface StudentLevelPageLayoutProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

const StudentLevelPageLayout: React.FC<StudentLevelPageLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-viewport">
        <Header pageTitle={title} />

        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">{title}</h2>
              <p className="overview-subtitle">{subtitle}</p>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLevelPageLayout;
