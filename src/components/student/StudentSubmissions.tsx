import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import './StudentSubmissions.css';

interface Stage {
  stage_id: number;
  stage_name: string;
  description: string;
  deadline: string;
  level: number;
}

interface SubmissionItem {
  submission_id: number;
  stage_id: number;
  student_id: number;
  file_paths: string[];
  submission_link: string | null;
  submitted_at: string;
  status: string;
}

const StudentSubmissions: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyStageId, setBusyStageId] = useState<number | null>(null);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<number | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, FileList | null>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});

  const currentUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const academicUnitParam = currentUser?.academic_unit
        ? `?academicUnit=${encodeURIComponent(currentUser.academic_unit)}`
        : '';
      const stageRes = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}${academicUnitParam}`);
      const stageData = await stageRes.json();
      setStages(stageData?.success ? stageData.data : []);

      if (!currentUser?.id) {
        setSubmissions([]);
        return;
      }

      const submissionRes = await fetch(`http://localhost:5000/api/submissions/student/${currentUser.id}`);
      const submissionData = await submissionRes.json();
      setSubmissions(submissionData?.success ? submissionData.data : []);
    } catch {
      setError('Unable to load submission data right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [levelNumber, currentUser?.id]);

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getSubmissionForStage = (stageId: number) =>
    submissions.find((item) => item.stage_id === stageId);

  const handleFileChange = (stageId: number, files: FileList | null) => {
    setSelectedFiles((prev) => ({ ...prev, [stageId]: files }));
  };

  const handleSubmit = async (stage: Stage) => {
    const files = selectedFiles[stage.stage_id];
    const link = (linkDrafts[stage.stage_id] || '').trim();

    if ((!files || files.length === 0) && !link) {
      setError('Attach at least one file or a link before submitting.');
      return;
    }
    if (!currentUser?.id) {
      setError('Student account information was not found. Please sign in again.');
      return;
    }

    try {
      setBusyStageId(stage.stage_id);
      setError('');
      setMessage('');

      const formData = new FormData();
      if (files) Array.from(files).forEach((file) => formData.append('files', file));
      formData.append('stage_id', String(stage.stage_id));
      formData.append('student_id', String(currentUser.id));
      formData.append('deadline', stage.deadline || '');
      if (link) formData.append('submission_link', link);

      const response = await fetch('http://localhost:5000/api/submissions', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Submission failed.');
      }

      setMessage(`Submitted for ${stage.stage_name}.`);
      setSelectedFiles((prev) => ({ ...prev, [stage.stage_id]: null }));
      setLinkDrafts((prev) => ({ ...prev, [stage.stage_id]: '' }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setBusyStageId(null);
    }
  };

  const handleUpdate = async (stage: Stage, submission: SubmissionItem) => {
    const files = selectedFiles[stage.stage_id];
    const link = linkDrafts[stage.stage_id];

    if (!currentUser?.id) {
      setError('Student account information was not found. Please sign in again.');
      return;
    }

    try {
      setBusyStageId(stage.stage_id);
      setError('');
      setMessage('');

      const formData = new FormData();
      if (files) Array.from(files).forEach((file) => formData.append('files', file));
      formData.append('student_id', String(currentUser.id));
      formData.append('deadline', stage.deadline || '');
      // Always send submission_link (even empty) so the backend knows the field was
      // intentionally touched — see updateSubmission's linkProvided check.
      formData.append('submission_link', (link ?? submission.submission_link ?? '').trim());

      const response = await fetch(`http://localhost:5000/api/submissions/${submission.submission_id}`, {
        method: 'PUT',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Update failed.');
      }

      setMessage(`Updated your submission for ${stage.stage_name}.`);
      setEditingStageId(null);
      setSelectedFiles((prev) => ({ ...prev, [stage.stage_id]: null }));
      setLinkDrafts((prev) => ({ ...prev, [stage.stage_id]: '' }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyStageId(null);
    }
  };

  const handleDelete = async (submission: SubmissionItem) => {
    if (!currentUser?.id) {
      setError('Student account information was not found. Please sign in again.');
      return;
    }
    if (!window.confirm('Delete this submission?')) return;

    try {
      setDeletingSubmissionId(submission.submission_id);
      setError('');
      setMessage('');

      const response = await fetch(
        `http://localhost:5000/api/submissions/${submission.submission_id}?studentId=${currentUser.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } },
      );

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete submission.');
      }

      setMessage('Submission deleted.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete submission.');
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  if (loading) {
    return <div className="student-tab-empty">Loading submission tasks...</div>;
  }

  return (
    <div className="student-inner-tab-panel">
      <div className="student-inner-tab-heading">
        <h3>Submissions</h3>
        <p>
          Upload your work for each stage before the coordinator-set deadline, or attach a link (e.g. a shared
          drive folder). You can update what you've submitted at any time before it's reviewed.
        </p>
      </div>

      {message && <div className="student-submission-alert success">{message}</div>}
      {error && <div className="student-submission-alert error">{error}</div>}

      {stages.length === 0 ? (
        <div className="student-tab-empty">No stages are available for this level yet.</div>
      ) : (
        <div className="timeline-list">
          {stages.map((stage, index) => {
            const submission = getSubmissionForStage(stage.stage_id);
            const daysRemaining = getDaysRemaining(stage.deadline);
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const isDueSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
            const statusLabel = submission?.status || (daysRemaining === null ? 'Pending' : isOverdue ? 'Late' : 'On Time');
            const isEditing = editingStageId === stage.stage_id;
            const selectedFileNames = selectedFiles[stage.stage_id]
              ? Array.from(selectedFiles[stage.stage_id] as FileList).map((f) => f.name).join(', ')
              : '';

            return (
              <div className="timeline-item" key={stage.stage_id}>
                <div className="timeline-marker">
                  <span className="stage-number">{index + 1}</span>
                </div>

                <div className="timeline-content">
                  <div className="stage-header-row">
                    <h4 className="stage-name">{stage.stage_name}</h4>
                    <span className={`submission-status-badge ${isOverdue ? 'late' : isDueSoon ? 'soon' : 'active'}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="stage-info">
                    {stage.description && (
                      <div className="info-item">
                        <span className="info-label">Description:</span>
                        <span className="info-value">{stage.description}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Deadline:</span>
                      <span className="info-value">
                        {stage.deadline ? new Date(stage.deadline).toLocaleString() : 'No deadline set'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Reminder:</span>
                      <span className="info-value">
                        {daysRemaining === null
                          ? 'No deadline set'
                          : daysRemaining < 0
                            ? `Overdue by ${Math.abs(daysRemaining)} day(s)`
                            : daysRemaining === 0
                              ? 'Due today'
                              : `${daysRemaining} day(s) remaining`}
                      </span>
                    </div>

                    {submission?.submission_link && !isEditing && (
                      <div className="info-item">
                        <span className="info-label">Submission Link:</span>
                        <a
                          className="info-value"
                          href={submission.submission_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', wordBreak: 'break-word' }}
                        >
                          🔗 View submitted link
                        </a>
                      </div>
                    )}

                    {submission?.file_paths?.length ? (
                      <div className="info-item">
                        <span className="info-label">Documents:</span>
                        <div className="submission-file-rows" style={{ flex: 1 }}>
                          {submission.file_paths.map((fileUrl, idx) => (
                            <div className="submission-file-row" key={`${submission.submission_id}-${idx}`}>
                              <a href={fileUrl} target="_blank" rel="noreferrer">
                                📄 File {idx + 1}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {(!submission || isEditing) && (
                    <div className="submission-upload-row">
                      <input
                        type="file"
                        multiple
                        className="submission-file-input"
                        onChange={(e) => handleFileChange(stage.stage_id, e.target.files)}
                      />
                      {selectedFileNames && <span className="info-value">{selectedFileNames}</span>}
                      <input
                        type="url"
                        className="submission-link-input"
                        placeholder="Optional: paste a link (e.g. Google Drive, spreadsheet)"
                        value={linkDrafts[stage.stage_id] ?? (isEditing ? submission?.submission_link || '' : '')}
                        onChange={(e) =>
                          setLinkDrafts((prev) => ({ ...prev, [stage.stage_id]: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div className="submission-action-row">
                    {!submission && (
                      <button
                        type="button"
                        className="btn-submit-work"
                        onClick={() => handleSubmit(stage)}
                        disabled={busyStageId === stage.stage_id}
                      >
                        {busyStageId === stage.stage_id ? 'Submitting...' : 'Submit Work'}
                      </button>
                    )}

                    {submission && !isEditing && (
                      <>
                        <button
                          type="button"
                          className="btn-edit-submission"
                          onClick={() => setEditingStageId(stage.stage_id)}
                        >
                          <Edit2 size={16} />
                          Edit Submission
                        </button>
                        <button
                          type="button"
                          className="btn-delete-submission"
                          onClick={() => handleDelete(submission)}
                          disabled={deletingSubmissionId === submission.submission_id}
                        >
                          <Trash2 size={16} />
                          {deletingSubmissionId === submission.submission_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}

                    {submission && isEditing && (
                      <>
                        <button
                          type="button"
                          className="btn-edit-submission"
                          onClick={() => handleUpdate(stage, submission)}
                          disabled={busyStageId === stage.stage_id}
                        >
                          {busyStageId === stage.stage_id ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          className="btn-delete-submission"
                          onClick={() => {
                            setEditingStageId(null);
                            setSelectedFiles((prev) => ({ ...prev, [stage.stage_id]: null }));
                            setLinkDrafts((prev) => ({ ...prev, [stage.stage_id]: '' }));
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;
