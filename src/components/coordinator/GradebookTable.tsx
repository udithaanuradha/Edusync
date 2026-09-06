import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Clock3, Edit2, MessageSquare, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DataTable, { type DataTableColumn } from '../shared/ui/DataTable';
import type { UserV2 } from '../../types/chatV2';
import './GradebookTable.css';

type SubmissionStatus = 'all' | 'on_time' | 'late' | 'not_submitted';

interface GroupMark {
  group_id: number;
  group_name: string;
  stage_id: number;
  stage_name: string;
  mark: number | null;
  evaluator_name: string;
  submission_date: string | null;
  mark_type: string;
  deadline?: string | null;
  current_status?: string | null;
  submitted_at?: string | null;
  student_name?: string;
  file_paths?: string[];
  leader_id?: number | null;
  leader_name?: string | null;
  leader_email?: string | null;
}

interface ActiveGroup {
  group_id: number;
  group_name: string;
  leader_id: number | null;
  leader_name: string | null;
  leader_email: string | null;
}

interface GradebookTableProps {
  levelNumber: number;
}

const GradebookTable: React.FC<GradebookTableProps> = ({ levelNumber }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [marks, setMarks] = useState<GroupMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus>('all');
  const [stages, setStages] = useState<Array<{ stage_id: number; stage_name: string }>>([]);
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>([]);

  const parseFileLinks = (rawValue: unknown): string[] => {
    if (Array.isArray(rawValue)) {
      return rawValue.map((entry) => String(entry)).filter(Boolean);
    }

    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry)).filter(Boolean);
        }
      } catch {
        return rawValue
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  const normalizeStatus = (mark: GroupMark): Exclude<SubmissionStatus, 'all'> => {
    const explicitStatus = String(mark.current_status ?? '').trim().toLowerCase();

    if (explicitStatus === 'not_submitted' || explicitStatus === 'missing' || explicitStatus === 'pending') {
      return 'not_submitted';
    }

    if (explicitStatus === 'late') return 'late';
    if (explicitStatus === 'on time' || explicitStatus === 'ontime' || explicitStatus === 'submitted' || explicitStatus === 'on_time') {
      return 'on_time';
    }

    if (!mark.submission_date && !mark.submitted_at) {
      return 'on_time';
    }

    const submittedAtValue = mark.submission_date || mark.submitted_at;
    if (!submittedAtValue || !mark.deadline) {
      return 'on_time';
    }

    const submittedAt = new Date(submittedAtValue).getTime();
    const deadline = new Date(mark.deadline).getTime();

    if (Number.isNaN(submittedAt) || Number.isNaN(deadline)) {
      return 'on_time';
    }

    return submittedAt > deadline ? 'late' : 'on_time';
  };

  const normalizeMark = (item: Record<string, unknown>): GroupMark => ({
    group_id: Number(item.group_id ?? item.groupId ?? 0),
    group_name: String(item.group_name ?? item.groupName ?? 'Unnamed Group'),
    stage_id: Number(item.stage_id ?? item.stageId ?? 0),
    stage_name: String(item.stage_name ?? item.stageName ?? 'Untitled Stage'),
    mark: item.mark === null || item.mark === undefined ? null : Number(item.mark),
    evaluator_name: String(item.evaluator_name ?? item.evaluatorName ?? ''),
    submission_date:
      item.submission_date !== undefined && item.submission_date !== null
        ? String(item.submission_date)
        : item.submitted_at !== undefined && item.submitted_at !== null
          ? String(item.submitted_at)
          : item.submittedAt !== undefined && item.submittedAt !== null
            ? String(item.submittedAt)
            : null,
    mark_type: String(item.mark_type ?? item.markType ?? 'evaluation'),
    deadline:
      item.deadline !== undefined && item.deadline !== null
        ? String(item.deadline)
        : item.stage_deadline !== undefined && item.stage_deadline !== null
          ? String(item.stage_deadline)
          : item.stageDeadline !== undefined && item.stageDeadline !== null
            ? String(item.stageDeadline)
            : null,
    current_status:
      item.current_status !== undefined && item.current_status !== null
        ? String(item.current_status)
        : item.currentStatus !== undefined && item.currentStatus !== null
          ? String(item.currentStatus)
          : item.submission_status !== undefined && item.submission_status !== null
            ? String(item.submission_status)
            : item.status !== undefined && item.status !== null
              ? String(item.status)
              : null,
    submitted_at:
      item.submitted_at !== undefined && item.submitted_at !== null
        ? String(item.submitted_at)
        : item.submittedAt !== undefined && item.submittedAt !== null
          ? String(item.submittedAt)
          : null,
    student_name: item.student_name !== undefined && item.student_name !== null ? String(item.student_name) : undefined,
    file_paths: parseFileLinks(item.file_paths ?? item.filePaths ?? item.files ?? []),
  });

  // Fetch marks from backend
  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);

        // coordinatorId lets the backend scope this to just this
        // coordinator's own department (resolved server-side from their own
        // account) — without it, every department's submissions at this
        // level would come back.
        const response = await fetch(
          `http://localhost:5000/api/submissions/level/${levelNumber}?coordinatorId=${user?.id ?? ''}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to fetch submissions');
        }

        const data = await response.json();
        const rawMarks = data?.success && Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

        const marksList = rawMarks.map((item: Record<string, unknown>) => normalizeMark(item));
        setMarks(marksList);

        // Extract unique stages
        const uniqueStages: { stage_id: number; stage_name: string }[] = Array.from(
          new Map<number, { stage_id: number; stage_name: string }>(
            marksList.map((m: GroupMark) => [
              m.stage_id,
              { stage_id: m.stage_id, stage_name: m.stage_name },
            ] as [number, { stage_id: number; stage_name: string }])
          ).values()
        );
        setStages(uniqueStages);

        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load marks';
        setError(message);
        setMarks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [levelNumber, user?.id]);

  // Fetch the coordinator's active groups for this level separately from
  // submissions — the submissions endpoint only ever returns rows for
  // groups that already have a submission/evaluation record, so a group
  // that hasn't uploaded anything for a stage never appears there. This
  // list is what lets the "Not Submitted" tab work out which groups are
  // missing, by diffing it against the submission records above.
  useEffect(() => {
    const fetchActiveGroups = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/groups/coordinator/${user?.id}/${levelNumber}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          setActiveGroups([]);
          return;
        }

        const payload = await response.json();
        const list: Record<string, unknown>[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.groups)
              ? payload.groups
              : [];

        const normalized = list
          .map((g) => {
            // The group record doesn't carry a dedicated leader id field —
            // the leader is whichever member has the is_leader flag set,
            // same convention used across the supervisor/mentor group views.
            const membersRaw = Array.isArray(g.members) ? (g.members as Record<string, unknown>[]) : [];
            const leaderMember = membersRaw.find(
              (m) => Number(m.is_leader) === 1 || m.is_leader === true || m.isLeader === true
            );
            const rawLeaderId = leaderMember?.id ?? g.leader_id ?? g.leaderId ?? null;
            const leaderId = rawLeaderId !== null ? Number(rawLeaderId) : null;
            const leaderName =
              (leaderMember?.name as string | undefined) ??
              (leaderMember?.student_name as string | undefined) ??
              (g.leader_name as string | undefined) ??
              (g.leaderName as string | undefined) ??
              null;
            const leaderEmail =
              (leaderMember?.email as string | undefined) ??
              (g.leader_email as string | undefined) ??
              null;

            return {
              group_id: Number(g.group_id ?? g.id ?? g.groupId ?? g.groupID ?? 0),
              group_name: String(g.group_name ?? g.groupName ?? g.name ?? 'Unnamed Group'),
              leader_id: leaderId !== null && Number.isFinite(leaderId) ? leaderId : null,
              leader_name: leaderName,
              leader_email: leaderEmail,
            };
          })
          .filter((g) => g.group_id > 0);

        setActiveGroups(normalized);
      } catch {
        // Not fatal — the "Not Submitted" tab just has nothing to compare
        // against, so it renders empty instead of breaking the page.
        setActiveGroups([]);
      }
    };

    fetchActiveGroups();
  }, [levelNumber, user?.id]);

  const handleEditStart = (mark: GroupMark) => {
    setEditingId(`${mark.group_id}-${mark.stage_id}`);
    setEditValue(mark.mark);
  };

  const handleSaveMark = async (mark: GroupMark) => {
    if (editValue === null) {
      setEditingId(null);
      return;
    }

    if (editValue < 0 || editValue > 100) {
      alert('Mark must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('http://localhost:5000/api/marks/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          group_id: mark.group_id,
          stage_id: mark.stage_id,
          mark: editValue,
          mark_type: mark.mark_type,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save mark: ${response.statusText}`);
      }

      // Update local state
      setMarks(
        marks.map((m) =>
          m.group_id === mark.group_id && m.stage_id === mark.stage_id
            ? { ...m, mark: editValue, submission_date: new Date().toISOString() }
            : m
        )
      );

      setEditingId(null);
      setEditValue(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save mark';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(null);
  };

  const isDeadlinePassed = (deadline?: string | null) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) return false;
    return deadlineDate < new Date();
  };

  // Hands off to the real-time Chat/Communication system (ChatWindowV2, at
  // /dashboard/communication): navigating there with this router state lets
  // it auto-select (or start) a 1:1 conversation with the group leader and
  // pre-fill the message box, the same "navigate with state" convention
  // already used to auto-open things elsewhere (e.g. SupervisorTaskScheduler's
  // openTimelineScheduler flag).
  const handleSendWarning = (mark: GroupMark) => {
    if (!mark.leader_id || !mark.leader_name) {
      alert('No group leader is on record for this group, so a warning message cannot be sent yet.');
      return;
    }

    const leaderContact: UserV2 = {
      id: mark.leader_id,
      name: mark.leader_name,
      email: mark.leader_email ?? '',
      role: 'group_leader',
    };

    const deadlineText = formatDateTime(mark.deadline);
    const prefillMessage =
      `Hi ${mark.leader_name}, this is a reminder that ${mark.group_name}'s submission for ` +
      `"${mark.stage_name}" was due on ${deadlineText} and hasn't been received yet. ` +
      `Please submit as soon as possible, or reach out if you're facing any issues.`;

    navigate('/dashboard/communication', {
      state: { startConversationWith: leaderContact, prefillMessage },
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const selectedStageMarks = useMemo(
    () => (filterStage === 'all' ? marks : marks.filter((m) => m.stage_id === Number(filterStage))),
    [filterStage, marks]
  );

  const submissionStats = useMemo(() => {
    const totals = selectedStageMarks.reduce(
      (acc, mark) => {
        const status = normalizeStatus(mark);
        acc.total += 1;
        if (status === 'late') acc.late += 1;
        else acc.on_time += 1;
        return acc;
      },
      { total: 0, on_time: 0, late: 0 }
    );

    const submitted = totals.on_time + totals.late;
    const progress = totals.total > 0 ? Math.round((submitted / totals.total) * 100) : 0;

    return {
      ...totals,
      submitted,
      progress,
    };
  }, [selectedStageMarks]);

  // Groups that are active for this level but have no submission/evaluation
  // record for the stage(s) currently in scope. When "All Stages" is
  // selected this is computed per stage so each missing group still lands
  // under the right stage section below; a single stage just narrows that
  // down to one. A group's own stage-level deadline (from any real
  // submission row for that stage) is reused so the row can still show a
  // due date even though nothing was uploaded.
  const notSubmittedMarks = useMemo<GroupMark[]>(() => {
    if (activeGroups.length === 0) return [];

    const stagesInScope =
      filterStage === 'all' ? stages : stages.filter((s) => s.stage_id === Number(filterStage));

    const entries: GroupMark[] = [];

    stagesInScope.forEach((stage) => {
      const submittedGroupIds = new Set(
        marks.filter((m) => m.stage_id === stage.stage_id).map((m) => m.group_id)
      );
      const stageDeadline =
        marks.find((m) => m.stage_id === stage.stage_id && m.deadline)?.deadline ?? null;

      activeGroups.forEach((group) => {
        if (submittedGroupIds.has(group.group_id)) return;

        entries.push({
          group_id: group.group_id,
          group_name: group.group_name,
          stage_id: stage.stage_id,
          stage_name: stage.stage_name,
          mark: null,
          evaluator_name: '',
          submission_date: null,
          mark_type: 'evaluation',
          deadline: stageDeadline,
          current_status: 'not_submitted',
          submitted_at: null,
          student_name: undefined,
          file_paths: [],
          leader_id: group.leader_id,
          leader_name: group.leader_name,
          leader_email: group.leader_email,
        });
      });
    });

    return entries;
  }, [activeGroups, stages, marks, filterStage]);

  // The progress summary's denominator must be every group assigned to the
  // stage(s) in scope, not just the ones that already have a submission
  // row — submissionStats.total only ever counted real rows, so a stage
  // with 1 real submission and 4 groups that hadn't submitted yet
  // misreported "1/1 Groups Submitted, 100% complete" instead of the
  // correct "1/5, 20%".
  const totalGroupsInScope = submissionStats.submitted + notSubmittedMarks.length;
  const completionPercent =
    totalGroupsInScope > 0 ? Math.round((submissionStats.submitted / totalGroupsInScope) * 100) : 0;

  const statusTabs: Array<{ key: SubmissionStatus; label: string; count: number }> = [
    { key: 'all', label: 'All Submissions', count: submissionStats.total },
    { key: 'on_time', label: 'On Time', count: submissionStats.on_time },
    { key: 'late', label: 'Late Submissions', count: submissionStats.late },
    { key: 'not_submitted', label: 'Not Submitted', count: notSubmittedMarks.length },
  ];

  const filteredMarks =
    filterStatus === 'all'
      ? selectedStageMarks
      : filterStatus === 'not_submitted'
        ? notSubmittedMarks
        : selectedStageMarks.filter((mark) => normalizeStatus(mark) === filterStatus);

  // Group marks by normalized stage name so we render one table per stage
  const groupedByStageName: Record<string, { stage_id: number; stage_name: string; marks: GroupMark[] }> = {};
  filteredMarks.forEach((mark) => {
    const rawName = String(mark.stage_name ?? `Stage ${mark.stage_id}`);
    const key = rawName.trim().toLowerCase();
    if (!groupedByStageName[key]) {
      groupedByStageName[key] = { stage_id: mark.stage_id, stage_name: rawName.trim(), marks: [] };
    }
    groupedByStageName[key].marks.push(mark);
  });

  const renderMarkCell = (mark: GroupMark) => {
    const editKey = `${mark.group_id}-${mark.stage_id}`;
    const isEditing = editingId === editKey;

    if (isEditing) {
      return (
        <div className="mark-edit-cell">
          <input
            type="number"
            min="0"
            max="100"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value ? parseInt(e.target.value) : null)}
            className="mark-edit-input"
          />
          <button
            className="mark-btn-save"
            onClick={() => handleSaveMark(mark)}
            disabled={saving}
          >
            <Save size={16} />
          </button>
          <button className="mark-btn-cancel" onClick={handleCancel} disabled={saving}>
            <X size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="mark-display-cell">
        <span className="mark-value">{mark.mark ?? '-'}</span>
        <button
          className="mark-btn-edit"
          onClick={() => handleEditStart(mark)}
          title="Edit mark"
        >
          <Edit2 size={14} />
        </button>
      </div>
    );
  };

  const getFileLabel = (url: string) => {
    try {
      const decoded = decodeURIComponent(url.split('?')[0]);
      let filename = decoded.split('/').pop() || 'Submission File';
      if (/^\d{10,}-/.test(filename)) {
        filename = filename.replace(/^\d{10,}-/, '');
      }
      return filename;
    } catch {
      return 'Submission File';
    }
  };

  const submissionColumns: DataTableColumn<GroupMark>[] = [
    { key: 'group', header: 'Group', render: (mark) => mark.group_name },
    { key: 'submittedBy', header: 'Submitted By', render: (mark) => mark.student_name || mark.group_name },
    {
      key: 'submissionDate',
      header: 'Submission Date',
      render: (mark) => formatDateTime(mark.submission_date || mark.submitted_at),
    },
    { key: 'deadline', header: 'Deadline', render: (mark) => formatDateTime(mark.deadline) },
    {
      key: 'fileName',
      header: 'File Name',
      render: (mark) => {
        const fileList = mark.file_paths ?? [];
        return fileList.length > 0 ? <span>{fileList.map((f) => getFileLabel(f)).join(', ')}</span> : <span>—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (mark) => {
        const status = normalizeStatus(mark);
        if (status === 'not_submitted') {
          return (
            <span className="status-badge missing">
              <Clock3 size={14} /> Not Submitted
            </span>
          );
        }
        return status === 'late' ? (
          <span className="status-badge late">
            <AlertTriangle size={14} /> Late Submission
          </span>
        ) : (
          <span className="status-badge submitted">
            <Check size={14} /> On Time
          </span>
        );
      },
    },
    {
      key: 'download',
      header: 'Download',
      render: (mark) => {
        if (normalizeStatus(mark) === 'not_submitted') {
          if (!isDeadlinePassed(mark.deadline)) {
            return <span>—</span>;
          }

          return (
            <button
              type="button"
              className="warning-btn-ghost"
              onClick={() => handleSendWarning(mark)}
              title="Send a late-submission warning to the group leader"
            >
              <MessageSquare size={13} />
              Send Warning
            </button>
          );
        }

        const primaryFile = (mark.file_paths ?? [])[0] ?? '';
        return primaryFile ? (
          <a
            href={getFileUrl(primaryFile)}
            target="_blank"
            rel="noreferrer"
            className="status-badge submitted"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            Download
          </a>
        ) : (
          <span>—</span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="gradebook-loading">
        <div className="spinner" />
        <p>Loading marks...</p>
      </div>
    );
  }

  return (
    <div className="gradebook-container">
      <div className="gradebook-header">
        <div>
          <p className="gradebook-kicker">Submission Tracking View</p>
          <h3>Submissions</h3>
          <p>Track submitted, pending, and late group work for Level {levelNumber} stages.</p>
        </div>
        <div className="gradebook-filters">
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="filter-select">
            <option value="all">All Stages</option>
            {stages.map((stage) => (
              <option key={stage.stage_id} value={stage.stage_id}>
                {stage.stage_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="submission-tracker-panel">
        <div className="submission-tracker-summary">
          <div>
            <div className="submission-tracker-meta">
              <span className="submission-tracker-count">
                {submissionStats.submitted}/{totalGroupsInScope} Groups Submitted
              </span>
              <span className="submission-tracker-percent">{completionPercent}% complete</span>
            </div>
            <div className="submission-progress-bar" aria-label="Submission progress">
              <div
                className="submission-progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <p className="submission-tracker-hint">
            Use the status tabs to isolate submitted, pending, or late groups instantly.
          </p>
        </div>

        <div className="submission-status-tabs" role="tablist" aria-label="Submission status filters">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={filterStatus === tab.key}
              className={`submission-status-tab ${filterStatus === tab.key ? 'active' : ''}`}
              onClick={() => setFilterStatus(tab.key)}
            >
              <span>{tab.label}</span>
              <strong>{tab.count}</strong>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="gradebook-error">
          <p>{error}</p>
        </div>
      )}

      {filteredMarks.length === 0 ? (
        <div className="gradebook-empty">
          <p>No submissions found for the selected filter.</p>
        </div>
      ) : (
        <div className="gradebook-wrapper">
          {Object.values(groupedByStageName).map((group) => {
            const stageId = group.stage_id;
            const stageMark = group.marks;
            const stageName = group.stage_name || `Stage ${stageId}`;

            return (
              <div key={stageName} className="stage-section">
                <h4 className="stage-title">{stageName}</h4>
                <DataTable
                  columns={submissionColumns}
                  rows={stageMark}
                  rowKey={(mark, idx) => `${mark.group_id}-${mark.stage_id}-${idx}`}
                  emptyMessage="No submissions for this stage."
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradebookTable;
