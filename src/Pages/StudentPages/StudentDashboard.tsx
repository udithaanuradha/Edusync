import React, { useState, useEffect } from 'react';
import AppShell from '../../components/shared/layout/AppShell';
import MyProjectStatus from '../../components/student/MyProjectStatus';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';
import RecentProjects from '../../components/coordinator/RecentProjects';

import './StudentDashboard.css';

const StudentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user.id) {
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/dashboard/student/summary/${user.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (res.ok) {
          const payload = await res.json();
          setDashboardData(payload.data);
        }
      } catch (err) {
        console.error("Failed to fetch student dashboard summary", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <AppShell>
      <div className="student-dashboard-shell">
        <div className="dashboard-content">

            <div className="dashboard-header-section student-dashboard-header">
              <div>
                <h2 className="overview-title">
                  Dashboard Overview
                </h2>
                <p className="overview-subtitle">
                  Welcome back! Here's what's happening.
                </p>
              </div>
            </div>

            {/* ROW 1: Project Cards */}
            <MyProjectStatus />

            {/* ROW 2: Full Width Section */}
            <div className="dashboard-row">
              <RecentProjects projects={dashboardData?.recentProjects || []} />
            </div>

            {/* ROW 3: Split View */}
            <div className="dashboard-row equal-split">
              <AnnouncementWidget />
              <UpcomingDeadlines deadlines={dashboardData?.upcomingDeadlines || []} />
            </div>

        </div>
      </div>
    </AppShell>
  );
};

export default StudentDashboard;
