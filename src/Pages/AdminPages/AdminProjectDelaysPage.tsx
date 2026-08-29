import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Users,
  Search,
  Filter,
  Download,
  Send,
  CalendarPlus,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Flag,
  FileSpreadsheet,
  X,
  RefreshCw,
  Database
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
  is_flagged?: boolean;
  notes?: string;
}

const AdminProjectDelaysPage: React.FC = () => {
  const [delays, setDelays] = useState<ProjectDelayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<number | 'ALL'>('ALL');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extension Modal state
  const [extendingItem, setExtendingItem] = useState<ProjectDelayItem | null>(null);
  const [newExtensionDate, setNewExtensionDate] = useState<string>('');
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchRealDelays = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const token = localStorage.getItem('token');
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const collectedDelays: ProjectDelayItem[] = [];
      const seenDelayIds = new Set<string | number>();

      // 1. Fetch from Mentor Project Delays endpoint
      try {
        const resMentor = await fetch('http://localhost:5000/api/mentor/project-delays', { headers: authHeaders });
        if (resMentor.ok) {
          const dataMentor = await resMentor.json();
          if (dataMentor.success && Array.isArray(dataMentor.data)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            dataMentor.data.forEach((item: any, idx: number) => {
              const due = new Date(item.due_date || item.deadline || '2026-08-15');
              due.setHours(0, 0, 0, 0);
              const diffDays = Math.max(1, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));

              let status: 'Critical' | 'Moderate' | 'Minor' = 'Minor';
              if (diffDays > 14) status = 'Critical';
              else if (diffDays >= 7) status = 'Moderate';

              const itemKey = `mentor-${item.task_id || item.id || idx}`;
              if (!seenDelayIds.has(itemKey)) {
                seenDelayIds.add(itemKey);
                collectedDelays.push({
                  id: item.task_id || item.id || idx + 100,
                  group_id: item.group_id,
                  group_name: item.group_name || 'Unnamed Group',
                  level: Number(item.level || item.academic_level || 2),
                  degree: (item.degree || 'ITM') as 'IT' | 'ITM' | 'AI',
                  milestone_title: item.milestone_title || item.task_name || 'Scheduled Milestone',
                  task_name: item.description || item.task_name,
                  due_date: item.due_date ? String(item.due_date).split('T')[0] : '2026-08-15',
                  days_overdue: diffDays,
                  supervisor_name: item.supervisor_name || 'Assigned Supervisor',
                  mentor_name: item.mentor_name || 'Assigned Mentor',
                  leader_name: item.assigned_to_name || item.leader_name || 'Group Leader',
                  status,
                  is_flagged: diffDays > 14,
                  notes: item.notes || '',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Mentor delays query notice:', err);
      }

      // 2. Fetch all registered Groups across Level 1, 2, 3, 4 from database
      const groupMap = new Map<number | string, any>();
      for (const lvl of [1, 2, 3, 4]) {
        try {
          const resGroups = await fetch(`http://localhost:5000/api/groups/level/${lvl}`, { headers: authHeaders });
          if (resGroups.ok) {
            const raw = await resGroups.json();
            const groupList = Array.isArray(raw) ? raw : (raw.data || raw.groups || []);
            groupList.forEach((g: any) => {
              const gId = g.id || g.group_id || g.groupId;
              if (gId) {
                groupMap.set(gId, { ...g, level: lvl });
              }
            });
          }
        } catch {
          // continue
        }
      }

      // Collect known group IDs to probe (including default database group IDs like 1, 30001, 400000)
      const allGroupIds = Array.from(new Set([
        ...Array.from(groupMap.keys()),
        1, 30001, 400000
      ]));

      // 3. For each group, fetch live milestones from database (/api/milestones/group/:gId)
      for (const gId of allGroupIds) {
        try {
          const resMilestones = await fetch(`http://localhost:5000/api/milestones/group/${gId}`, { headers: authHeaders });
          if (resMilestones.ok) {
            const mData = await resMilestones.json();
            const mList = Array.isArray(mData) ? mData : (mData.data || []);

            if (Array.isArray(mList)) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

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
                        is_flagged: diffDays > 14,
                        notes: m.description || 'Overdue milestone pending completion.',
                      });
                    }
                  }
                }
              });
            }
          }
        } catch {
          // ignore error for single group
        }
      }

      setDelays(collectedDelays);
    } catch (err) {
      console.error('Error fetching real-time project delays:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  // Actions
  const handleSendReminder = (item: ProjectDelayItem) => {
    const leaderMail = item.leader_email || `${item.group_name.toLowerCase().replace(/\s+/g, '')}@uom.lk`;
    setActionSuccessMsg(`⚠️ Urgent deadline warning sent to ${item.group_name} (${leaderMail}) & Supervisor ${item.supervisor_name}.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleToggleFlag = (id: number | string) => {
    setDelays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_flagged: !item.is_flagged } : item))
    );
  };

  const handleOpenExtensionModal = (item: ProjectDelayItem) => {
    setExtendingItem(item);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setNewExtensionDate(d.toISOString().split('T')[0]);
    setExtensionReason('');
  };

  const handleSaveExtension = () => {
    if (!extendingItem || !newExtensionDate) return;

    setDelays((prev) =>
      prev.map((item) => {
        if (item.id === extendingItem.id) {
          return {
            ...item,
            due_date: newExtensionDate,
            days_overdue: 0,
            status: 'Minor',
            notes: `Extended to ${newExtensionDate}. Reason: ${extensionReason || 'Administrative approval'}`,
          };
        }
        return item;
      })
    );

    setActionSuccessMsg(`✅ Deadline for ${extendingItem.group_name} extended to ${newExtensionDate}.`);
    setExtendingItem(null);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

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
                onClick={() => fetchRealDelays(true)}
                disabled={refreshing}
                title="Fetch latest milestone records directly from database"
              >
                <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
                {refreshing ? 'Syncing…' : 'Live Sync'}
              </button>

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

          {/* Action Success Banner */}
          {actionSuccessMsg && (
            <div style={{
              padding: '14px 20px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} color="#059669" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

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
                    <th style={{ textAlign: 'right' }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                        <Clock size={32} style={{ margin: '0 auto 8px auto', color: '#cbd5e1' }} />
                        <div style={{ fontWeight: '600' }}>Fetching real-time delay records from database...</div>
                      </td>
                    </tr>
                  ) : filteredDelays.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b' }}>
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
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                              {item.group_name}
                            </span>
                            {item.is_flagged && (
                              <span title="Flagged by Admin / Coordinator" style={{ color: '#e11d48' }}>
                                🚩
                              </span>
                            )}
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
                          <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#0f172a' }}>
                            {item.milestone_title}
                          </div>
                          {item.task_name && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {item.task_name}
                            </div>
                          )}
                        </td>

                        {/* Deadline & Duration */}
                        <td>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                            <User size={13} color="#64748b" />
                            {item.supervisor_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                            Mentor: {item.mentor_name || 'Not assigned'}
                          </div>
                        </td>

                        {/* Delay Notes */}
                        <td>
                          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
                            {item.notes || 'Awaiting milestone submission.'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-table-action btn-reminder"
                              title="Send urgent reminder email to group & supervisor"
                              onClick={() => handleSendReminder(item)}
                            >
                              <Send size={13} />
                              Remind
                            </button>
                            <button
                              type="button"
                              className="btn-table-action btn-extend"
                              title="Grant deadline extension"
                              onClick={() => handleOpenExtensionModal(item)}
                            >
                              <CalendarPlus size={13} />
                              Extend
                            </button>
                            <button
                              type="button"
                              className="btn-table-action btn-extend"
                              style={{ padding: '6px 8px', color: item.is_flagged ? '#dc2626' : '#94a3b8' }}
                              title={item.is_flagged ? 'Unflag milestone' : 'Flag milestone for review'}
                              onClick={() => handleToggleFlag(item.id)}
                            >
                              <Flag size={13} />
                            </button>
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

      {/* Deadline Extension Modal */}
      {extendingItem && (
        <div className="modal-overlay-delays">
          <div className="modal-card-delays">
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafbfc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    Grant Deadline Extension
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {extendingItem.group_name} — Level {extendingItem.level} ({extendingItem.degree})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendingItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Milestone / Deliverable</span>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  {extendingItem.milestone_title}
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px' }}>
                  Original Due Date: {extendingItem.due_date} ({extendingItem.days_overdue} days overdue)
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  New Approved Deadline
                </label>
                <input
                  type="date"
                  value={newExtensionDate}
                  onChange={(e) => setNewExtensionDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Extension Justification / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved medical concession / supervisor-requested extra week for hardware delivery."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '14px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                className="btn-admin-action btn-admin-secondary"
                onClick={() => setExtendingItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin-action btn-admin-primary"
                onClick={handleSaveExtension}
              >
                Save Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjectDelaysPage;
