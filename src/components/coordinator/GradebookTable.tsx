import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Check } from 'lucide-react';
import './GradebookTable.css';

interface GroupMark {
  group_id: number;
  group_name: string;
  stage_id: number;
  stage_name: string;
  mark: number | null;
  evaluator_name: string;
  submission_date: string | null;
  mark_type: string;
}

interface GradebookTableProps {
  levelNumber: number;
}

const GradebookTable: React.FC<GradebookTableProps> = ({ levelNumber }) => {
  const [marks, setMarks] = useState<GroupMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [stages, setStages] = useState<Array<{ stage_id: number; stage_name: string }>>([]);

  // Fetch marks from backend
  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        // The coordinator view reads marks directly from the API so it always shows the latest evaluation data.
        const response = await fetch(
          `http://localhost:5000/api/marks/level/${levelNumber}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch marks: ${response.statusText}`);
        }

        const data = await response.json();
        const marksList = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
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

  const filteredMarks =
    filterStage === 'all' ? marks : marks.filter((m) => m.stage_id === parseInt(filterStage));

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
          <h3>Marking & Evaluation</h3>
          <p>View and manage group marks for Level {levelNumber} stages</p>
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
                            {mark.mark !== null ? (
                              <span className="status-badge submitted">
                                <Check size={14} /> Submitted
                              </span>
                            ) : (
                              <span className="status-badge pending">Pending</span>
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
