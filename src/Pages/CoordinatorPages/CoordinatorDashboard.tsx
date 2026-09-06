import React, { useEffect, useState } from 'react';
import { FolderKanban, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import AppShell from '../../components/shared/layout/AppShell';
import { coordinatorMenuItems } from '../../components/shared/Sidebar';
import StatCard from '../../components/shared/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import RecentProjects from '../../components/coordinator/RecentProjects';
import './CoordinatorDashboard.css';
import UpcomingDeadlines from '../../components/coordinator/UpcomingDeadlines';
import AnnouncementWidget from '../../components/shared/AnnouncementWidget';

type DashboardStats = {
  totalProjects: number;
  activeStudents: number;
  pendingEvaluations: number;
  completedProjects: number;
};

type RecentProject = {
  projectId: number;
  groupName: string;
  supervisorName: string;
  status: string;
  progress: number;
  updatedAt?: string | null;
};

type UpcomingDeadline = {
  id: number;
  date: string;
  title: string;
  academicLevel: number;
  startTime?: string | null;
  targetGroup?: string | null;
  location?: string | null;
};

type DashboardSummary = {
  stats: DashboardStats;
  recentProjects: RecentProject[];
  upcomingDeadlines: UpcomingDeadline[];
};

const API_BASE = 'http://localhost:5000/api';

const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardSummary = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dashboard/coordinator/summary?coordinatorId=${user?.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error('Failed to load dashboard summary');
        }

        const payload = await response.json();

        if (isMounted) {
          setDashboardData(payload.data ?? null);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard summary');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadingState = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '420px' }}>
      <div style={{ textAlign: 'center', color: 'var(--eds-color-text-muted)' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            border: '4px solid #cbd5e1',
            borderTopColor: 'var(--eds-color-primary)',
            borderRadius: '50%',
            margin: '0 auto 14px',
            animation: 'spin 0.9s linear infinite',
          }}
        />
        <p style={{ margin: 0, fontWeight: 600 }}>Loading dashboard summary...</p>
      </div>
    </div>
  );

  const errorState = error ? (
    <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '16px', background: '#fff1f2', color: '#9f1239' }}>
      {error}
    </div>
  ) : null;

  // Keep the demo-specific "Innovex" group out of the coordinator dashboard summary.
  const filteredRecentProjects = (dashboardData?.recentProjects ?? []).filter(
    (project) => project.groupName.trim().toLowerCase() !== 'innovex'
  );

  const stats = dashboardData?.stats;
  const completionRate =
    stats && stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0;

  return (
    <AppShell navItems={coordinatorMenuItems}>
      <div className="dashboard-content">

        <div className="dashboard-header-section">
          <h2 className="overview-title">Dashboard Overview</h2>
          <p className="overview-subtitle">Welcome back! Here's what's happening.</p>
        </div>

        {loading ? (
          loadingState
        ) : (
          <>
            <div className="stat-grid">
              <StatCard
                title="Total Projects"
                value={stats?.totalProjects ?? 0}
                subtext="Across all coordinator groups"
                icon={<FolderKanban size={22} />}
                tone="primary"
              />
              <StatCard
                title="Active Students"
                value={stats?.activeStudents ?? 0}
                subtext="Registered student accounts"
                icon={<Users size={22} />}
                tone="primary"
              />
              <StatCard
                title="Pending Evaluations"
                value={stats?.pendingEvaluations ?? 0}
                subtext="Still waiting for marks"
                icon={<AlertCircle size={22} />}
                tone="warning"
              />
              <StatCard
                title="Completed Projects"
                value={stats?.completedProjects ?? 0}
                subtext={`${completionRate}% completion rate`}
                icon={<CheckCircle2 size={22} />}
                tone="success"
              />
            </div>
            <div className="dashboard-grid">
              <div className="main-content-column">
                <RecentProjects projects={filteredRecentProjects} />
              </div>

              <div className="side-content-column">
                <UpcomingDeadlines deadlines={dashboardData?.upcomingDeadlines ?? []} />
                <AnnouncementWidget title="Announcements" maxItems={3} showEditDeleteButtons={false} recentDays={30} />
              </div>
            </div>
            {errorState}
          </>
        )}

      </div>
    </AppShell>
  );
};

export default CoordinatorDashboard;