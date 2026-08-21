import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import MyProjectStatus from '../../components/student/MyProjectStatus';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';
import RecentProjects from '../../components/coordinator/RecentProjects';
import AssignedGroupsModal from '../../components/shared/AssignedGroupsModal';

import './StudentDashboard.css';

const StudentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignedGroup, setShowAssignedGroup] = useState(false);
  const [studentId, setStudentId] = useState<number | string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user.id) {
          setLoading(false);
          return;
        }
        setStudentId(user.id);

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
    <div className="app-layout">
      {/* 1. SIDEBAR: Stays on the left */}
      <Sidebar />
      
      <div className="main-viewport">
        {/* 2. HEADER: Stays at the top */}
        <Header />
        
        <main className="content-container">
          <div className="dashboard-content">
            
            <div className="dashboard-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 className="overview-title">
                  Dashboard Overview
                </h2>
                <p className="overview-subtitle">
                  Welcome back! Here's what's happening.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignedGroup(true)}
                disabled={!studentId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                  color: '#fff', background: '#4f46e5', border: 'none', borderRadius: 8,
                  padding: '9px 16px', cursor: studentId ? 'pointer' : 'not-allowed', opacity: studentId ? 1 : 0.6,
                }}
              >
                <Users size={15} />
                Assigned Group
              </button>
            </div>

            {showAssignedGroup && studentId && (
              <AssignedGroupsModal
                role="student"
                userId={studentId}
                onClose={() => setShowAssignedGroup(false)}
              />
            )}

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
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;