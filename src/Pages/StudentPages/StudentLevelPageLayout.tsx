import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { useAuth } from '../../context/AuthContext';
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
  // The level this page represents (1-4). When the logged-in student's own
  // `user.level` is below this number, the normal content is swapped for a
  // blocked-access card — the sidebar still lists every level for every
  // student, this is the actual access gate. Omit it for non-student-only
  // usages of this layout (there are none today) to skip the check entirely.
  levelNumber?: number;
}

const StudentLevelPageLayout: React.FC<StudentLevelPageLayoutProps> = ({
  title,
  subtitle,
  children,
  headerRight,
  levelNumber,
}) => {
  const { user } = useAuth();
  const studentLevel = Number((user as any)?.level);

  // Fail open when the student's level isn't a usable number — treating a
  // missing/invalid value as "blocked" would lock accounts out over bad data
  // rather than an actual attempt to skip ahead.
  const isLocked =
    typeof levelNumber === 'number' &&
    Number.isFinite(studentLevel) &&
    studentLevel < levelNumber;

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

            {isLocked ? (
              <div className="dashboard-row">
                <div className="level-locked-card">
                  <h3>Level {levelNumber} isn't available yet</h3>
                  <p>
                    You're currently in Level {studentLevel}. Level {levelNumber} content
                    becomes available once you reach that year.
                  </p>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLevelPageLayout;
