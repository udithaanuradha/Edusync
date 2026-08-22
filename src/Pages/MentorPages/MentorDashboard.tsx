import React, { useState, useEffect } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import {
  Target,
  CheckCircle2,
  Clock,
  ListTodo,
  AlertCircle,
  RefreshCw,
  Users,
  Calendar,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import './MentorDashboard.css';

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
export interface MilestoneSummary {
  id: number;
  group_id: number;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  status: 'PENDING' | 'REJECTED' | 'APPROVED' | string;
  totalTasks: number;
  completedTasks: number;
  pct: number;
}

export interface StudentSummary {
  member_id: number;
  name: string;
  role: 'Leader' | 'Member';
  universityId?: string;
  email?: string;
  completedTasks: number;
  ongoingTasks: number;
  yetToStartTasks: number;
  totalAssigned: number;
  contributionPct: number;
  completionRatePct: number;
}

export interface ProjectSummaryData {
  groupId: number;
  groupName: string;
  leaderName: string;
  department?: string;
  levelNumber?: number;
  totalTasks: number;
  completedTasks: number;
  ongoingTasks: number;
  yetToStartTasks: number;
  overallProgressPct: number;
  milestones: MilestoneSummary[];
  students: StudentSummary[];
}

/**
 * MentorDashboard Component
 *
 * Executive landing dashboard for Industry Mentors.
 * Provides at-a-glance project health, milestone roadmap,
 * and individual student workload/contribution metrics.
 */
const MentorDashboard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<ProjectSummaryData | null>(null);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const mentorId = user?.id || '';
      const token = localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (mentorId) headers['x-user-id'] = String(mentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch assigned groups for this mentor directly
      const mentorUrl = mentorId
        ? `http://localhost:5000/api/mentor/groups?mentorId=${mentorId}`
        : `http://localhost:5000/api/mentor/groups`;

      const groupRes = await fetch(mentorUrl, { headers });
      if (!groupRes.ok) throw new Error(`Groups fetch failed with status ${groupRes.status}`);

      const groupResult = await groupRes.json();
      let groups: any[] = [];
      if (Array.isArray(groupResult)) {
        groups = groupResult;
      } else if (groupResult && Array.isArray(groupResult.data)) {
        groups = groupResult.data;
      } else if (groupResult && Array.isArray(groupResult.groups)) {
        groups = groupResult.groups;
      }

      setAssignedGroups(groups);

      if (groups.length === 0) {
        setSummaryData(null);
        setLoading(false);
        return;
      }

      // 2. Select active group
      const activeGroup = selectedGroupId
        ? groups.find((g) => (g.id || g.groupId) === selectedGroupId) || groups[0]
        : groups[0];

      const activeGroupId = activeGroup.id || activeGroup.groupId;
      if (!selectedGroupId && activeGroupId) {
        setSelectedGroupId(activeGroupId);
      }

      // 3. Fetch Milestones for this group from Database
      let milestonesList: any[] = [];
      try {
        const milestoneRes = await fetch(`http://localhost:5000/api/milestones/group/${activeGroupId}`, { headers });
        if (milestoneRes.ok) {
          const mJson = await milestoneRes.json();
          if (Array.isArray(mJson)) milestonesList = mJson;
          else if (mJson && Array.isArray(mJson.data)) milestonesList = mJson.data;
        }
      } catch (mErr) {
        console.warn('Milestones fetch warning:', mErr);
      }

      // 4. Fetch tasks for the group from Dedicated Mentor Endpoint
      let tasksList: any[] = [];
      try {
        const tasksRes = await fetch(`http://localhost:5000/api/mentor/groups/${activeGroupId}/tasks`, { headers });
        if (tasksRes.ok) {
          const tasksJson = await tasksRes.json();
          if (Array.isArray(tasksJson)) {
            tasksList = tasksJson;
          } else if (tasksJson && Array.isArray(tasksJson.data)) {
            tasksList = tasksJson.data;
          }
        }
      } catch (tErr) {
        console.warn('Tasks fetch warning:', tErr);
      }

      // 5. Calculate overall project statistics
      const totalTasks = tasksList.length;
      let completedTasks = 0;
      let ongoingTasks = 0;
      let yetToStartTasks = 0;

      tasksList.forEach((t: any) => {
        const s = String(t.status || '').toUpperCase().trim();
        if (s === 'COMPLETED') completedTasks++;
        else if (s === 'IN_PROGRESS' || s === 'ONGOING') ongoingTasks++;
        else yetToStartTasks++;
      });

      const overallProgressPct = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // 6. Map Milestone Health & Progression
      const processedMilestones: MilestoneSummary[] = milestonesList.map((m: any) => {
        const mTasks = tasksList.filter(
          (t: any) =>
            Number(t.milestone_id) === Number(m.id) ||
            (t.milestone_title && t.milestone_title.trim().toLowerCase() === m.title.trim().toLowerCase())
        );
        const mCompleted = mTasks.filter((t: any) => String(t.status || '').toUpperCase().trim() === 'COMPLETED').length;
        const mPct = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;

        return {
          id: m.id,
          group_id: m.group_id,
          title: m.title,
          description: m.description,
          start_date: m.start_date,
          due_date: m.due_date,
          status: m.status || 'PENDING',
          totalTasks: mTasks.length,
          completedTasks: mCompleted,
          pct: mPct,
        };
      });

      // 7. Calculate Per-Student Performance & Overall Contribution
      const rawMembers: any[] = activeGroup.members || [];
      let leaderName = 'Group Leader';

      const processedStudents: StudentSummary[] = rawMembers.map((m: any) => {
        const memberId = m.id;
        const memberName = (m.name || 'Student').trim();
        const isLeader = Boolean(m.isLeader || Number(m.is_leader) === 1);
        if (isLeader) leaderName = memberName;

        const assignedTasks = tasksList.filter(
          (t: any) =>
            Number(t.assigned_to) === Number(memberId) ||
            (t.assigned_to_name && t.assigned_to_name.trim().toLowerCase() === memberName.toLowerCase())
        );

        let studentCompleted = 0;
        let studentOngoing = 0;
        let studentYet = 0;

        assignedTasks.forEach((t: any) => {
          const s = String(t.status || '').toUpperCase().trim();
          if (s === 'COMPLETED') studentCompleted++;
          else if (s === 'IN_PROGRESS' || s === 'ONGOING') studentOngoing++;
          else studentYet++;
        });

        // Contribution %: What fraction of total project tasks has this student completed?
        const contributionPct = totalTasks > 0
          ? Math.round((studentCompleted / totalTasks) * 100)
          : 0;

        // Completion Rate %: What fraction of their own assigned tasks has the student completed?
        const completionRatePct = assignedTasks.length > 0
          ? Math.round((studentCompleted / assignedTasks.length) * 100)
          : 0;

        return {
          member_id: memberId,
          name: memberName,
          role: isLeader ? 'Leader' : 'Member',
          universityId: m.universityId || m.university_id,
          email: m.email,
          completedTasks: studentCompleted,
          ongoingTasks: studentOngoing,
          yetToStartTasks: studentYet,
          totalAssigned: assignedTasks.length,
          contributionPct,
          completionRatePct,
        };
      });

      setSummaryData({
        groupId: activeGroupId,
        groupName: activeGroup.groupName || activeGroup.projectName || `Group ${activeGroupId}`,
        leaderName,
        department: activeGroup.department || activeGroup.department_name || activeGroup.departmentName || activeGroup.academic_unit || 'ITM',
        levelNumber: activeGroup.level || activeGroup.academic_level || 2,
        totalTasks,
        completedTasks,
        ongoingTasks,
        yetToStartTasks,
        overallProgressPct,
        milestones: processedMilestones,
        students: processedStudents,
      });

    } catch (err: any) {
      console.error('Failed to load project summary data:', err);
      setError(err.message || 'Failed to load project summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [selectedGroupId]);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return null;
    const format = (dStr?: string) => {
      if (!dStr) return '';
      try {
        return new Date(dStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return dStr;
      }
    };
    return `${format(start)} – ${format(end)}`;
  };

  return (
    <div className="app-layout">
      {/* ── Mentor Sidebar ───────────────────────────────────── */}
      <MentorSidebarWrapper />

      <div className="main-viewport">
        {/* ── Header ─────────────────────────────────────────── */}
        <Header pageTitle="" />

        <main className="content-container">
          {/* ── Page Header ───────────────────────────────────── */}
          <div className="mentor-page-header">
            <h1 className="mentor-page-title">Mentor Dashboard</h1>
            <p className="mentor-page-subtitle">
              Executive health summary, milestone roadmap, and student contribution analytics for your assigned project groups.
            </p>
          </div>

          {/* ── Loading / Error State ─────────────────────────── */}
          {loading ? (
            <div className="md-loading-box">
              <div className="md-spinner"></div>
              <span>Loading project summary analytics...</span>
            </div>
          ) : error ? (
            <div className="md-error-box">
              <AlertCircle size={20} className="md-error-icon" />
              <div className="md-error-text">
                <p className="md-error-title">Could not load project summary</p>
                <p className="md-error-desc">{error}</p>
              </div>
              <button className="btn-retry" onClick={fetchSummaryData}>
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          ) : summaryData ? (
            <div className="md-dashboard-grid">

              {/* ════════════════════════════════════════════════════════
                  TOP BANNER — PROJECT PROFILE & TEAM MEMBERS
              ════════════════════════════════════════════════════════ */}
              <div className="md-card md-project-profile-card">
                <div className="md-profile-header-top">
                  <div className="md-project-info-block">
                    <h3 className="md-project-title">{summaryData.groupName}</h3>
                    <div className="md-header-badges-row">
                      <span className="md-leader-badge">
                        👑 Leader: <strong>{summaryData.leaderName}</strong>
                      </span>
                      {summaryData.department && (
                        <span className="md-department-badge">
                          🏢 Dept: <strong>{summaryData.department}</strong>
                        </span>
                      )}
                      {summaryData.levelNumber && (
                        <span className="md-level-tag-badge">
                          Level {summaryData.levelNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multiple Groups Picker (if mentor is assigned >1 group) */}
                  {assignedGroups.length > 1 && (
                    <div className="md-group-picker-top">
                      <label htmlFor="md-group-select" className="md-group-picker-label">
                        Assigned Group:
                      </label>
                      <select
                        id="md-group-select"
                        className="md-group-select"
                        value={selectedGroupId || ''}
                        onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                      >
                        {assignedGroups.map((g) => (
                          <option key={g.id || g.groupId} value={g.id || g.groupId}>
                            {g.groupName || g.projectName || `Group ${g.id || g.groupId}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* All 5 Team Members Badges / Chips */}
                <div className="md-team-members-row">
                  <span className="md-team-label">👥 Team Members ({summaryData.students.length}):</span>
                  <div className="md-team-chips-wrap">
                    {summaryData.students.map((student) => (
                      <span
                        key={student.member_id}
                        className={`md-member-chip ${student.role === 'Leader' ? 'is-leader' : ''}`}
                      >
                        {student.role === 'Leader' && <span className="md-crown-icon">👑</span>}
                        {student.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════
                  SECTION 1 — TASK & MILESTONE EXECUTION OVERVIEW
              ════════════════════════════════════════════════════════ */}
              <div className="md-card md-health-card">
                <div className="md-card-header-row">
                  <div className="md-card-title-group">
                    <Activity size={18} className="md-header-icon" />
                    <h4 className="md-card-title">Task & Milestone Execution Overview</h4>
                  </div>
                  <div className="md-overall-gauge">
                    <span className="md-gauge-pct">{summaryData.overallProgressPct}%</span>
                    <span className="md-gauge-label">Overall Completion</span>
                  </div>
                </div>

                {/* Master Progress Bar */}
                <div className="md-master-track">
                  <div
                    className="md-master-fill"
                    style={{ width: `${summaryData.overallProgressPct}%` }}
                  ></div>
                </div>

                {/* Stats Counters Grid */}
                <div className="md-stats-grid">
                  <div className="md-stat-box completed">
                    <div className="md-stat-icon-wrap completed">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="md-stat-details">
                      <span className="md-stat-value">{summaryData.completedTasks}</span>
                      <span className="md-stat-title">Completed Tasks</span>
                    </div>
                  </div>

                  <div className="md-stat-box ongoing">
                    <div className="md-stat-icon-wrap ongoing">
                      <Clock size={16} />
                    </div>
                    <div className="md-stat-details">
                      <span className="md-stat-value">{summaryData.ongoingTasks}</span>
                      <span className="md-stat-title">Ongoing Tasks</span>
                    </div>
                  </div>

                  <div className="md-stat-box yet">
                    <div className="md-stat-icon-wrap yet">
                      <ListTodo size={16} />
                    </div>
                    <div className="md-stat-details">
                      <span className="md-stat-value">{summaryData.yetToStartTasks}</span>
                      <span className="md-stat-title">Yet to Start Tasks</span>
                    </div>
                  </div>

                  <div className="md-stat-box milestones">
                    <div className="md-stat-icon-wrap milestones">
                      <Target size={16} />
                    </div>
                    <div className="md-stat-details">
                      <span className="md-stat-value">{summaryData.milestones.length}</span>
                      <span className="md-stat-title">Total Milestones</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════
                  SECTION 2 — STUDENT CONTRIBUTION & TASK BREAKDOWN MATRIX
              ════════════════════════════════════════════════════════ */}
              <div className="md-card md-students-card">
                <div className="md-card-header-row">
                  <div className="md-card-title-group">
                    <Users size={18} className="md-header-icon" />
                    <h4 className="md-card-title">Student Contribution & Workload Distribution</h4>
                  </div>
                  <span className="md-header-hint">
                    Real-time task tracking and project contribution per member
                  </span>
                </div>

                <div className="md-students-table-wrap">
                  <table className="md-students-table">
                    <thead>
                      <tr>
                        <th>Student Member</th>
                        <th className="text-center">Completed</th>
                        <th className="text-center">Ongoing</th>
                        <th className="text-center">Yet to Start</th>
                        <th className="text-center">Total Assigned</th>
                        <th>Project Contribution</th>
                        <th>Personal Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.students.map((student) => {
                        const initials = student.name
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={student.member_id} className={student.role === 'Leader' ? 'is-leader-row' : ''}>
                            {/* Member Info */}
                            <td>
                              <div className="md-member-col">
                                <div className={`md-avatar ${student.role === 'Leader' ? 'leader-avatar' : ''}`}>
                                  {initials || '?'}
                                </div>
                                <div className="md-member-info">
                                  <div className="md-name-row">
                                    <span className="md-name">{student.name}</span>
                                    <span className={`md-role-tag ${student.role.toLowerCase()}`}>
                                      {student.role}
                                    </span>
                                  </div>
                                  {student.universityId && (
                                    <span className="md-sub-id">{student.universityId}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Completed Pill */}
                            <td className="text-center">
                              <span className={`md-count-badge completed ${student.completedTasks > 0 ? 'active' : ''}`}>
                                {student.completedTasks}
                              </span>
                            </td>

                            {/* Ongoing Pill */}
                            <td className="text-center">
                              <span className={`md-count-badge ongoing ${student.ongoingTasks > 0 ? 'active' : ''}`}>
                                {student.ongoingTasks}
                              </span>
                            </td>

                            {/* Yet to Start Pill */}
                            <td className="text-center">
                              <span className={`md-count-badge yet ${student.yetToStartTasks > 0 ? 'active' : ''}`}>
                                {student.yetToStartTasks}
                              </span>
                            </td>

                            {/* Total Assigned */}
                            <td className="text-center">
                              <span className="md-total-assigned">{student.totalAssigned} tasks</span>
                            </td>

                            {/* Overall Project Contribution */}
                            <td>
                              <div className="md-contrib-bar-wrap">
                                <div className="md-bar-track">
                                  <div
                                    className="md-bar-fill contrib"
                                    style={{ width: `${student.contributionPct}%` }}
                                  ></div>
                                </div>
                                <div className="md-contrib-meta">
                                  <span className="md-contrib-pct">{student.contributionPct}%</span>
                                  <span className="md-contrib-sub">({student.completedTasks}/{summaryData.totalTasks} project tasks)</span>
                                </div>
                              </div>
                            </td>

                            {/* Personal Completion Rate */}
                            <td>
                              <div className="md-contrib-bar-wrap">
                                <div className="md-bar-track">
                                  <div
                                    className="md-bar-fill personal"
                                    style={{ width: `${student.completionRatePct}%` }}
                                  ></div>
                                </div>
                                <span className="md-personal-pct">{student.completionRatePct}% completed</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════
                  SECTION 3 — MILESTONES PROGRESSION ROADMAP
              ════════════════════════════════════════════════════════ */}
              <div className="md-card md-milestones-card">
                <div className="md-card-header-row">
                  <div className="md-card-title-group">
                    <Target size={18} className="md-header-icon" />
                    <h4 className="md-card-title">Milestone Roadmap & Health</h4>
                  </div>
                  <span className="md-header-hint">
                    Progress status of all project milestones
                  </span>
                </div>

                <div className="md-milestone-grid">
                  {summaryData.milestones.map((m, idx) => (
                    <div key={m.id} className="md-milestone-tile">
                      <div className="md-m-tile-header">
                        <div className="md-m-tile-left">
                          <span className="md-m-index">0{idx + 1}</span>
                          <h5 className="md-m-title">{m.title}</h5>
                        </div>
                        <span className={`md-m-status ${m.status.toLowerCase()}`}>
                          {m.status}
                        </span>
                      </div>

                      {m.description && (
                        <p className="md-m-desc">{m.description}</p>
                      )}

                      {formatDateRange(m.start_date, m.due_date) && (
                        <div className="md-m-date">
                          <Calendar size={11} />
                          <span>{formatDateRange(m.start_date, m.due_date)}</span>
                        </div>
                      )}

                      <div className="md-m-progress-section">
                        <div className="md-m-track">
                          <div
                            className="md-m-fill"
                            style={{ width: `${m.pct}%` }}
                          ></div>
                        </div>
                        <div className="md-m-stat-row">
                          <span className="md-m-tasks-count">{m.completedTasks} of {m.totalTasks} tasks done</span>
                          <span className="md-m-pct-val">{m.pct}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="md-empty-dashboard-card">
              <div className="md-empty-icon-box">
                <ShieldAlert size={40} className="text-amber-500" />
              </div>
              <h3>No Active Project Groups Assigned</h3>
              <p>
                Industry mentors are only assigned to Level 2, Level 3, and Level 4 projects (Level 1 projects are restricted for mentors).
                You currently do not have any active project group assignments. Once a Level 2, 3, or 4 project group is assigned to you, its performance metrics and milestone roadmap will appear here.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;