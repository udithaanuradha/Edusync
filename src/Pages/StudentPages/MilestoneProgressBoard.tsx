import React, { useMemo, useState } from 'react';
import { ListChecks, CheckCircle2, Clock, AlertTriangle, Plus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import StatCard from '../../components/shared/ui/StatCard';
import TaskKanbanBoard, { TaskCardError } from './TaskKanbanBoard';
import type { ProjectTask, TaskStatus } from './projectTaskTypes';
import './MilestoneProgressBoard.css';

type RiskLevel = 'on-track' | 'at-risk' | 'behind';

type CurrentUser = { id: number | string; name: string } | null;

type MilestoneProgressBoardProps = {
  /** The logged-in student's OWN tasks — drives the overall stat strip and
      each milestone card's personal To Do / In Progress / Completed columns. */
  tasks: ProjectTask[];
  /** Every task in the group, regardless of assignee — drives each
      milestone's team-wide status badge/progress/advisory and the
      "Who's working on this milestone" panel. */
  allGroupTasks: ProjectTask[];
  milestoneOptions: { id: number | string; title: string }[];
  userRole: 'leader' | 'member';
  optimisticStatus: Record<string, TaskStatus>;
  pendingTaskIds: Record<string, boolean>;
  taskErrors: Record<string, TaskCardError>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  /** Adds a new, self-assigned task — same save path the old TaskCreation.tsx used. */
  onAddTask: (task: ProjectTask) => void;
  currentUser: CurrentUser;
  /** Total member count of the underlying group record — an Individual
      Project is a "group of one" that reuses this exact board, so the
      "Who's working on this milestone" panel, the duplicate-task warning,
      and the "you haven't claimed a scope section" warning (nothing to
      claim solo) only make sense with more than one member. Undefined
      (still loading) defaults to showing them, same as today. */
  memberCount?: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SCOPE_API_BASE = 'http://localhost:5000/api/milestones';

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const todayInputValue = () => startOfToday().toISOString().slice(0, 10);

/**
 * Purely UI-side "is this task falling behind" read on a task's own
 * startDate/endDate — no new backend data required. A task only carries
 * risk while it isn't COMPLETED yet.
 */
const getDaysUntilDue = (task: ProjectTask): number | null => {
  if (!task.endDate) return null;
  const due = new Date(`${task.endDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due.getTime() - startOfToday().getTime()) / MS_PER_DAY);
};

const RISK_LABEL: Record<RiskLevel, string> = {
  behind: 'Behind Schedule',
  'at-risk': 'At Risk',
  'on-track': 'On Track',
};

/**
 * Produces the numbers + one-line advice shown on a milestone's card. Takes
 * the milestone's TEAM-WIDE tasks (every member, not just the viewer) since
 * "is this milestone on track" is a whole-team question, not a personal one.
 * All computed client-side from task status + dates already loaded onto the
 * page — no extra API calls.
 */
const summarizeMilestone = (
  teamTasks: ProjectTask[],
  optimisticStatus: Record<string, TaskStatus>,
) => {
  let completed = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let worst: { task: ProjectTask; days: number } | null = null;
  let soonest: { task: ProjectTask; days: number } | null = null;

  teamTasks.forEach((task) => {
    const status = optimisticStatus[task.id] ?? task.status;
    if (status === 'COMPLETED') {
      completed += 1;
      return;
    }
    const diffDays = getDaysUntilDue(task);
    if (diffDays === null) return;

    if (diffDays < 0) {
      overdueCount += 1;
      const days = Math.abs(diffDays);
      if (!worst || days > worst.days) worst = { task, days };
    } else if (diffDays <= 2) {
      dueSoonCount += 1;
      if (!soonest || diffDays < soonest.days) soonest = { task, days: diffDays };
    }
  });

  const total = teamTasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const riskLevel: RiskLevel = overdueCount > 0 ? 'behind' : dueSoonCount > 0 ? 'at-risk' : 'on-track';

  let advice = '';
  if (worst) {
    const { task, days } = worst as { task: ProjectTask; days: number };
    advice = `"${task.title}" is ${days} day${days === 1 ? '' : 's'} overdue (assigned to ${task.assignedTo}). Reach out and move it forward today.`;
  } else if (soonest) {
    const { task, days } = soonest as { task: ProjectTask; days: number };
    advice = days === 0
      ? `"${task.title}" is due today — assigned to ${task.assignedTo}.`
      : `"${task.title}" is due in ${days} day${days === 1 ? '' : 's'} (assigned to ${task.assignedTo}). Start now to stay on track.`;
  }

  return { total, completed, overdueCount, dueSoonCount, progressPercent, riskLevel, advice };
};

/**
 * Soft duplicate-detection: exact title match, or a containment match once
 * both titles are at least 6 characters (short titles like "UI" or "Docs"
 * are too generic to flag as a collision). Scans the milestone's TEAM-WIDE
 * tasks so it catches a teammate's task, not just the viewer's own.
 */
const findDuplicateTask = (title: string, teamTasks: ProjectTask[]): ProjectTask | null => {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;
  for (const task of teamTasks) {
    const other = task.title.trim().toLowerCase();
    if (!other) continue;
    if (other === normalized) return task;
    if (normalized.length >= 6 && other.length >= 6 && (other.includes(normalized) || normalized.includes(other))) {
      return task;
    }
  }
  return null;
};

type QuickAddFormState = { title: string; description: string; startDate: string; endDate: string };

const emptyQuickAddForm = (): QuickAddFormState => ({
  title: '',
  description: '',
  startDate: todayInputValue(),
  endDate: '',
});

// Whether the current student has claimed at least one scope section for a
// given milestone — fetched on demand (only when that milestone's add-task
// form opens) rather than eagerly for every milestone up front.
type ScopeCheckState = { milestoneId: string; loading: boolean; hasClaim: boolean };

const MilestoneProgressBoard: React.FC<MilestoneProgressBoardProps> = ({
  tasks,
  allGroupTasks,
  milestoneOptions,
  userRole,
  optimisticStatus,
  pendingTaskIds,
  taskErrors,
  onStatusChange,
  onAddTask,
  currentUser,
  memberCount,
}) => {
  // Which milestone's quick-add form is currently open (at most one at a time).
  const [openAddFormId, setOpenAddFormId] = useState<string | null>(null);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddFormState>(emptyQuickAddForm());
  const [quickAddError, setQuickAddError] = useState('');
  const [scopeCheck, setScopeCheck] = useState<ScopeCheckState | null>(null);

  // Only one milestone is shown at a time — navigated with the prev/next
  // arrows — rather than every milestone stacked in one long scroll. Clamped
  // at render time (not written back to state) so it self-corrects if the
  // milestone list shrinks out from under a stale index.
  const [rawFocusedIndex, setRawFocusedIndex] = useState(0);

  // Build one section per milestone from Project Overview — including a
  // milestone with zero tasks so far, so a student can add their first task
  // into it — then fold in any task whose milestone isn't in that list
  // (e.g. a milestone that was since renamed or removed). Tracks both the
  // viewer's own tasks and the whole team's tasks per milestone.
  const milestoneGroups = useMemo(() => {
    const ownByMilestoneId = new Map<string, ProjectTask[]>();
    tasks.forEach((task) => {
      const key = String(task.milestoneId ?? 'unassigned');
      if (!ownByMilestoneId.has(key)) ownByMilestoneId.set(key, []);
      ownByMilestoneId.get(key)!.push(task);
    });

    const teamByMilestoneId = new Map<string, ProjectTask[]>();
    allGroupTasks.forEach((task) => {
      const key = String(task.milestoneId ?? 'unassigned');
      if (!teamByMilestoneId.has(key)) teamByMilestoneId.set(key, []);
      teamByMilestoneId.get(key)!.push(task);
    });

    const groups = milestoneOptions.map((m) => ({
      id: String(m.id),
      title: m.title,
      ownTasks: ownByMilestoneId.get(String(m.id)) || [],
      teamTasks: teamByMilestoneId.get(String(m.id)) || [],
    }));

    const knownIds = new Set(milestoneOptions.map((m) => String(m.id)));
    teamByMilestoneId.forEach((teamTasksForKey, key) => {
      if (!knownIds.has(key)) {
        groups.push({
          id: key,
          title: teamTasksForKey[0]?.milestone || 'Other Tasks',
          ownTasks: ownByMilestoneId.get(key) || [],
          teamTasks: teamTasksForKey,
        });
      }
    });

    return groups;
  }, [tasks, allGroupTasks, milestoneOptions]);

  const focusedIndex = milestoneGroups.length > 0
    ? Math.min(rawFocusedIndex, milestoneGroups.length - 1)
    : 0;
  const focusedGroup = milestoneGroups[focusedIndex] || null;

  const goToPrevMilestone = () => {
    closeQuickAdd();
    setRawFocusedIndex((i) => Math.max(0, i - 1));
  };

  const goToNextMilestone = () => {
    closeQuickAdd();
    setRawFocusedIndex((i) => Math.min(milestoneGroups.length - 1, i + 1));
  };

  // Overall stat strip is personal — "your" total/completed/in-progress.
  const overall = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    tasks.forEach((task) => {
      const status = optimisticStatus[task.id] ?? task.status;
      if (status === 'COMPLETED') {
        completed += 1;
        return;
      }
      if (status === 'IN_PROGRESS') inProgress += 1;
    });
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, percent };
  }, [tasks, optimisticStatus]);

  const openQuickAdd = async (milestoneId: string) => {
    setOpenAddFormId(milestoneId);
    setQuickAddForm(emptyQuickAddForm());
    setQuickAddError('');
    setScopeCheck({ milestoneId, loading: true, hasClaim: true });

    try {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const res = await fetch(`${SCOPE_API_BASE}/${milestoneId}/scope`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
          ...(user?.role ? { 'X-User-Role': String(user.role) } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        const hasClaim = currentUser
          ? (data.data || []).some((s: any) => String(s.claimed_by) === String(currentUser.id))
          : false;
        setScopeCheck({ milestoneId, loading: false, hasClaim });
      } else {
        // Fail open — a scope-fetch error shouldn't block/warn on task entry.
        setScopeCheck({ milestoneId, loading: false, hasClaim: true });
      }
    } catch (e) {
      setScopeCheck({ milestoneId, loading: false, hasClaim: true });
    }
  };

  const closeQuickAdd = () => {
    setOpenAddFormId(null);
    setQuickAddError('');
    setScopeCheck(null);
  };

  const handleQuickAddSubmit = (group: { id: string; title: string }, event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser?.id) {
      setQuickAddError('User session not found. Please log in again.');
      return;
    }
    if (!quickAddForm.title.trim() || !quickAddForm.endDate) {
      setQuickAddError('Please add a task title and a due date.');
      return;
    }
    if (quickAddForm.startDate && new Date(quickAddForm.startDate) > new Date(quickAddForm.endDate)) {
      setQuickAddError('Start date cannot be later than the due date.');
      return;
    }

    const newTask: ProjectTask = {
      id: Math.random().toString(36).substring(2, 9),
      milestoneId: group.id,
      milestone: group.title,
      title: quickAddForm.title.trim(),
      description: quickAddForm.description.trim(),
      assignedToId: currentUser.id,
      assignedTo: currentUser.name,
      status: 'TODO',
      startDate: quickAddForm.startDate || todayInputValue(),
      endDate: quickAddForm.endDate,
    };

    // Self-assign only, always — a student can only ever create a task for
    // themselves, matching the retired leader-assign-to-anyone form.
    onAddTask(newTask);
    closeQuickAdd();
  };

  return (
    <div className="mpb-wrapper">
      <div className="mpb-performance-row">
        <StatCard title="Total Tasks" value={overall.total} icon={<ListChecks size={18} />} tone="primary" />
        <StatCard
          title="Completed"
          value={overall.completed}
          subtext={`${overall.percent}% of your work`}
          icon={<CheckCircle2 size={18} />}
          tone="success"
        />
        <StatCard title="In Progress" value={overall.inProgress} icon={<Clock size={18} />} tone="warning" />
      </div>

      <div className="mpb-milestone-nav">
        <button
          type="button"
          className="mpb-nav-arrow"
          onClick={goToPrevMilestone}
          disabled={focusedIndex === 0}
          aria-label="Previous milestone"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="mpb-milestone-nav-label">
          {focusedGroup
            ? `Milestone ${focusedIndex + 1} of ${milestoneGroups.length} — ${focusedGroup.title}`
            : 'No milestones yet'}
        </span>
        <button
          type="button"
          className="mpb-nav-arrow"
          onClick={goToNextMilestone}
          disabled={focusedIndex >= milestoneGroups.length - 1}
          aria-label="Next milestone"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mpb-milestone-list">
        {!focusedGroup ? (
          <div className="mpb-empty-milestone">
            No milestones yet — add one from the Project Overview tab.
          </div>
        ) : (() => {
          const group = focusedGroup;
          const stats = summarizeMilestone(group.teamTasks, optimisticStatus);
          const isAddFormOpen = openAddFormId === group.id;
          // Both of these compare against teammates, so neither applies to
          // an Individual Project's group-of-one (memberCount === 1).
          const duplicateTask =
            memberCount !== 1 && isAddFormOpen ? findDuplicateTask(quickAddForm.title, group.teamTasks) : null;
          const scopeWarningVisible =
            memberCount !== 1 &&
            isAddFormOpen && scopeCheck?.milestoneId === group.id && !scopeCheck.loading && !scopeCheck.hasClaim;

          return (
            <div key={group.id} className={`mpb-milestone-card mpb-risk-${stats.riskLevel}`}>
              <div className="mpb-milestone-header">
                <div className="mpb-milestone-heading">
                  <h4>{group.title}</h4>
                  <span className={`mpb-risk-badge mpb-risk-badge-${stats.riskLevel}`}>
                    {RISK_LABEL[stats.riskLevel]}
                  </span>
                </div>
                <div className="mpb-progress-meta">
                  <span>{stats.completed}/{stats.total} tasks completed</span>
                  <span className="mpb-progress-percent">{stats.progressPercent}%</span>
                </div>
              </div>

              <div className="mpb-progress-track" role="progressbar" aria-valuenow={stats.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`mpb-progress-fill mpb-progress-fill-${stats.riskLevel}`}
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>

              {stats.advice && (
                <div className={`mpb-advice-banner mpb-advice-${stats.riskLevel}`} role="status">
                  <AlertTriangle size={15} />
                  <span>{stats.advice}</span>
                </div>
              )}

              {memberCount !== 1 && group.teamTasks.length > 0 && (
                <div className="mpb-who-panel">
                  <p className="mpb-who-title"><Users size={14} /> Who&apos;s working on this milestone</p>
                  <div className="mpb-who-list">
                    {group.teamTasks.map((task) => {
                      const status = optimisticStatus[task.id] ?? task.status;
                      return (
                        <div className="mpb-who-row" key={task.id}>
                          <span className="mpb-who-name">{task.assignedTo}</span>
                          <span className="mpb-who-task">{task.title}</span>
                          <span className={`status-pill ${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {group.ownTasks.length === 0 && (
                <div className="mpb-empty-milestone">No tasks here yet.</div>
              )}

              {group.ownTasks.length > 0 && (
                <TaskKanbanBoard
                  tasks={group.ownTasks}
                  userRole={userRole}
                  optimisticStatus={optimisticStatus}
                  pendingTaskIds={pendingTaskIds}
                  taskErrors={taskErrors}
                  onStatusChange={onStatusChange}
                />
              )}

              {isAddFormOpen ? (
                <form className="mpb-quick-add-form" onSubmit={(e) => handleQuickAddSubmit(group, e)}>
                  {scopeWarningVisible && (
                    <p className="mpb-quick-add-warning">
                      ⚠ You haven&apos;t claimed a scope section for this milestone yet — check Project Overview,
                      or confirm with your leader before adding this.
                    </p>
                  )}
                  <div className="mpb-quick-add-row">
                    <input
                      type="text"
                      placeholder="Task title"
                      value={quickAddForm.title}
                      onChange={(e) => setQuickAddForm((prev) => ({ ...prev, title: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  {duplicateTask && (
                    <p className="mpb-quick-add-warning">
                      ⚠ &quot;{duplicateTask.title}&quot; is already assigned to {duplicateTask.assignedTo} in this
                      milestone — check with them before adding this, so you don&apos;t both do the same work.
                    </p>
                  )}
                  <div className="mpb-quick-add-row">
                    <textarea
                      placeholder="Description (optional)"
                      value={quickAddForm.description}
                      onChange={(e) => setQuickAddForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="mpb-quick-add-dates">
                    <div className="mpb-quick-add-date-field">
                      <label>Start</label>
                      <input
                        type="date"
                        value={quickAddForm.startDate}
                        onChange={(e) => setQuickAddForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="mpb-quick-add-date-field">
                      <label>Due</label>
                      <input
                        type="date"
                        value={quickAddForm.endDate}
                        onChange={(e) => setQuickAddForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  {quickAddError && <p className="mpb-quick-add-error">{quickAddError}</p>}
                  <div className="mpb-quick-add-actions">
                    <button type="submit" className="mpb-quick-add-save">Add Task</button>
                    <button type="button" className="mpb-quick-add-cancel" onClick={closeQuickAdd}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="mpb-add-task-btn"
                  onClick={() => openQuickAdd(group.id)}
                >
                  <Plus size={15} /> Add a task for yourself in this milestone
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default MilestoneProgressBoard;
