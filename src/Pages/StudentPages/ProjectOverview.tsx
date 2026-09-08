import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, CheckCircle2, CalendarClock, Plus, Trash2 } from 'lucide-react';
import StatCard from '../../components/shared/ui/StatCard';
import GanttChart from './GanttChart';
import ScopeDivision from './ScopeDivision';
import './ProjectOverview.css';

type MilestoneStatus = 'PENDING' | 'REJECTED' | 'APPROVED';

type MilestoneItem = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: MilestoneStatus;
};

type Person = { id: number | string; name: string } | null;
type CurrentUser = { id: number | string; name: string } | null;

type ProjectOverviewProps = {
  groupId: number | null;
  userRole: 'leader' | 'member';
  currentUser: CurrentUser;
  supervisor: Person;
  mentor: Person;
  /** Called after a milestone is created/edited/deleted so the parent page
      can refresh its own milestoneOptions (used by the My Tasks tab). */
  onMilestonesChanged?: () => void;
  onNavigateSupervisorChat: () => void;
  onNavigateMentorChat: () => void;
  /** Total member count of the underlying group record — an Individual
      Project is a "group of one" that reuses this exact page, so Scope
      Division (nothing to divide between one person) only renders when
      there's more than one member. Undefined (still loading) defaults to
      showing it, same as today. */
  memberCount?: number;
};

const API_BASE = 'http://localhost:5000/api/milestones';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
    ...(user?.role ? { 'X-User-Role': String(user.role) } : {}),
  };
};

const formatShortDate = (value: string): string => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// YYYY-MM-DD, for an <input type="date">'s min/max/value. Built from the
// Date object's own LOCAL year/month/day — NOT toISOString(), which
// converts to UTC first and silently shifts the date backward by one day
// for anyone in a positive UTC-offset timezone (e.g. local midnight on the
// 8th becomes "the 7th" once re-expressed in UTC).
const toInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayInputValue = (): string => toInputValue(startOfToday());

const oneYearAfterInputValue = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return toInputValue(d);
};

// The project window's own cap is two years (not one, like a milestone's).
const twoYearsAfterInputValue = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setFullYear(d.getFullYear() + 2);
  return toInputValue(d);
};

// Combine two possibly-empty "YYYY-MM-DD" bounds — either side missing
// just falls back to whichever one is actually set.
const laterDate = (a: string, b: string): string => (a && b ? (a > b ? a : b) : a || b);
const earlierDate = (a: string, b: string): string => (a && b ? (a < b ? a : b) : a || b);

/**
 * Rebuilt from the old ProjectTimeline.tsx: instead of managing every
 * milestone as one bulk add-and-list form, this works on ONE "active"
 * milestone at a time (picked from the pill selector), matching the new
 * Project Overview design — Milestone Details scope to whichever milestone
 * is currently selected. Scope Division (below it) is project-wide instead
 * — one set of sections for the whole group, the same regardless of which
 * milestone is selected here (see ScopeDivision.tsx).
 */
