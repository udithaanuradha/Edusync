import React, { useState } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp, X } from 'lucide-react';
import './GroupTasksTab.css';


/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
interface Task {
  task_id: number;
  task_name: string;
}

interface MemberTasks {
  member_id: number;
  name: string;
  role: 'Leader' | 'Member';
  tasks: {
    completed: Task[];
    ongoing: Task[];
    yetToStart: Task[];
  };
}

interface GroupTasksData {
  totalTasks: number;
  completedCount: number;
  ongoingCount: number;
  yetToStartCount: number;
  members: MemberTasks[];
}

/**
 * feedbackMap key: `${member_id}-${task_id}`
 * Each entry holds draft text (currently typing) and
 * submitted text (last saved feedback).
 */
interface FeedbackEntry {
  draft: string;
  submitted: string;
}

type FeedbackMap = Record<string, FeedbackEntry>;

/* ──────────────────────────────────────────────────────────────
   FeedbackPanel — inline expandable panel under a task row
────────────────────────────────────────────────────────────── */
const FeedbackPanel: React.FC<{
  feedbackKey: string;
  entry: FeedbackEntry | undefined;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string) => void;
  onClear: (key: string) => void;
}> = ({ feedbackKey, entry, onDraftChange, onSubmit, onClear }) => {
  const draft     = entry?.draft     ?? '';
  const submitted = entry?.submitted ?? '';

  return (
    <div className="gt-feedback-panel">

      {/* Previously submitted feedback */}
      {submitted && (
        <div className="gt-feedback-submitted">
          <div className="gt-feedback-submitted-label">
            <MessageSquare size={11} />
            <span>Your feedback</span>
          </div>
          <p className="gt-feedback-submitted-text">{submitted}</p>
          <button
            className="gt-feedback-clear-btn"
            onClick={() => onClear(feedbackKey)}
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
          placeholder="Write your feedback for this task…"
          value={draft}
          rows={3}
          onChange={(e) => onDraftChange(feedbackKey, e.target.value)}
        />
        <button
          className={`gt-feedback-send-btn ${draft.trim() ? 'active' : ''}`}
          disabled={!draft.trim()}
          onClick={() => onSubmit(feedbackKey)}
          title="Submit feedback"
        >
          <Send size={13} />
          <span>Send</span>
        </button>
      </div>

    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   TaskItem — single task row with feedback toggle
────────────────────────────────────────────────────────────── */
const TaskItem: React.FC<{
  task: Task;
  type: 'completed' | 'ongoing' | 'yet';
  memberId: number;
  feedbackMap: FeedbackMap;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string) => void;
  onClear: (key: string) => void;
}> = ({ task, type, memberId, feedbackMap, onDraftChange, onSubmit, onClear }) => {
  const [open, setOpen] = useState(false);
  const key = `${memberId}-${task.task_id}`;
  const hasSubmitted = !!feedbackMap[key]?.submitted;

  return (
    <div className={`gt-task-item-wrap ${open ? 'expanded' : ''}`}>

      {/* Task row */}
      <div className="gt-task-item gt-task-item--real">
        <div className={`gt-task-indicator ${type}`}></div>
        <span className="gt-task-name">{task.task_name}</span>

        {/* Feedback toggle */}
        <button
          className={`gt-feedback-toggle ${hasSubmitted ? 'has-feedback' : ''}`}
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Hide feedback' : 'Give feedback'}
        >
          <MessageSquare size={12} />
          <span>{hasSubmitted ? 'Feedback given' : 'Feedback'}</span>
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Expandable feedback panel */}
      {open && (
        <FeedbackPanel
          feedbackKey={key}
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
  onSubmit: (key: string) => void;
  onClear: (key: string) => void;
}> = ({ label, type, tasks, hasPendingData, memberId, feedbackMap, onDraftChange, onSubmit, onClear }) => (
  <div className="gt-task-col">
    <div className={`gt-col-label ${type}`}>{label}</div>

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
      <span className="gt-no-tasks">None</span>
    )}
  </div>
);

/* ──────────────────────────────────────────────────────────────
   MemberCard
────────────────────────────────────────────────────────────── */
const MemberCard: React.FC<{
  member: MemberTasks;
  hasPendingData: boolean;
  feedbackMap: FeedbackMap;
  onDraftChange: (key: string, value: string) => void;
  onSubmit: (key: string) => void;
  onClear: (key: string) => void;
}> = ({ member, hasPendingData, feedbackMap, onDraftChange, onSubmit, onClear }) => {
  const total =
    member.tasks.completed.length +
    member.tasks.ongoing.length +
    member.tasks.yetToStart.length;

  const pct = total > 0
    ? Math.round((member.tasks.completed.length / total) * 100)
    : 0;

  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="gt-member-card">

      {/* Header: avatar + name + mini progress */}
      <div className="gt-member-card-header">
        <div className="gt-member-avatar">{initials || '?'}</div>

        <div className="gt-member-name-block">
          <p className="gt-member-name">{member.name || 'Member Name'}</p>
          <p className="gt-member-role">{member.role}</p>
        </div>

        <div className="gt-mini-progress-wrap">
          <div className="gt-mini-bar-track">
            <div className="gt-mini-bar-fill" style={{ width: `${pct}%` }}></div>
          </div>
          <span className="gt-mini-pct">{pct}% done</span>
        </div>
      </div>

      {/* Three task columns — each column passes feedback props down */}
      <div className="gt-task-columns">
        <TaskColumn
          label="Completed"   type="completed"
          tasks={member.tasks.completed}
          hasPendingData={hasPendingData}
          memberId={member.member_id}
          feedbackMap={feedbackMap}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onClear={onClear}
        />
        <TaskColumn
          label="Ongoing"     type="ongoing"
          tasks={member.tasks.ongoing}
          hasPendingData={hasPendingData}
          memberId={member.member_id}
          feedbackMap={feedbackMap}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onClear={onClear}
        />
        <TaskColumn
          label="Yet to Start" type="yet"
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
   Main GroupTasksTab
────────────────────────────────────────────────────────────── */
const GroupTasksTab: React.FC = () => {

  /**
   * groupData — null until backend is connected.
   * useState keeps the union type so TS doesn't narrow to `never`.
   */
  const [groupData] = useState<GroupTasksData | null>(null);

  /**
   * feedbackMap — mentor's feedback drafts and submissions.
   * Key: `${member_id}-${task_id}`
   *
   * FUTURE: hydrate from GET /api/mentor/task-feedback/:groupId on mount.
   * FUTURE: on handleSubmit, POST to /api/mentor/task-feedback.
   */
  const [feedbackMap, setFeedbackMap] = useState<FeedbackMap>({});

  const isPending = groupData === null;

  const totalTasks      = groupData?.totalTasks      ?? 0;
  const completedCount  = groupData?.completedCount  ?? 0;
  const ongoingCount    = groupData?.ongoingCount    ?? 0;
  const yetToStartCount = groupData?.yetToStartCount ?? 0;

  const overallPct = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  /* ── Feedback handlers ─────────────────────────────────────── */
  const handleDraftChange = (key: string, value: string) => {
    setFeedbackMap((prev) => ({
      ...prev,
      [key]: { submitted: prev[key]?.submitted ?? '', draft: value },
    }));
  };

  const handleSubmit = (key: string) => {
    const draft = feedbackMap[key]?.draft?.trim();
    if (!draft) return;
    /**
     * FUTURE — replace the setState below with:
     *   const [memberId, taskId] = key.split('-');
     *   await fetch('/api/mentor/task-feedback', {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify({
     *       task_id: Number(taskId),
     *       member_id: Number(memberId),
     *       feedback_text: draft,
     *     }),
     *   });
     */
    setFeedbackMap((prev) => ({
      ...prev,
      [key]: { draft: '', submitted: draft },
    }));
  };

  const handleClear = (key: string) => {
    setFeedbackMap((prev) => ({
      ...prev,
      [key]: { draft: '', submitted: '' },
    }));
  };

  /* Placeholder members while groupData is null */
  const placeholderMembers: MemberTasks[] = [
    { member_id: 1, name: 'Leader',   role: 'Leader', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 2, name: 'Member 2', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 3, name: 'Member 3', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
    { member_id: 4, name: 'Member 4', role: 'Member', tasks: { completed: [], ongoing: [], yetToStart: [] } },
  ];

  const membersToRender = isPending ? placeholderMembers : (groupData?.members ?? []);

  return (
    <div className="group-tasks-content">

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — OVERALL GROUP PROGRESS
      ════════════════════════════════════════════════════════ */}
      <div className="gt-overall-card">
        <div className="gt-overall-header">
          <h4>Overall Group Progress</h4>
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
          SECTION 2 — PER-MEMBER TASK CARDS + FEEDBACK
      ════════════════════════════════════════════════════════ */}
      <div className="gt-members-section">
        <div className="gt-members-section-header">
          <h4 className="gt-section-title">Member Task Breakdown</h4>
          <span className="gt-feedback-hint">
            <MessageSquare size={12} />
            Click any task to leave feedback
          </span>
        </div>

        {membersToRender.map((member: MemberTasks) => (
          <MemberCard
            key={member.member_id}
            member={member}
            hasPendingData={isPending}
            feedbackMap={feedbackMap}
            onDraftChange={handleDraftChange}
            onSubmit={handleSubmit}
            onClear={handleClear}
          />
        ))}
      </div>

    </div>
  );
};

export default GroupTasksTab;