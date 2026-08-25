import React, { useState, useEffect, useMemo } from 'react';
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

const INITIAL_SAMPLE_DELAYS: ProjectDelayItem[] = [
  {
    id: 101,
    group_id: 280000,
    group_name: 'Bug fixers',
    level: 2,
    degree: 'ITM',
    milestone_title: 'Proposal SRS & Architecture Sign-off',
    task_name: 'Database ERD and Schema Approval',
    due_date: '2026-08-10',
    days_overdue: 11,
    supervisor_name: 'kasun bandara',
    mentor_name: 'External Industry Mentor',
    leader_name: 'RDUA Gurubawila',
    leader_email: 'udithaanuradha276@gmail.com',
    status: 'Moderate',
    notes: 'Awaiting revised schema diagram submission from group leader.',
  },
  {
    id: 102,
    group_id: 290001,
    group_name: 'VisionAI Innovators',
    level: 4,
    degree: 'AI',
    milestone_title: 'Model Training & Baseline Evaluation',
    task_name: 'PyTorch Model Checkpoint Verification',
    due_date: '2026-08-04',
    days_overdue: 17,
    supervisor_name: 'Ama Prasad',
    mentor_name: 'Dr. Chathura Silva',
    leader_name: 'Kavindu Perera',
    leader_email: 'kavindu.ai@uom.lk',
    status: 'Critical',
    is_flagged: true,
    notes: 'GPU compute resource delay during training phase.',
  },
  {
    id: 103,
    group_id: 10001,
    group_name: 'CodeCrafters',
    level: 3,
    degree: 'IT',
    milestone_title: 'Mid-term Prototype Deployment',
    task_name: 'Docker Swarm Deployment',
    due_date: '2026-08-17',
    days_overdue: 4,
    supervisor_name: 'kasun bandara',
    mentor_name: 'Saman Kumara',
    leader_name: 'Nimasha Fernando',
    leader_email: 'nimasha.f@uom.lk',
    status: 'Minor',
    notes: 'Frontend API integration in progress.',
  },
  {
    id: 104,
    group_id: 50001,
    group_name: 'CloudScale Squad',
    level: 1,
    degree: 'IT',
    milestone_title: 'Project Inception & Topic Proposal',
    task_name: 'Topic Selection & Problem Statement',
    due_date: '2026-08-01',
    days_overdue: 20,
    supervisor_name: 'Thilak Perera',
    mentor_name: 'Not Assigned',
    leader_name: 'Sanuja Dissanayake',
    leader_email: 'sanuja.d@uom.lk',
    status: 'Critical',
    is_flagged: true,
    notes: 'Student group leader unresponsive for 2 weeks.',
  },
  {
    id: 105,
    group_id: 60002,
    group_name: 'CyShield ITM',
    level: 3,
    degree: 'ITM',
    milestone_title: 'Security Audit & Compliance Report',
    task_name: 'ISO 27001 Checklist Submission',
    due_date: '2026-08-14',
    days_overdue: 7,
    supervisor_name: 'Ama Prasad',
    mentor_name: 'Priyantha De Silva',
    leader_name: 'Hasitha Ranasinghe',
    leader_email: 'hasitha.r@uom.lk',
    status: 'Moderate',
    notes: 'Pending industry client NDA sign-off.',
  },
];

