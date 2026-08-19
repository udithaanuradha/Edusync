import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Clock3, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './GradebookTable.css';

type SubmissionStatus = 'all' | 'submitted' | 'pending' | 'late';

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
}

interface GradebookTableProps {
  levelNumber: number;
}

const GradebookTable: React.FC<GradebookTableProps> = ({ levelNumber }) => {
  const { user } = useAuth();
  const [marks, setMarks] = useState<GroupMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus>('all');
  const [stages, setStages] = useState<Array<{ stage_id: number; stage_name: string }>>([]);

  const normalizeStatus = (mark: GroupMark): Exclude<SubmissionStatus, 'all'> => {
    const explicitStatus = String(mark.current_status ?? '').trim().toLowerCase();

    if (explicitStatus === 'submitted' || explicitStatus === 'pending' || explicitStatus === 'late') {
      return explicitStatus;
    }

    if (mark.submission_date || mark.submitted_at || mark.mark !== null) {
      return 'submitted';
    }

    if (mark.deadline) {
      const deadlineTime = new Date(mark.deadline).getTime();
      if (!Number.isNaN(deadlineTime) && Date.now() > deadlineTime) {
        return 'late';
      }
    }

    return 'pending';
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
  });

  // Fetch marks from backend
  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);

        const response = await fetch(`http://localhost:5000/api/submissions/level/${levelNumber}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

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
  }, [levelNumber]);

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

  const selectedStageMarks = useMemo(
    () => (filterStage === 'all' ? marks : marks.filter((m) => m.stage_id === Number(filterStage))),
    [filterStage, marks]
  );

  const submissionStats = useMemo(() => {
    const totals = selectedStageMarks.reduce(
      (acc, mark) => {
        const status = normalizeStatus(mark);
        acc.total += 1;
        acc[status] += 1;
        return acc;
      },
      { total: 0, submitted: 0, pending: 0, late: 0 }
    );

    const progress = totals.total > 0 ? Math.round((totals.submitted / totals.total) * 100) : 0;

    return {
      ...totals,
      progress,
    };
  }, [selectedStageMarks]);

  const statusTabs: Array<{ key: SubmissionStatus; label: string; count: number }> = [
    { key: 'all', label: 'All', count: submissionStats.total },
    { key: 'submitted', label: 'Submitted', count: submissionStats.submitted },
    { key: 'pending', label: 'Pending', count: submissionStats.pending },
    { key: 'late', label: 'Late', count: submissionStats.late },
  ];

  const filteredMarks =
    filterStatus === 'all'
      ? selectedStageMarks
      : selectedStageMarks.filter((mark) => normalizeStatus(mark) === filterStatus);

  // Group marks by stage for better display
  const groupedMarks: Record<number, GroupMark[]> = {};
  filteredMarks.forEach((mark) => {
    if (!groupedMarks[mark.stage_id]) {
      groupedMarks[mark.stage_id] = [];
    }
    groupedMarks[mark.stage_id].push(mark);
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
                {submissionStats.submitted}/{submissionStats.total} Groups Submitted
              </span>
              <span className="submission-tracker-percent">{submissionStats.progress}% complete</span>
            </div>
            <div className="submission-progress-bar" aria-label="Submission progress">
              <div
                className="submission-progress-fill"
                style={{ width: `${submissionStats.progress}%` }}
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
          <p>No marks found for the selected filter.</p>
        </div>
      ) : (
        <div className="gradebook-wrapper">
          {Object.entries(groupedMarks).map(([stageId, stageMark]) => {
            const stageName = stageMark[0]?.stage_name || `Stage ${stageId}`;

            return (
              <div key={stageId} className="stage-section">
                <h4 className="stage-title">{stageName}</h4>
                <div className="stage-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Group Name</th>
                        <th>Evaluator</th>
                        <th>Mark</th>
                        <th>Submitted</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageMark.map((mark, idx) => (
                        <tr key={idx} className={mark.mark !== null ? 'marked' : 'unmarked'}>
                          <td className="group-col">{mark.group_name}</td>
                          <td className="evaluator-col">{mark.evaluator_name || 'Not assigned'}</td>
                          <td className="mark-col">{renderMarkCell(mark)}</td>
                          <td className="date-col">
                            {mark.submission_date
                              ? new Date(mark.submission_date).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="status-col">
                            {normalizeStatus(mark) === 'submitted' ? (
                              <span className="status-badge submitted">
                                <Check size={14} /> Submitted
                              </span>
                            ) : normalizeStatus(mark) === 'late' ? (
                              <span className="status-badge late">
                                <AlertTriangle size={14} /> Late
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                <Clock3 size={14} /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradebookTable;
