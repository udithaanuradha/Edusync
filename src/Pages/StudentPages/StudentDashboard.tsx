import React, { useState, useEffect } from 'react';
import { ListChecks } from 'lucide-react';
import AppShell from '../../components/shared/layout/AppShell';
import MyProjectStatus from '../../components/student/MyProjectStatus';
// Student-only variant of AnnouncementWidget — adds the "actually assigned
// to me" check for "...Assigned Students" posts. See its file header for
// why this isn't done in AnnouncementWidget.tsx itself.
import SupervisorAssignedAnnouncement from '../../components/supervisor/SupervisorAssignedAnnouncement';
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';

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
            <MyProjectStatus stats={dashboardData?.stats} loading={loading} />

            {/* ROW 3: Split View */}
            <div className="dashboard-row equal-split">
              <SupervisorAssignedAnnouncement />
              <UpcomingDeadlines deadlines={dashboardData?.upcomingPanels || []} />
            </div>

            {/* ROW 4: Student Tasks — sits under the Upcoming Panels card,
                kept separate so panels don't get crowded out of their own
                top-5 by personal tasks. */}
            <div className="dashboard-row equal-split">
              <div />
              <UpcomingDeadlines
                deadlines={dashboardData?.studentTasks || []}
                title="Student Tasks"
                icon={ListChecks}
                emptyLabel="No upcoming tasks found."
              />
            </div>

        </div>
      </div>
    </AppShell>
  );
};

export default StudentDashboard;
