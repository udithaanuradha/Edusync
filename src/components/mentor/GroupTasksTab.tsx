import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  AlertCircle,
  Calendar,
  Tag,
  Target,
  Layers,
  Info,
  TrendingUp,
  Users,
} from 'lucide-react';
import './GroupTasksTab.css';

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
export interface Task {
  task_id: number;
  task_name: string;
  description?: string;
  milestone_title?: string;
  milestone_id?: number;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | string;
  due_date?: string;
  created_at?: string;
  mentor_feedback?: string | null;
}

export interface Milestone {
  id: number;
  group_id: number;
  title: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  status: 'PENDING' | 'REJECTED' | 'APPROVED' | string;
  feedback_reason?: string | null;
  created_at?: string;
}

export interface MemberTasks {
  member_id: number;
  name: string;
  role: 'Leader' | 'Member';
  universityId?: string;
  email?: string;
  tasks: {
    completed: Task[];
    ongoing: Task[];
    yetToStart: Task[];
  };
}

export interface GroupTasksData {
  groupId: number;
  groupName: string;
  totalTasks: number;
  completedCount: number;
  ongoingCount: number;
  yetToStartCount: number;
  allTasks: any[];
  milestones: Milestone[];
  members: MemberTasks[];
}

export interface FeedbackEntry {
  draft: string;
  submitted: string;
}

export type FeedbackMap = Record<string, FeedbackEntry>;

interface GroupTasksTabProps {
  /** Academic level number (e.g. 2, 3, 4) */
  levelNumber?: number;
}

