import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import {
  AlertTriangle,
  CheckCircle2,
  User,
  Users,
  Search,
  Download,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import './AdminProjectDelaysPage.css';

export interface ProjectDelayItem {
  id: number | string;
  group_id?: number | string;
  group_name: string;
  level: number;
  degree: 'IT' | 'ITM' | 'AI';
  milestone_title: string;
  task_name?: string;
  due_date: string;
  days_overdue: number;
  supervisor_name: string;
  mentor_name?: string;
  leader_name?: string;
  leader_email?: string;
  status: 'Critical' | 'Moderate' | 'Minor';
  notes?: string;
}

const AdminProjectDelaysPage: React.FC = () => {
  const [delays, setDelays] = useState<ProjectDelayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<number | 'ALL'>('ALL');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchRealDelays = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const collectedDelays: ProjectDelayItem[] = [];
      const seenDelayIds = new Set<string | number>();

      // 1. Fetch registered groups across Levels 1, 2, 3, 4 in parallel
      const groupMap = new Map<number | string, any>();
      const levelResults = await Promise.all(
        [1, 2, 3, 4].map(async (lvl) => {
          try {
            const resGroups = await fetch(`http://localhost:5000/api/groups/level/${lvl}`, { headers: authHeaders });
            if (resGroups.ok) {
              const raw = await resGroups.json();
              const groupList = Array.isArray(raw) ? raw : (raw.data || raw.groups || []);
              return { lvl, groups: groupList };
            }
          } catch {
            // ignore
          }
          return { lvl, groups: [] };
        })
      );

      levelResults.forEach(({ lvl, groups }) => {
        groups.forEach((g: any) => {
          const gId = g.id || g.group_id || g.groupId;
          if (gId) {
            groupMap.set(gId, { ...g, level: lvl });
          }
        });
      });

      const allGroupIds = Array.from(new Set([
        ...Array.from(groupMap.keys()),
        1, 30001, 400000
      ]));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Fetch live milestones across all groups in parallel
      await Promise.all(
        allGroupIds.map(async (gId) => {
          try {
            const resMilestones = await fetch(`http://localhost:5000/api/milestones/group/${gId}`, { headers: authHeaders });
            if (resMilestones.ok) {
              const mData = await resMilestones.json();
              const mList = Array.isArray(mData) ? mData : (mData.data || []);

              if (Array.isArray(mList)) {
                mList.forEach((m: any) => {
                  const statusStr = String(m.status || '').toUpperCase();
                  if (statusStr !== 'COMPLETED' && statusStr !== 'DONE' && m.due_date) {
                    const dueDate = new Date(m.due_date);
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate.getTime() < today.getTime()) {
                      const diffDays = Math.max(1, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

                      let severity: 'Critical' | 'Moderate' | 'Minor' = 'Minor';
                      if (diffDays > 14) severity = 'Critical';
                      else if (diffDays >= 7) severity = 'Moderate';

                      const groupInfo = groupMap.get(gId) || {};
                      const milestoneKey = `milestone-${m.id || m.title}-${gId}`;

                      if (!seenDelayIds.has(milestoneKey)) {
                        seenDelayIds.add(milestoneKey);

                        let degree: 'IT' | 'ITM' | 'AI' = 'IT';
                        const rawDeg = groupInfo.department || groupInfo.degree || (gId === 30001 ? 'AI' : gId === 400000 ? 'ITM' : 'IT');
                        if (rawDeg === 'ITM' || rawDeg === 'IDS') degree = 'ITM';
                        else if (rawDeg === 'AI' || rawDeg === 'CM') degree = 'AI';

                        collectedDelays.push({
                          id: m.id || `m-${gId}`,
                          group_id: gId,
                          group_name: groupInfo.name || groupInfo.group_name || (gId === 1 ? 'Nexus' : gId === 30001 ? 'VisionAI' : gId === 400000 ? 'CyShield' : `Group ${gId}`),
                          level: Number(groupInfo.level || (gId === 400000 ? 4 : gId === 30001 ? 3 : 1)),
                          degree,
                          milestone_title: m.title || 'Project Milestone',
                          task_name: m.description || 'Milestone Deliverable',
                          due_date: String(m.due_date).split('T')[0],
                          days_overdue: diffDays,
                          supervisor_name: groupInfo.supervisorName || groupInfo.supervisor || 'Assigned Academic Staff',
                          mentor_name: groupInfo.mentorName || groupInfo.mentor || 'Industry Mentor',
                          leader_name: groupInfo.leaderName || groupInfo.leader || 'Group Leader',
                          status: severity,
                          notes: m.description || 'Overdue milestone pending completion.',
                        });
                      }
                    }
                  }
                });
              }
            }
          } catch {
            // ignore
          }
        })
      );

      setDelays(collectedDelays);
    } catch (err) {
      console.error('Error fetching real-time project delays:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealDelays();
  }, [fetchRealDelays]);

  // Filtered Delays
  const filteredDelays = useMemo(() => {
    return delays.filter((item) => {
      // Level filter
      if (selectedLevel !== 'ALL' && item.level !== selectedLevel) return false;

      // Degree filter
      if (selectedDegree !== 'ALL' && item.degree !== selectedDegree) return false;

      // Severity filter
      if (selectedSeverity !== 'ALL' && item.status.toLowerCase() !== selectedSeverity.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGroup = item.group_name.toLowerCase().includes(q);
        const matchesMilestone = item.milestone_title.toLowerCase().includes(q);
        const matchesSupervisor = item.supervisor_name.toLowerCase().includes(q);
        const matchesLeader = (item.leader_name || '').toLowerCase().includes(q);
        if (!matchesGroup && !matchesMilestone && !matchesSupervisor && !matchesLeader) {
          return false;
        }
      }

      return true;
    });
  }, [delays, selectedLevel, selectedDegree, selectedSeverity, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = delays.length;
    const critical = delays.filter((d) => d.status === 'Critical' || d.days_overdue > 14).length;
    const moderate = delays.filter((d) => d.status === 'Moderate').length;
    const distinctGroups = new Set(delays.map((d) => d.group_name)).size;

    return { total, critical, moderate, distinctGroups };
  }, [delays]);

  const handleExportCSV = () => {
    const headers = ['Group Name', 'Level', 'Degree', 'Overdue Milestone', 'Due Date', 'Days Overdue', 'Supervisor', 'Mentor', 'Status', 'Notes'];
    const rows = filteredDelays.map((d) => [
      `"${d.group_name}"`,
      `"Level ${d.level}"`,
      `"${d.degree}"`,
      `"${d.milestone_title}"`,
      `"${d.due_date}"`,
      `"${d.days_overdue} days"`,
      `"${d.supervisor_name}"`,
      `"${d.mentor_name || 'N/A'}"`,
      `"${d.status}"`,
      `"${d.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Faculty_Project_Delays_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-viewport">
        <Header />

        <main className="content-container admin-delays-container">
          
          {/* Header Section */}
          <div className="admin-delays-header-wrap">
            <div className="admin-delays-title-group">
              <div className="admin-delays-icon-badge">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 className="admin-delays-title">Project Delays & Academic Risk Oversight</h1>
              </div>
            </div>

            <div className="admin-delays-actions-top">
              <button
                type="button"
                className="btn-admin-action btn-admin-secondary"
                onClick={handleExportCSV}
              >
                <Download size={15} />
                Export Report (CSV)
              </button>
            </div>
          </div>

          {/* KPI Summary Cards Grid */}
          <div className="admin-delays-stats-grid">
            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <AlertTriangle size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{metrics.total}</div>
                <div className="stat-label">Total Overdue Items</div>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}>
                <ShieldAlert size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{metrics.critical}</div>
                <div className="stat-label">Critical Delays (&gt;14d)</div>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                <Clock size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{metrics.moderate}</div>
                <div className="stat-label">Moderate Delays (3–14d)</div>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <Users size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{metrics.distinctGroups}</div>
                <div className="stat-label">Affected Project Groups</div>
              </div>
            </div>
          </div>

          {/* Filter Controls Box */}
          <div className="admin-delays-filter-box">
            <div className="filter-left-group">
              {/* Level Selector Pills */}
              <div className="level-pill-group">
                <button
                  type="button"
                  className={`level-pill-btn ${selectedLevel === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedLevel('ALL')}
                >
                  All Levels
                </button>
                {[1, 2, 3, 4].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-pill-btn ${selectedLevel === lvl ? 'active' : ''}`}
                    onClick={() => setSelectedLevel(lvl)}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>

              {/* Degree Selector */}
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="custom-select-filter"
              >
                <option value="ALL">All Degrees</option>
                <option value="IT">IT — Information Technology</option>
                <option value="ITM">ITM — Info Tech & Management</option>
                <option value="AI">AI — Artificial Intelligence</option>
              </select>

              {/* Severity Filter */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="custom-select-filter"
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical (&gt;14 Days)</option>
                <option value="Moderate">Moderate (7–14 Days)</option>
                <option value="Minor">Minor (&lt;7 Days)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="search-input-wrap">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search group, student, supervisor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Detailed Delays Table Card */}
          <div className="admin-delays-table-card">
            <div className="admin-delays-table-header">
              <h3 className="admin-delays-table-title">
                Delayed Milestones Log ({filteredDelays.length})
              </h3>
            </div>

            <div className="delays-table-wrapper">
              <table className="admin-delays-table">
                <thead>
                  <tr>
                    <th>Project Group & Cohort</th>
                    <th>Overdue Milestone / Stage</th>
                    <th>Deadline & Overdue Duration</th>
                    <th>Supervisor & Mentor</th>
                    <th>Delay Notes & Blocker</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{
                          display: 'inline-block',
                          width: '28px',
                          height: '28px',
                          border: '3px solid #e2e8f0',
                          borderTopColor: 'var(--eds-color-primary)',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                      </td>
                    </tr>
                  ) : filteredDelays.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
                        <CheckCircle2 size={40} style={{ margin: '0 auto 12px auto', color: '#22c55e' }} />
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                          No Overdue Milestones Found!
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                          {searchQuery || selectedLevel !== 'ALL' || selectedDegree !== 'ALL' || selectedSeverity !== 'ALL'
                            ? 'No records match your selected filter criteria.'
                            : 'All project milestones across Levels 1–4 are currently operating on schedule.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDelays.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`delays-table-row ${item.status === 'Critical' ? 'critical-row' : ''}`}
                      >
                        {/* Group & Cohort */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a' }}>
                              {item.group_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge-level">Level {item.level}</span>
                            <span className={`badge-degree ${item.degree.toLowerCase()}`}>
                              {item.degree}
                            </span>
                            {item.leader_name && (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                • Lead: {item.leader_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Milestone / Stage */}
                        <td>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#0f172a' }}>
                            {item.milestone_title}
                          </div>
                          {item.task_name && item.task_name !== item.milestone_title && (
                            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                              {item.task_name}
                            </div>
                          )}
                        </td>

                        {/* Deadline & Duration */}
                        <td>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                            Due: {item.due_date}
                          </div>
                          <span
                            className={`badge-overdue ${
                              item.status === 'Critical'
                                ? 'critical'
                                : item.status === 'Moderate'
                                ? 'moderate'
                                : 'minor'
                            }`}
                          >
                            <AlertTriangle size={12} />
                            {item.days_overdue} days overdue
                          </span>
                        </td>

                        {/* Supervisor & Mentor */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#1e293b' }}>
                            <User size={13} color="#64748b" />
                            {item.supervisor_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                            Mentor: {item.mentor_name || 'Not assigned'}
                          </div>
                        </td>

                        {/* Delay Notes */}
                        <td>
                          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                            {item.notes || 'Awaiting milestone submission.'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminProjectDelaysPage;