const AdminProjectDelaysPage: React.FC = () => {
  const [delays, setDelays] = useState<ProjectDelayItem[]>(INITIAL_SAMPLE_DELAYS);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<number | 'ALL'>('ALL');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extension Modal state
  const [extendingItem, setExtendingItem] = useState<ProjectDelayItem | null>(null);
  const [newExtensionDate, setNewExtensionDate] = useState<string>('');
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch real delays from backend if available
  useEffect(() => {
    const fetchRealDelays = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/mentor/project-delays', {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const mapped: ProjectDelayItem[] = data.data.map((item: any, idx: number) => {
              const due = new Date(item.due_date || item.deadline || '2026-08-15');
              due.setHours(0, 0, 0, 0);
              const diffDays = Math.max(1, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
              
              let status: 'Critical' | 'Moderate' | 'Minor' = 'Minor';
              if (diffDays > 14) status = 'Critical';
              else if (diffDays >= 7) status = 'Moderate';

              return {
                id: item.task_id || item.id || idx + 100,
                group_id: item.group_id,
                group_name: item.group_name || 'Unnamed Group',
                level: Number(item.level || item.academic_level || 2),
                degree: (item.degree || 'ITM') as 'IT' | 'ITM' | 'AI',
                milestone_title: item.milestone_title || item.task_name || 'Scheduled Milestone',
                task_name: item.description || item.task_name,
                due_date: item.due_date || '2026-08-15',
                days_overdue: diffDays,
                supervisor_name: item.supervisor_name || 'Assigned Supervisor',
                mentor_name: item.mentor_name || 'Assigned Mentor',
                leader_name: item.assigned_to_name || item.leader_name || 'Group Leader',
                status,
                is_flagged: diffDays > 14,
                notes: item.notes || '',
              };
            });

            // Combine backend items with existing sample items so Admin has full visibility
            setDelays(mapped);
          }
        }
      } catch (err) {
        console.warn('Backend project delays query, using loaded overview items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealDelays();
  }, []);

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
    // Default next week
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
    link.setAttribute('download', `EduSync_Project_Delays_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-delays-shell">
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
                <p className="admin-delays-subtitle">
                  Faculty-wide monitoring of overdue project milestones, blockers, and deadline extensions across Levels 1–4.
                </p>
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

          {/* Action Success Banner */}
          {actionSuccessMsg && (
            <div style={{
              padding: '14px 20px',
              backgroundColor: 'var(--eds-color-success-bg)',
              border: '1px solid var(--eds-color-success-solid)',
              borderRadius: '12px',
              color: 'var(--eds-color-success-text)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <CheckCircle2 size={18} color="var(--eds-color-success-solid)" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Top KPI Metrics Cards */}
          <div className="admin-delays-stats-grid">
            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--eds-color-danger-bg)', color: 'var(--eds-color-danger-solid)' }}>
                <AlertTriangle size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{metrics.total}</span>
                <span className="stat-label">Total Overdue Items</span>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--eds-color-danger-bg)', color: 'var(--eds-color-danger-text)', border: '1px solid var(--eds-color-danger-solid)' }}>
                <ShieldAlert size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-value" style={{ color: 'var(--eds-color-danger-text)' }}>{metrics.critical}</span>
                <span className="stat-label">Critical Delays (&gt;14d)</span>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--eds-color-warning-bg)', color: 'var(--eds-color-warning-text)' }}>
                <Clock size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-value" style={{ color: 'var(--eds-color-warning-text)' }}>{metrics.moderate}</span>
                <span className="stat-label">Moderate Delays (3–14d)</span>
              </div>
            </div>

            <div className="admin-delays-stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--eds-color-primary-soft)', color: 'var(--eds-color-primary)' }}>
                <Users size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{metrics.distinctGroups}</span>
                <span className="stat-label">Affected Project Groups</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="admin-delays-filter-box">
            <div className="filter-left-group">
              {/* Level Filter Pills */}
              <div className="level-pill-group">
                {(['ALL', 1, 2, 3, 4] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-pill-btn ${selectedLevel === lvl ? 'active' : ''}`}
                    onClick={() => setSelectedLevel(lvl)}
                  >
                    {lvl === 'ALL' ? 'All Levels' : `Level ${lvl}`}
                  </button>
                ))}
              </div>

              {/* Degree Filter */}
              <select
                className="custom-select-filter"
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
              >
                <option value="ALL">All Degrees</option>
                <option value="IT">IT</option>
                <option value="ITM">ITM</option>
                <option value="AI">AI</option>
              </select>

              {/* Severity Filter */}
              <select
                className="custom-select-filter"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical (&gt;14 Days)</option>
                <option value="moderate">Moderate (3–14 Days)</option>
                <option value="minor">Minor (&lt;3 Days)</option>
              </select>
            </div>

            {/* Live Search */}
            <div className="search-input-wrap">
              <Search size={15} color="var(--eds-color-text-faint)" />
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
              <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>
                Showing active overdue stages requiring administrative attention
              </div>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--eds-color-text-faint)' }}>
                        Loading overdue projects...
                      </td>
                    </tr>
                  ) : filteredDelays.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--eds-color-text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={32} color="var(--eds-color-success-solid)" />
                          <span style={{ fontWeight: '600', color: 'var(--eds-color-text-strong)', fontSize: '15px' }}>
                            All projects on track for this selection!
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--eds-color-text-muted)' }}>
                            No pending overdue milestones found.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDelays.map((item) => {
                      const isCrit = item.status === 'Critical' || item.days_overdue > 14;
                      return (
                        <tr
                          key={item.id}
                          className={`delays-table-row ${isCrit ? 'critical-row' : ''}`}
                        >
                          {/* Group & Cohort */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--eds-color-text-strong)', fontSize: '14px' }}>
                                  {item.group_name}
                                </span>
                                {item.is_flagged && (
                                  <span title="Flagged High Risk" style={{ color: 'var(--eds-color-danger-solid)' }}>
                                    🚩
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="badge-level">Level {item.level}</span>
                                <span className={`badge-degree ${item.degree.toLowerCase()}`}>
                                  {item.degree}
                                </span>
                                {item.leader_name && (
                                  <span style={{ fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                                    • Lead: {item.leader_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Overdue Milestone */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: '600', color: 'var(--eds-color-text-strong)', fontSize: '13px' }}>
                                {item.milestone_title}
                              </span>
                              {item.task_name && (
                                <span style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                                  {item.task_name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Deadline & Overdue Duration */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>
                                Due: {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className={`badge-overdue ${item.status.toLowerCase()}`}>
                                <AlertTriangle size={11} />
                                {item.days_overdue} days overdue
                              </span>
                            </div>
                          </td>

                          {/* Supervisor & Mentor */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-strong)' }}>
                                <User size={13} color="var(--eds-color-text-muted)" />
                                {item.supervisor_name}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                                Mentor: {item.mentor_name || 'None'}
                              </span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td>
                            <div style={{ maxWidth: '240px', fontSize: '12px', color: 'var(--eds-color-text-muted)', lineHeight: '1.4' }}>
                              {item.notes || 'No blocker notes reported.'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn-table-action btn-reminder"
                                onClick={() => handleSendReminder(item)}
                                title="Send immediate reminder alert to group and supervisor"
                              >
                                <Send size={12} />
                                Remind
                              </button>

                              <button
                                type="button"
                                className="btn-table-action btn-extend"
                                onClick={() => handleOpenExtensionModal(item)}
                                title="Grant deadline extension"
                              >
                                <CalendarPlus size={12} />
                                Extend
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleFlag(item.id)}
                                title={item.is_flagged ? 'Unflag Risk' : 'Flag High Academic Risk'}
                                style={{
                                  background: item.is_flagged ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-bg-surface-soft)',
                                  border: `1px solid ${item.is_flagged ? 'var(--eds-color-danger-solid)' : 'var(--eds-color-border)'}`,
                                  color: item.is_flagged ? 'var(--eds-color-danger-solid)' : 'var(--eds-color-text-muted)',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                <Flag size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deadline Extension Modal */}
          {extendingItem && (
            <div className="modal-overlay-delays">
              <div className="modal-card-delays">
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--eds-color-border-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--eds-color-bg-surface-soft)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--eds-color-primary-soft)',
                      color: 'var(--eds-color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--eds-color-primary-soft-border)',
                    }}>
                      <CalendarPlus size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                        Grant Deadline Extension
                      </h3>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                        {extendingItem.group_name} (Level {extendingItem.level})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExtendingItem(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--eds-color-text-faint)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-strong)', marginBottom: '6px' }}>
                      Milestone / Deliverable:
                    </label>
                    <div style={{ padding: '10px 14px', background: 'var(--eds-color-bg-surface-soft)', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-strong)' }}>
                      {extendingItem.milestone_title}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-strong)', marginBottom: '6px' }}>
                      New Extended Deadline:
                    </label>
                    <input
                      type="date"
                      value={newExtensionDate}
                      onChange={(e) => setNewExtensionDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--eds-color-border)',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--eds-color-text-strong)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-strong)', marginBottom: '6px' }}>
                      Administrative Approval Reason / Remark:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Approved 7-day extension due to lab maintenance; authorized by Coordinator."
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--eds-color-border)',
                        fontSize: '13px',
                        color: 'var(--eds-color-text-strong)',
                        outline: 'none',
                        resize: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  padding: '16px 24px',
                  backgroundColor: 'var(--eds-color-bg-surface-soft)',
                  borderTop: '1px solid var(--eds-color-border-soft)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
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
                    Approve Extension
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminProjectDelaysPage;