const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  groupId,
  userRole,
  currentUser,
  supervisor,
  mentor,
  onMilestonesChanged,
  onNavigateSupervisorChat,
  onNavigateMentorChat,
  memberCount,
}) => {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  // null = the "+ New Milestone" draft slot, not "nothing selected"
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Tracks the current activeId synchronously for use inside loadMilestones
  // (which does async work before deciding whether to change the
  // selection) — reading state directly there would see a stale closure.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Remembers which milestone was last viewed for this group, per browser —
  // otherwise every refresh silently falls back to some guessed default,
  // which looks like "my scope/tasks disappeared" whenever the one you were
  // actually working in isn't that guess.
  const activeMilestoneStorageKey = groupId ? `po-active-milestone-${groupId}` : null;

  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The project's own overall window (project_overviews table) — set once
  // per group, independent of any single milestone. Any group member may
  // set/edit it, same as who can create a milestone. `workflowName` is
  // round-tripped as-is on every save (never edited here) so saving the
  // window never clobbers it — out of scope for this section.
  const [projectStartInput, setProjectStartInput] = useState('');
  const [projectEndInput, setProjectEndInput] = useState('');
  // The start date as last loaded/saved from the server — used the same
  // way activeMilestone.startDate is for the milestone form, so re-saving
  // an already-past start date left untouched isn't treated as "newly"
  // backdating it (see handleSaveProjectWindow).
  const [savedProjectStart, setSavedProjectStart] = useState('');
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const [projectWindowLoading, setProjectWindowLoading] = useState(true);
  const [projectWindowSaving, setProjectWindowSaving] = useState(false);
  const [projectWindowMessage, setProjectWindowMessage] = useState('');
  const [projectWindowError, setProjectWindowError] = useState(false);

  const loadProjectOverview = async () => {
    if (!groupId) {
      setProjectWindowLoading(false);
      return;
    }
    setProjectWindowLoading(true);
    try {
      const res = await fetch(`${API_BASE}/overview/group/${groupId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const start = data.data.start_date ? String(data.data.start_date).split('T')[0] : '';
        setProjectStartInput(start);
        setSavedProjectStart(start);
        setProjectEndInput(data.data.end_date ? String(data.data.end_date).split('T')[0] : '');
        setWorkflowName(data.data.workflow_name ?? null);
      } else {
        setProjectStartInput('');
        setSavedProjectStart('');
        setProjectEndInput('');
        setWorkflowName(null);
      }
    } catch (e) {
      // Fail open — no project window loaded just means milestones aren't
      // constrained by one yet, same as a group that never set one.
    } finally {
      setProjectWindowLoading(false);
    }
  };

  useEffect(() => {
    loadProjectOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleSaveProjectWindow = async (event: React.FormEvent) => {
    event.preventDefault();
    setProjectWindowMessage('');
    setProjectWindowError(false);

    if (projectStartInput && projectEndInput && new Date(projectStartInput) > new Date(projectEndInput)) {
      setProjectWindowError(true);
      setProjectWindowMessage('Start date cannot be later than end date.');
      return;
    }
    // Only when the start date is actually changing from what's already
    // saved — re-saving an already-past start date untouched isn't
    // blocked, but it can't be newly moved into the past.
    const projectStartChanged = projectStartInput !== savedProjectStart;
    if (projectStartChanged && projectStartInput && new Date(`${projectStartInput}T00:00:00`) < startOfToday()) {
      setProjectWindowError(true);
      setProjectWindowMessage('Start date cannot be before today.');
      return;
    }
    if (
      projectStartInput &&
      projectEndInput &&
      new Date(`${projectEndInput}T00:00:00`) > new Date(`${twoYearsAfterInputValue(projectStartInput)}T00:00:00`)
    ) {
      setProjectWindowError(true);
      setProjectWindowMessage("A project's end date can't be more than two years after its start date.");
      return;
    }
    if (!groupId) {
      setProjectWindowError(true);
      setProjectWindowMessage('Group not found. Please reload the page.');
      return;
    }

    setProjectWindowSaving(true);
    try {
      const res = await fetch(`${API_BASE}/overview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          group_id: groupId,
          start_date: projectStartInput || null,
          end_date: projectEndInput || null,
          workflow_name: workflowName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save project window.');
      setProjectWindowMessage('Project window saved.');
      setSavedProjectStart(projectStartInput);
    } catch (err: any) {
      setProjectWindowError(true);
      setProjectWindowMessage(err.message || 'Failed to save project window.');
    } finally {
      setProjectWindowSaving(false);
    }
  };

  const loadMilestones = async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE}/group/${groupId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) {
        setLoadError(data.error || 'Failed to load milestones.');
        return;
      }

      const mapped: MilestoneItem[] = (data.data || []).map((m: any) => ({
        id: String(m.id),
        title: m.title || '',
        description: m.description || '',
        startDate: m.start_date ? String(m.start_date).split('T')[0] : '',
        endDate: m.due_date ? String(m.due_date).split('T')[0] : '',
        status: (m.status || 'PENDING') as MilestoneStatus,
      }));
      setMilestones(mapped);

      // Keep the current selection if it's still valid — this call can be
      // triggered mid-session (e.g. right after creating a milestone), and
      // that shouldn't be overridden by the picking logic below.
      const currentActiveId = activeIdRef.current;
      if (currentActiveId && mapped.some((m) => m.id === currentActiveId)) {
        return;
      }

      if (mapped.length === 0) {
        setActiveId(null);
        return;
      }

      // No remembered selection for this browser yet — fall back to the
      // newest milestone. (Scope Division no longer belongs to a specific
      // milestone — see ScopeDivision.tsx — so there's no "which milestone
      // has your claimed work in it" signal to prefer here any more.)
      const stored = activeMilestoneStorageKey ? localStorage.getItem(activeMilestoneStorageKey) : null;
      if (stored && mapped.some((m) => m.id === stored)) {
        setActiveId(stored);
        return;
      }

      setActiveId(mapped[mapped.length - 1].id);
    } catch (e) {
      setLoadError('Server connection error while loading milestones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Persist every real (non-draft) selection so it survives a refresh.
  // Draft "+ New Milestone" mode (activeId === null) is left un-persisted —
  // a refresh there just falls back to whichever milestone was last saved.
  useEffect(() => {
    if (!activeMilestoneStorageKey || !activeId) return;
    localStorage.setItem(activeMilestoneStorageKey, activeId);
  }, [activeMilestoneStorageKey, activeId]);

  const activeMilestone = useMemo(
    () => milestones.find((m) => m.id === activeId) || null,
    [milestones, activeId],
  );

  // Sync the editable form fields whenever the selected milestone (or "new
  // milestone" draft mode) changes.
  useEffect(() => {
    if (activeMilestone) {
      setFormTitle(activeMilestone.title);
      setFormStart(activeMilestone.startDate);
      setFormEnd(activeMilestone.endDate);
    } else {
      setFormTitle('');
      setFormStart('');
      setFormEnd('');
    }
    setSaveMessage('');
    setSaveError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMilestone?.id]);

  const durationDays = useMemo(() => {
    if (!formStart || !formEnd) return 0;
    const start = new Date(`${formStart}T00:00:00`);
    const end = new Date(`${formEnd}T00:00:00`);
    const diff = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
    return diff >= 0 ? diff + 1 : 0;
  }, [formStart, formEnd]);

  // Whole-project duration, derived from the span of every milestone's own
  // dates (earliest start → latest end) rather than a separately-entered
  // project overview — one less thing to keep in sync by hand.
  const projectDurationWeeks = useMemo(() => {
    const starts = milestones.map((m) => m.startDate).filter(Boolean).map((d) => new Date(`${d}T00:00:00`).getTime());
    const ends = milestones.map((m) => m.endDate).filter(Boolean).map((d) => new Date(`${d}T00:00:00`).getTime());
    if (starts.length === 0 || ends.length === 0) return 0;
    const span = Math.max(...ends) - Math.min(...starts);
    return Math.max(0, Math.round(span / (MS_PER_DAY * 7)));
  }, [milestones]);

  const submittedCount = useMemo(
    () => milestones.filter((m) => m.status === 'PENDING').length,
    [milestones],
  );

  // Every stage (milestone) is plotted together as its own bar — a full
  // project timeline overview, not scoped to whichever one is currently
  // selected on the left. Whichever milestone is actively being edited uses
  // the live form fields instead of its last-saved values, so typing a new
  // date previews immediately without waiting for Save.
  const ganttTasks = useMemo(
    () =>
      milestones.map((m) => {
        const isActive = Boolean(activeMilestone) && m.id === activeMilestone!.id;
        return {
          id: m.id,
          name: (isActive ? formTitle : m.title) || 'Untitled milestone',
          startDate: isActive ? formStart : m.startDate,
          endDate: isActive ? formEnd : m.endDate,
        };
      }),
    [milestones, activeMilestone, formTitle, formStart, formEnd],
  );

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveMessage('');
    setSaveError(false);

    if (!formTitle.trim() || !formStart || !formEnd) {
      setSaveError(true);
      setSaveMessage('Please fill in the milestone name, start date, and end date.');
      return;
    }
    if (new Date(formStart) > new Date(formEnd)) {
      setSaveError(true);
      setSaveMessage('Start date cannot be later than end date.');
      return;
    }
    // Only applies when the start date is actually being changed — an edit
    // that leaves an already-past start date untouched (e.g. fixing just
    // the title) isn't blocked just because time has passed since it was
    // first set, but no save can newly set a start date in the past.
    const startDateChanged = !activeMilestone || formStart !== activeMilestone.startDate;
    if (startDateChanged && new Date(`${formStart}T00:00:00`) < startOfToday()) {
      setSaveError(true);
      setSaveMessage('Start date cannot be before today.');
      return;
    }
    if (new Date(`${formEnd}T00:00:00`) > new Date(`${oneYearAfterInputValue(formStart)}T00:00:00`)) {
      setSaveError(true);
      setSaveMessage("A milestone can't run for more than one year.");
      return;
    }
    // Only checked once the project has an actual window set (see the
    // Project Window section above) — a group that hasn't set one isn't
    // blocked here at all, same as the backend's own check.
    if (projectStartInput || projectEndInput) {
      const msStart = new Date(`${formStart}T00:00:00`);
      const msEnd = new Date(`${formEnd}T00:00:00`);
      const pStart = projectStartInput ? new Date(`${projectStartInput}T00:00:00`) : null;
      const pEnd = projectEndInput ? new Date(`${projectEndInput}T00:00:00`) : null;
      const outOfWindow =
        (pStart && msStart < pStart) ||
        (pEnd && msEnd > pEnd) ||
        (pEnd && msStart > pEnd) ||
        (pStart && msEnd < pStart);
      if (outOfWindow) {
        setSaveError(true);
        setSaveMessage(
          pStart && pEnd
            ? `Milestone dates must fall within the project's ${formatShortDate(projectStartInput)} – ${formatShortDate(projectEndInput)} window.`
            : "Milestone dates must fall within the project's own window."
        );
        return;
      }
    }
    if (!groupId) {
      setSaveError(true);
      setSaveMessage('Group not found. Please reload the page.');
      return;
    }

    setSaving(true);
    try {
      if (activeMilestone) {
        const res = await fetch(`${API_BASE}/${activeMilestone.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ title: formTitle.trim(), start_date: formStart, due_date: formEnd }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update milestone.');
        setSaveMessage('Milestone updated.');
      } else {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ group_id: groupId, title: formTitle.trim(), start_date: formStart, due_date: formEnd }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create milestone.');
        setSaveMessage('Milestone created.');
        setActiveId(String(data.data.id));
      }
      await loadMilestones();
      onMilestonesChanged?.();
    } catch (err: any) {
      setSaveError(true);
      setSaveMessage(err.message || 'Failed to save milestone.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeMilestone) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/${activeMilestone.id}`, { method: 'DELETE', headers: authHeaders() });
      setActiveId(null);
      await loadMilestones();
      onMilestonesChanged?.();
    } catch (e) {
      setSaveError(true);
      setSaveMessage('Failed to delete milestone.');
    } finally {
      setDeleting(false);
    }
  };

  // Creating a NEW milestone (activeMilestone === null) is open to any group
  // member — only editing fields on an EXISTING one is leader-only, matching
  // the backend split (createMilestone has no leader check; only
  // updateMilestoneDetails does).
  const canEditFields = !activeMilestone || userRole === 'leader';

  return (
    <div className="student-inner-tab-panel">
      <div className="pm-stat-strip">
        <StatCard title="Milestones Planned" value={milestones.length} icon={<Flag size={18} />} tone="primary" />
        <StatCard
          title="Submitted to Supervisor"
          value={submittedCount}
          icon={<CheckCircle2 size={18} />}
          tone="success"
        />
        <StatCard
          title="Project Duration"
          value={`${projectDurationWeeks} week${projectDurationWeeks === 1 ? '' : 's'}`}
          icon={<CalendarClock size={18} />}
          tone="warning"
        />
      </div>

      {loading ? (
        <div className="loading-container">Loading milestones...</div>
      ) : loadError ? (
        <div className="error-container">
          <p><strong>Error:</strong> {loadError}</p>
        </div>
      ) : (
        <>
          {/* The project's own overall window — set once per group,
              independent of any single milestone. Any group member may
              set/edit it. Shown first so its constraint on the milestone
              form below it (Start/End min/max) is visible before you ever
              try to save one. */}
          {/* noValidate: this form's date inputs use min/max attributes
              that legitimately go stale mid-edit (e.g. moving Start Date
              later than the currently-saved End Date briefly makes the End
              Date field invalid against its own min) — without this, the
              browser's native constraint validation silently blocks
              onSubmit from ever firing, with no visible error. Every one of
              these rules is already re-checked with a clear message in
              handleSaveProjectWindow, so nothing is actually left
              unvalidated by turning native validation off. */}
          <form className="timeline-section project-window-section" onSubmit={handleSaveProjectWindow} noValidate>
            <div className="milestone-details-head">
              <h4 className="section-title">Project Window</h4>
            </div>
            <p className="scope-division-desc">
              The overall start and end date your coordinator has given this project. Once set,
              every milestone below must fall within it.
            </p>
            <div className="timeline-form-grid">
              <div className="timeline-form-group">
                <label htmlFor="project-start">Project Start Date</label>
                <input
                  id="project-start"
                  type="date"
                  className="timeline-form-input"
                  value={projectStartInput}
                  onChange={(e) => setProjectStartInput(e.target.value)}
                  disabled={projectWindowLoading}
                  // Doesn't reject an already-past value left untouched —
                  // only a newly-picked past date is rejected, at submit
                  // time (see handleSaveProjectWindow's projectStartChanged
                  // check).
                  min={todayInputValue()}
                />
              </div>
              <div className="timeline-form-group">
                <label htmlFor="project-end">Project End Date</label>
                <input
                  id="project-end"
                  type="date"
                  className="timeline-form-input"
                  value={projectEndInput}
                  onChange={(e) => setProjectEndInput(e.target.value)}
                  disabled={projectWindowLoading}
                  min={projectStartInput || undefined}
                  max={projectStartInput ? twoYearsAfterInputValue(projectStartInput) : undefined}
                />
              </div>
            </div>
            {projectWindowMessage && (
              <div className={`timeline-submit-message ${projectWindowError ? 'error' : 'success'}`}>
                {projectWindowMessage}
              </div>
            )}
            <div className="timeline-form-footer">
              <button type="submit" className="submit-btn" disabled={projectWindowSaving || projectWindowLoading}>
                {projectWindowSaving ? 'Saving...' : 'Save Project Window'}
              </button>
            </div>
          </form>

          {/* Stacked, in order: milestone add/select, then the schedule
              preview, then scope division. The Gantt chart renders
              regardless of whether any milestone exists yet — it has its
              own built-in "add a milestone to see it plotted here"
              placeholder. */}
          <div className="milestone-selector-row">
            {milestones.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`milestone-pill ${activeId === m.id ? 'active' : ''}`}
                onClick={() => setActiveId(m.id)}
              >
                {m.title || 'Untitled milestone'}
              </button>
            ))}
            {/* Creating a milestone is open to any group member, not just
                the leader — matches createMilestone having no leader check. */}
            <button
              type="button"
              className={`milestone-pill milestone-pill-new ${activeId === null ? 'active' : ''}`}
              onClick={() => setActiveId(null)}
            >
              <Plus size={14} /> New Milestone
            </button>
          </div>

          {/* noValidate — same reason as the Project Window form above:
              this form's min/max attributes (tightened further by the
              project window) can go stale mid-edit and silently block
              native submission; handleSave already re-checks every rule
              itself with a clear message. */}
          <form className="timeline-section" onSubmit={handleSave} noValidate>
            <div className="milestone-details-head">
              <h4 className="section-title">Milestone Details</h4>
              {activeMilestone && userRole === 'leader' && (
                <button
                  type="button"
                  className="danger-btn milestone-delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>

            <div className="timeline-form-grid">
              <div className="timeline-form-group timeline-form-full">
                <label htmlFor="milestone-name">Milestone / Workflow Name</label>
                <input
                  id="milestone-name"
                  type="text"
                  className="timeline-form-input"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  readOnly={!canEditFields}
                  placeholder="e.g. Requirements Gathering"
                />
              </div>

              <div className="timeline-form-group">
                <label htmlFor="milestone-start">Start Date</label>
                <input
                  id="milestone-start"
                  type="date"
                  className="timeline-form-input"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  disabled={!canEditFields}
                  // Applies whether creating or editing — the picker won't
                  // offer a new past date, but this doesn't reject the
                  // field's own already-past value if the milestone's
                  // original start date isn't being touched (see
                  // handleSave's startDateChanged check). Tightened further
                  // by the project's own window once one is set, above.
                  min={laterDate(todayInputValue(), projectStartInput)}
                  max={projectEndInput || undefined}
                />
              </div>

              <div className="timeline-form-group">
                <label htmlFor="milestone-end">End Date</label>
                <input
                  id="milestone-end"
                  type="date"
                  className="timeline-form-input"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  disabled={!canEditFields}
                  // Whichever is tighter: the one-year cap from the
                  // milestone's own start, or the project's own end date
                  // once one is set.
                  max={formStart ? earlierDate(oneYearAfterInputValue(formStart), projectEndInput) : (projectEndInput || undefined)}
                />
              </div>
            </div>

            {formStart && formEnd && (
              <div className="timeline-summary">
                📌 This milestone runs for <strong>{durationDays} {durationDays === 1 ? 'day' : 'days'}</strong>
                {' — '}
                {formatShortDate(formStart)} to {formatShortDate(formEnd)}.
              </div>
            )}

            {saveMessage && (
              <div className={`timeline-submit-message ${saveError ? 'error' : 'success'}`}>{saveMessage}</div>
            )}

            {canEditFields && (
              <div className="timeline-form-footer">
                <button type="submit" className="submit-btn" disabled={saving}>
                  {saving ? 'Saving...' : activeMilestone ? 'Save Changes' : 'Create Milestone'}
                </button>
              </div>
            )}

            {!canEditFields && (
              <p className="role-warning">Only the group leader can edit an existing milestone's details.</p>
            )}
          </form>

          <GanttChart tasks={ganttTasks} timelineStart={formStart} timelineEnd={formEnd} />

          {memberCount !== 1 && (
            // Project-wide now, not tied to activeMilestone — renders the
            // same regardless of which milestone is selected above.
            <ScopeDivision
              groupId={groupId}
              currentUser={currentUser}
              supervisor={supervisor}
              mentor={mentor}
              onNavigateSupervisorChat={onNavigateSupervisorChat}
              onNavigateMentorChat={onNavigateMentorChat}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProjectOverview;