/* ──────────────────────────────────────────────────────────────
   FeedbackPanel — inline expandable panel under a task row
   Allows mentor to compose, submit, and clear feedback in DB.
────────────────────────────────────────────────────────────── */
const FeedbackPanel: React.FC<{
  feedbackKey: string;
  taskId: number;
  entry: FeedbackEntry | undefined;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string, taskId: number) => void;
  onClear: (key: string, taskId: number) => void;
}> = ({ feedbackKey, taskId, entry, onDraftChange, onSubmit, onClear }) => {
  const draft = entry?.draft ?? '';
  const submitted = entry?.submitted ?? '';

  return (
    <div className="gt-feedback-panel">
      {/* Previously submitted feedback loaded from Database */}
      {submitted && (
        <div className="gt-feedback-submitted">
          <div className="gt-feedback-submitted-label">
            <MessageSquare size={11} />
            <span>Your Feedback</span>
          </div>
          <p className="gt-feedback-submitted-text">{submitted}</p>
          <button
            className="gt-feedback-clear-btn"
            onClick={() => onClear(feedbackKey, taskId)}
            title="Clear feedback"
          >
            <X size={11} /> Clear
          </button>
        </div>
      )}

      {/* Textarea + Send button */}
      <div className="gt-feedback-input-row">
        <textarea
          className="gt-feedback-textarea"
          placeholder="Write your mentor feedback for this task…"
          value={draft}
          rows={3}
          onChange={(e) => onDraftChange(feedbackKey, e.target.value)}
        />
        <button
          className={`gt-feedback-send-btn ${draft.trim() ? 'active' : ''}`}
          disabled={!draft.trim()}
          onClick={() => onSubmit(feedbackKey, taskId)}
          title="Send feedback"
        >
          <Send size={13} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   TaskItem — single task row with feedback toggle & details
────────────────────────────────────────────────────────────── */
const TaskItem: React.FC<{
  task: Task;
  type: 'completed' | 'ongoing' | 'yet';
  memberId: number;
  feedbackMap: FeedbackMap;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string, taskId: number) => void;
  onClear: (key: string, taskId: number) => void;
}> = ({ task, type, memberId, feedbackMap, onDraftChange, onSubmit, onClear }) => {
  const [open, setOpen] = useState(false);
  const key = `${memberId}-${task.task_id}`;
  const hasSubmitted = !!feedbackMap[key]?.submitted || !!task.mentor_feedback;

  /**
   * Format Task Timeline Range (Start/Created Date – Due Date)
   * Matches milestone timeline formatting, dynamically sourced from database.
   * Example: "Feb 17, 2026 – Feb 21, 2026"
   */
  const formatTaskTimeline = (startStr?: string, endStr?: string) => {
    if (!startStr && !endStr) return null;
    const format = (dStr?: string) => {
      if (!dStr) return '';
      try {
        return new Date(dStr).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return dStr;
      }
    };

    if (startStr && endStr) {
      return `${format(startStr)} – ${format(endStr)}`;
    }
    return format(startStr || endStr);
  };

  const taskTimeline = formatTaskTimeline(task.created_at, task.due_date);

  return (
    <div className={`gt-task-item-wrap ${open ? 'expanded' : ''}`}>
      {/* Task row */}
      <div className="gt-task-item gt-task-item--real">
        <div className={`gt-task-indicator ${type}`}></div>

        <div className="gt-task-main-content">
          <span className="gt-task-name">{task.task_name}</span>

          <div className="gt-task-meta-row">
            {task.milestone_title && (
              <span className="gt-task-milestone-tag" title={`Milestone: ${task.milestone_title}`}>
                <Tag size={10} />
                {task.milestone_title}
              </span>
            )}
            {taskTimeline && (
              <span className="gt-task-due-tag gt-task-timeline-tag" title={`Task Timeline: ${taskTimeline}`}>
                <Calendar size={10} />
                <span>Timeline: {taskTimeline}</span>
              </span>
            )}
          </div>

          {task.description && (
            <p className="gt-task-description" title={task.description}>
              {task.description}
            </p>
          )}
        </div>

        {/* Feedback toggle */}
        <button
          className={`gt-feedback-toggle ${hasSubmitted ? 'has-feedback' : ''}`}
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Hide feedback' : 'Give feedback'}
        >
          <MessageSquare size={12} />
          <span>{hasSubmitted ? 'Feedback' : 'Feedback'}</span>
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Expandable feedback panel */}
      {open && (
        <FeedbackPanel
          feedbackKey={key}
          taskId={task.task_id}
          entry={feedbackMap[key]}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onClear={onClear}
        />
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   TaskColumn — one status column (Completed / Ongoing / Yet)
────────────────────────────────────────────────────────────── */
const TaskColumn: React.FC<{
  label: string;
  type: 'completed' | 'ongoing' | 'yet';
  tasks: Task[];
  hasPendingData: boolean;
  memberId: number;
  feedbackMap: FeedbackMap;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string, taskId: number) => void;
  onClear: (key: string, taskId: number) => void;
}> = ({ label, type, tasks, hasPendingData, memberId, feedbackMap, onDraftChange, onSubmit, onClear }) => (
  <div className="gt-task-col">
    <div className={`gt-col-label ${type}`}>
      <span className="gt-col-label-text">{label}</span>
      {!hasPendingData && <span className="gt-col-count-chip">{tasks.length}</span>}
    </div>

    {hasPendingData ? (
      <>
        <div className="gt-task-item">
          <div className={`gt-task-indicator ${type}`}></div>
          <div className="gt-task-placeholder-bar"></div>
        </div>
        <div className="gt-task-item">
          <div className={`gt-task-indicator ${type}`}></div>
          <div className="gt-task-placeholder-bar"></div>
        </div>
      </>
    ) : tasks.length > 0 ? (
      tasks.map((task) => (
        <TaskItem
          key={task.task_id}
          task={task}
          type={type}
          memberId={memberId}
          feedbackMap={feedbackMap}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onClear={onClear}
        />
      ))
    ) : (
      <div className="gt-no-tasks-box">
        <span className="gt-no-tasks">No tasks</span>
      </div>
    )}
  </div>
);

/* ──────────────────────────────────────────────────────────────
   MemberCard — card representing one group member, their tasks,
   and their overall project contribution.
────────────────────────────────────────────────────────────── */
const MemberCard: React.FC<{
  member: MemberTasks;
  hasPendingData: boolean;
  feedbackMap: FeedbackMap;
  allGroupTasks: any[];
  totalGroupTasks: number;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string, taskId: number) => void;
  onClear: (key: string, taskId: number) => void;
}> = ({
  member,
  hasPendingData,
  feedbackMap,
  allGroupTasks,
  totalGroupTasks,
  onDraftChange,
  onSubmit,
  onClear,
}) => {
    // Milestone-scoped counts
    const total =
      member.tasks.completed.length +
      member.tasks.ongoing.length +
      member.tasks.yetToStart.length;

    const pct = total > 0
      ? Math.round((member.tasks.completed.length / total) * 100)
      : 0;

    // ── Overall Project Contribution Math ──
    // Calculate how many completed tasks this student has across ALL milestones in the project
    const overallCompletedCount = (allGroupTasks || []).filter((t: any) => {
      const isAssigned =
        Number(t.assigned_to) === Number(member.member_id) ||
        (t.assigned_to_name && t.assigned_to_name.trim().toLowerCase() === member.name.trim().toLowerCase());
      const isDone = String(t.status || '').toUpperCase().trim() === 'COMPLETED';
      return isAssigned && isDone;
    }).length;

    // Percentage of total project tasks completed by this student
    const projectContributionPct = totalGroupTasks > 0
      ? Math.round((overallCompletedCount / totalGroupTasks) * 100)
      : 0;

    const initials = member.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    const isLeader = member.role === 'Leader';

    return (
      <div className={`gt-member-card ${isLeader ? 'is-leader-card' : ''}`}>
        {/* Header: avatar + name + overall contribution & milestone progress */}
        <div className="gt-member-card-header">
          <div className={`gt-member-avatar ${isLeader ? 'leader-avatar' : ''}`}>
            {initials || '?'}
          </div>

          <div className="gt-member-name-block">
            <div className="gt-member-title-row">
              <p className="gt-member-name">{member.name || 'Member Name'}</p>
              <span className={`gt-role-badge ${isLeader ? 'leader' : 'member'}`}>
                {member.role}
              </span>
            </div>
            {member.universityId && (
              <p className="gt-member-subtitle">{member.universityId}</p>
            )}
          </div>

          {/* Dual Metric: Overall Project Contribution + Active Milestone Progress */}
          <div className="gt-member-progress-group">
            {/* Overall Project Contribution Pill */}
            {!hasPendingData && (
              <div
                className="gt-contribution-chip"
                title={`${member.name} completed ${overallCompletedCount} of ${totalGroupTasks} total project tasks (${projectContributionPct}% overall project contribution)`}
              >
                <div className="gt-contrib-left">
                  <TrendingUp size={12} className="gt-contrib-icon" />
                  <span className="gt-contrib-label">Project Contribution</span>
                </div>
                <div className="gt-contrib-right">
                  <span className="gt-contrib-badge">{projectContributionPct}%</span>
                  <span className="gt-contrib-sub">({overallCompletedCount}/{totalGroupTasks} tasks)</span>
                </div>
              </div>
            )}

            {/* Active Milestone Progress Bar */}
            <div className="gt-mini-progress-wrap">
              <div className="gt-mini-bar-track">
                <div className="gt-mini-bar-fill" style={{ width: `${pct}%` }}></div>
              </div>
              <span className="gt-mini-pct">{pct}% milestone ({member.tasks.completed.length}/{total})</span>
            </div>
          </div>
        </div>

        {/* Three task columns */}
        <div className="gt-task-columns">
          <TaskColumn
            label="Completed"
            type="completed"
            tasks={member.tasks.completed}
            hasPendingData={hasPendingData}
            memberId={member.member_id}
            feedbackMap={feedbackMap}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
            onClear={onClear}
          />
          <TaskColumn
            label="Ongoing"
            type="ongoing"
            tasks={member.tasks.ongoing}
            hasPendingData={hasPendingData}
            memberId={member.member_id}
            feedbackMap={feedbackMap}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
            onClear={onClear}
          />
          <TaskColumn
            label="Yet to Start"
            type="yet"
            tasks={member.tasks.yetToStart}
            hasPendingData={hasPendingData}
            memberId={member.member_id}
            feedbackMap={feedbackMap}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
            onClear={onClear}
          />
        </div>

        {/* Pending notice */}
        {hasPendingData && (
          <div className="gt-member-pending">
            <span className="gt-pending-dot"></span>
            <span className="gt-member-pending-text">
              Task data pending — feedback will be available once tasks are assigned.
            </span>
          </div>
        )}
      </div>
    );
  };

/* ──────────────────────────────────────────────────────────────
   Main GroupTasksTab Component
   Fetches group tasks and milestones directly from the database
   and updates mentor_feedback in real-time.
────────────────────────────────────────────────────────────── */
const GroupTasksTab: React.FC<GroupTasksTabProps> = ({ levelNumber = 2 }) => {
  const [groupData, setGroupData] = useState<GroupTasksData | null>(null);
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<FeedbackMap>({});

  const fetchTasksData = async () => {
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

      // 1. Fetch assigned groups for this mentor
      const mentorUrl = mentorId
        ? `http://localhost:5000/api/mentor/groups?mentorId=${mentorId}&level=${levelNumber}`
        : `http://localhost:5000/api/groups/level/${levelNumber}`;

      const groupRes = await fetch(mentorUrl, { headers });
      if (!groupRes.ok) throw new Error(`Groups request failed with status ${groupRes.status}`);

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
        setGroupData(null);
        setLoading(false);
        return;
      }

      // 2. Select target group
      const activeGroup = selectedGroupId
        ? groups.find((g) => (g.id || g.groupId) === selectedGroupId) || groups[0]
        : groups[0];

      const activeGroupId = activeGroup.id || activeGroup.groupId;
      if (!selectedGroupId && activeGroupId) {
        setSelectedGroupId(activeGroupId);
      }

      // 3. Fetch Milestones for this group from Database
      let milestonesList: Milestone[] = [];
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

      // 4. Fetch tasks for the group from Dedicated Mentor Endpoint (including mentor_feedback)
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

      // Default to milestone that has tasks if current selection is ALL/invalid
      const isCurrentMilestoneValid =
        selectedMilestoneId !== 'ALL' &&
        milestonesList.some((m) => Number(m.id) === Number(selectedMilestoneId));

      if (!isCurrentMilestoneValid || selectedMilestoneId === 'ALL') {
        const firstWithTasks = milestonesList.find((m) =>
          tasksList.some((t) => Number(t.milestone_id) === Number(m.id) || t.milestone_title === m.title)
        );
        if (firstWithTasks) {
          setSelectedMilestoneId(firstWithTasks.id);
        } else if (milestonesList.length > 0) {
          setSelectedMilestoneId(milestonesList[0].id);
        } else {
          setSelectedMilestoneId('ALL');
        }
      }

      // 5. Map group members
      const rawMembers: any[] = activeGroup.members || [];
      const memberList: MemberTasks[] = rawMembers.map((m: any) => {
        const memberId = m.id;
        const memberName = (m.name || 'Student').trim();
        const isLeader = Boolean(m.isLeader || Number(m.is_leader) === 1);

        return {
          member_id: memberId,
          name: memberName,
          role: isLeader ? 'Leader' : 'Member',
          universityId: m.universityId || m.university_id,
          email: m.email,
          tasks: {
            completed: [],
            ongoing: [],
            yetToStart: [],
          },
        };
      });

      // 6. Compute group statistics
      let totalTasks = tasksList.length;
      let completedCount = 0;
      let ongoingCount = 0;
      let yetToStartCount = 0;

      tasksList.forEach((t: any) => {
        const s = String(t.status || '').toUpperCase().trim();
        if (s === 'COMPLETED') completedCount++;
        else if (s === 'IN_PROGRESS' || s === 'ONGOING') ongoingCount++;
        else yetToStartCount++;
      });

      setGroupData({
        groupId: activeGroupId,
        groupName: activeGroup.groupName || activeGroup.projectName || `Group ${activeGroupId}`,
        totalTasks,
        completedCount,
        ongoingCount,
        yetToStartCount,
        allTasks: tasksList,
        milestones: milestonesList,
        members: memberList,
      });

      // 7. Restore feedback directly from Database rows (Single Source of Truth)
      const dbFeedbackMap: FeedbackMap = {};
      tasksList.forEach((t: any) => {
        const key = `${t.assigned_to}-${t.id}`;
        dbFeedbackMap[key] = {
          draft: '',
          submitted: t.mentor_feedback || '',
        };
      });

      setFeedbackMap(dbFeedbackMap);

    } catch (err: any) {
      console.error('Failed to load group tasks & milestones:', err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (newGroupId: number) => {
    setSelectedGroupId(newGroupId);
    setSelectedMilestoneId('ALL');
  };

  useEffect(() => {
    fetchTasksData();
  }, [levelNumber, selectedGroupId]);

  /* ── Filter tasks by selected milestone ───────────────────────── */
  const activeMilestone = useMemo(() => {
    if (selectedMilestoneId === 'ALL' || !groupData?.milestones) return null;
    return groupData.milestones.find((m) => Number(m.id) === Number(selectedMilestoneId)) || null;
  }, [selectedMilestoneId, groupData?.milestones]);

  const filteredTasksForActiveMilestone = useMemo(() => {
    if (!groupData?.allTasks) return [];
    if (selectedMilestoneId === 'ALL') return groupData.allTasks;

    return groupData.allTasks.filter((t: any) => {
      if (t.milestone_id && Number(t.milestone_id) === Number(selectedMilestoneId)) return true;
      if (activeMilestone && t.milestone_title && t.milestone_title.trim().toLowerCase() === activeMilestone.title.trim().toLowerCase()) return true;
      return false;
    });
  }, [groupData?.allTasks, selectedMilestoneId, activeMilestone]);

  // Compute members with tasks scoped to selected milestone
  const membersWithFilteredTasks: MemberTasks[] = useMemo(() => {
    if (!groupData?.members) return [];

    return groupData.members.map((member) => {
      const assignedTasks = filteredTasksForActiveMilestone.filter(
        (t: any) =>
          Number(t.assigned_to) === Number(member.member_id) ||
          (t.assigned_to_name && t.assigned_to_name.trim().toLowerCase() === member.name.trim().toLowerCase())
      );

      const completed: Task[] = [];
      const ongoing: Task[] = [];
      const yetToStart: Task[] = [];

      assignedTasks.forEach((t: any) => {
        const formattedTask: Task = {
          task_id: t.id,
          task_name: (t.task_name || 'Task').trim(),
          description: t.description || '',
          milestone_title: t.milestone_title || activeMilestone?.title || '',
          milestone_id: t.milestone_id,
          status: t.status || 'TODO',
          due_date: t.due_date,
          created_at: t.created_at,
          mentor_feedback: t.mentor_feedback || null,
        };

        const s = String(t.status || '').toUpperCase().trim();
        if (s === 'COMPLETED') {
          completed.push(formattedTask);
        } else if (s === 'IN_PROGRESS' || s === 'ONGOING') {
          ongoing.push(formattedTask);
        } else {
          yetToStart.push(formattedTask);
        }
      });

      return {
        ...member,
        tasks: {
          completed,
          ongoing,
          yetToStart,
        },
      };
    });
  }, [groupData?.members, filteredTasksForActiveMilestone, activeMilestone]);

  // Milestone task stats for active milestone
  const activeMilestoneStats = useMemo(() => {
    const total = filteredTasksForActiveMilestone.length;
    let completed = 0;
    let ongoing = 0;
    let yetToStart = 0;

    filteredTasksForActiveMilestone.forEach((t: any) => {
      const s = String(t.status || '').toUpperCase().trim();
      if (s === 'COMPLETED') completed++;
      else if (s === 'IN_PROGRESS' || s === 'ONGOING') ongoing++;
      else yetToStart++;
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, ongoing, yetToStart, pct };
  }, [filteredTasksForActiveMilestone]);

  /* ──────────────────────────────────────────────────────────────
     FEEDBACK HANDLERS
     Saves mentor feedback directly to MySQL/TiDB database table: `student_tasks`
     (column: `mentor_feedback`)
  ────────────────────────────────────────────────────────────── */
  const handleDraftChange = (key: string, value: string) => {
    setFeedbackMap((prev) => ({
      ...prev,
      [key]: { submitted: prev[key]?.submitted ?? '', draft: value },
    }));
  };

  /**
   * Save Mentor Feedback to Database:
   * Calls PUT /api/mentor/tasks/:taskId/feedback
   * Executes: UPDATE student_tasks SET mentor_feedback = ? WHERE id = ?
   */
  const handleSubmit = async (key: string, taskId: number) => {
    const draft = feedbackMap[key]?.draft?.trim();
    if (!draft) return;

    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const mentorId = user?.id || '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (mentorId) headers['x-user-id'] = String(mentorId);

      // ── API Call: Save to database ──
      const res = await fetch(`http://localhost:5000/api/mentor/tasks/${taskId}/feedback`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ feedback: draft }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      console.log(`✅ [Mentor Feedback] Successfully saved to database for task ${taskId}`);

      // Update feedback in local state
      setFeedbackMap((prev) => ({
        ...prev,
        [key]: { draft: '', submitted: draft },
      }));

      // Update allTasks array in groupData so UI stays fully in sync
      setGroupData((prev) => {
        if (!prev) return prev;
        const updatedAllTasks = prev.allTasks.map((t) =>
          Number(t.id) === Number(taskId) ? { ...t, mentor_feedback: draft } : t
        );
        return { ...prev, allTasks: updatedAllTasks };
      });

    } catch (apiErr) {
      console.error('❌ [Mentor Feedback] Failed to save feedback to database:', apiErr);
      alert('Could not save feedback to database. Please check your backend connection.');
    }
  };

  /**
   * Clear Mentor Feedback from Database:
   * Calls DELETE /api/mentor/tasks/:taskId/feedback
   * Executes: UPDATE student_tasks SET mentor_feedback = NULL WHERE id = ?
   */
  const handleClear = async (key: string, taskId: number) => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // ── API Call: Clear in database ──
      const res = await fetch(`http://localhost:5000/api/mentor/tasks/${taskId}/feedback`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      console.log(`✅ [Mentor Feedback] Successfully cleared feedback from database for task ${taskId}`);

      // Clear in local state
      setFeedbackMap((prev) => ({
        ...prev,
        [key]: { draft: '', submitted: '' },
      }));

      // Update allTasks array in groupData
      setGroupData((prev) => {
        if (!prev) return prev;
        const updatedAllTasks = prev.allTasks.map((t) =>
          Number(t.id) === Number(taskId) ? { ...t, mentor_feedback: null } : t
        );
        return { ...prev, allTasks: updatedAllTasks };
      });

    } catch (apiErr) {
      console.error('❌ [Mentor Feedback] Failed to clear feedback from database:', apiErr);
      alert('Could not clear feedback from database. Please check your backend connection.');
    }
  };

  const isPending = groupData === null || loading;

  const totalTasks = groupData?.totalTasks ?? 0;
  const completedCount = groupData?.completedCount ?? 0;
  const ongoingCount = groupData?.ongoingCount ?? 0;
  const yetToStartCount = groupData?.yetToStartCount ?? 0;

  const overallPct = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  const placeholderMembers: MemberTasks[] = [
    { member_id: 1, name: 'Leader', role: 'Leader', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 2, name: 'Member 2', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 3, name: 'Member 3', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 4, name: 'Member 4', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 5, name: 'Member 5', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
  ];

  const membersToRender = isPending ? placeholderMembers : membersWithFilteredTasks;

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
    <div className="group-tasks-content">
      {/* ── Top Group Selector Bar (if mentor has >1 group) ─────────── */}
      {assignedGroups.length > 1 && (
        <div className="gt-group-selector-bar">
          <div className="gt-group-selector-info">
            <div className="gt-group-selector-icon">
              <Users size={18} />
            </div>
            <div className="gt-group-selector-text">
              <span className="gt-selector-label">Assigned Project Groups</span>
              <span className="gt-selector-hint">Switch between your {assignedGroups.length} assigned groups in Level {levelNumber}</span>
            </div>
          </div>
          <div className="gt-group-select-wrapper">
            <label htmlFor="mentor-group-select" className="gt-select-prefix">Active Group:</label>
            <select
              id="mentor-group-select"
              className="gt-group-select"
              value={selectedGroupId || ''}
              onChange={(e) => handleGroupChange(Number(e.target.value))}
            >
              {assignedGroups.map((g) => {
                const gId = g.id || g.groupId;
                const gName = g.groupName || g.projectName || `Group ${gId}`;
                const leader = g.leader || g.leaderName || g.leader_name;
                return (
                  <option key={gId} value={gId}>
                    {gName} {leader ? `— (Leader: ${leader})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* ── Loading / Error Alerts ───────────────────────────── */}
      {loading ? (
        <div className="gt-loading-box">
          <div className="gt-spinner"></div>
          <span>Loading milestone tasks and member progress...</span>
        </div>
      ) : error ? (
        <div className="gt-error-box">
          <AlertCircle size={20} className="gt-error-icon" />
          <div className="gt-error-text">
            <p className="gt-error-title">Could not load group tasks</p>
            <p className="gt-error-desc">{error}</p>
          </div>
          <button className="btn-retry" onClick={fetchTasksData}>
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — OVERALL GROUP PROGRESS
      ════════════════════════════════════════════════════════ */}
      <div className="gt-overall-card">
        <div className="gt-overall-header">
          <div>
            <h4>Overall Group Progress</h4>
            {groupData?.groupName && (
              <span className="gt-group-name-sub">Project Group: {groupData.groupName}</span>
            )}
          </div>
          <span className="gt-overall-pct">{overallPct}%</span>
        </div>

        <div className="gt-progress-track">
          <div className="gt-progress-fill" style={{ width: `${overallPct}%` }}></div>
        </div>

        <div className="gt-stat-row">
          <div className="gt-stat-pill completed">
            <span className="gt-stat-dot completed"></span>
            {completedCount} Completed
          </div>
          <div className="gt-stat-pill ongoing">
            <span className="gt-stat-dot ongoing"></span>
            {ongoingCount} Ongoing
          </div>
          <div className="gt-stat-pill yet">
            <span className="gt-stat-dot yet"></span>
            {yetToStartCount} Yet to Start
          </div>
        </div>

        {isPending && (
          <div className="gt-overall-pending">
            <span className="gt-pending-dot"></span>
            <span className="gt-pending-text">
              Group task data pending — progress will update once tasks are assigned.
            </span>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — MILESTONE SELECTOR & SCOPED PROGRESS
      ════════════════════════════════════════════════════════ */}
      {groupData?.milestones && groupData.milestones.length > 0 && (
        <div className="gt-milestones-nav-section">
          <div className="gt-milestones-nav-header">
            <div className="gt-milestone-nav-title">
              <Target size={18} className="gt-target-icon" />
              <span>Project Milestones</span>
            </div>
          </div>

          {/* Horizontal Milestone Navigation Pills */}
          <div className="gt-milestone-tabs-row">
            {groupData.milestones.map((m) => {
              const mTasksCount = groupData.allTasks.filter(
                (t: any) =>
                  Number(t.milestone_id) === Number(m.id) ||
                  (t.milestone_title && t.milestone_title.trim().toLowerCase() === m.title.trim().toLowerCase())
              ).length;
              const isSelected = selectedMilestoneId === m.id;

              return (
                <button
                  key={m.id}
                  className={`gt-milestone-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedMilestoneId(m.id)}
                >
                  <Target size={13} />
                  <span className="gt-tab-title">{m.title}</span>
                  <span className={`gt-tab-badge ${mTasksCount > 0 ? 'has-tasks' : ''}`}>
                    {mTasksCount} {mTasksCount === 1 ? 'task' : 'tasks'}
                  </span>
                </button>
              );
            })}

            {/* All Milestones option */}
            <button
              className={`gt-milestone-tab-btn ${selectedMilestoneId === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedMilestoneId('ALL')}
            >
              <Layers size={13} />
              <span className="gt-tab-title">All Milestones</span>
              <span className="gt-tab-badge has-tasks">{groupData.allTasks.length} tasks</span>
            </button>
          </div>

          {/* Active Milestone Header Card */}
          {activeMilestone ? (
            <div className="gt-active-milestone-card">
              <div className="gt-milestone-card-top">
                <div className="gt-milestone-info-left">
                  <div className="gt-milestone-title-flex">
                    <span className="gt-milestone-icon-box">
                      <Target size={16} />
                    </span>
                    <h5 className="gt-milestone-title">{activeMilestone.title}</h5>
                    <span className={`gt-milestone-status-pill ${String(activeMilestone.status).toLowerCase()}`}>
                      {activeMilestone.status || 'PENDING'}
                    </span>
                  </div>

                  {activeMilestone.description && (
                    <p className="gt-milestone-desc">{activeMilestone.description}</p>
                  )}

                  {formatDateRange(activeMilestone.start_date, activeMilestone.due_date) && (
                    <div className="gt-milestone-date-chip">
                      <Calendar size={12} />
                      <span>Timeline: {formatDateRange(activeMilestone.start_date, activeMilestone.due_date)}</span>
                    </div>
                  )}
                </div>

                {/* Milestone mini progress box */}
                <div className="gt-milestone-progress-box">
                  <div className="gt-m-prog-top">
                    <span className="gt-m-prog-label">Milestone Completion</span>
                    <span className="gt-m-prog-pct">{activeMilestoneStats.pct}%</span>
                  </div>
                  <div className="gt-m-prog-track">
                    <div
                      className="gt-m-prog-fill"
                      style={{ width: `${activeMilestoneStats.pct}%` }}
                    ></div>
                  </div>
                  <span className="gt-m-prog-stat">
                    {activeMilestoneStats.completed} of {activeMilestoneStats.total} tasks completed
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="gt-active-milestone-card gt-all-milestones-summary">
              <div className="gt-milestone-info-left">
                <div className="gt-milestone-title-flex">
                  <span className="gt-milestone-icon-box">
                    <Layers size={16} />
                  </span>
                  <h5 className="gt-milestone-title">All Milestones Combined View</h5>
                </div>
                <p className="gt-milestone-desc">
                  Showing all {groupData.allTasks.length} tasks across {groupData.milestones.length} milestones for this group.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECTION 3 — PER-MEMBER TASK CARDS + CONTRIBUTION + FEEDBACK
      ════════════════════════════════════════════════════════ */}
      <div className="gt-members-section">
        <div className="gt-members-section-header">
          <div>
            <h4 className="gt-section-title">
              {activeMilestone
                ? `Member Tasks under "${activeMilestone.title}"`
                : 'Member Task Breakdown (All Milestones)'}
            </h4>
            <p className="gt-section-sub">
              {activeMilestone
                ? `Tasks assigned to each member for the ${activeMilestone.title} phase.`
                : 'Overview of all assigned tasks grouped by member.'}
            </p>
          </div>
        </div>

        {/* If active milestone has 0 tasks */}
        {activeMilestone && activeMilestoneStats.total === 0 && !loading ? (
          <div className="gt-empty-milestone-tasks">
            <Info size={18} className="gt-empty-icon" />
            <div className="gt-empty-text">
              <h6>No tasks created under "{activeMilestone.title}" yet</h6>
              <p>The student group leader has not added any tasks for this milestone phase yet.</p>
            </div>
          </div>
        ) : (
          membersToRender.map((member: MemberTasks) => (
            <MemberCard
              key={member.member_id}
              member={member}
              hasPendingData={isPending}
              feedbackMap={feedbackMap}
              allGroupTasks={groupData?.allTasks || []}
              totalGroupTasks={totalTasks}
              onDraftChange={handleDraftChange}
              onSubmit={handleSubmit}
              onClear={handleClear}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GroupTasksTab;