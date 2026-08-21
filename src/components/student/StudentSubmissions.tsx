import React, { useEffect, useMemo, useState } from 'react';

interface StageFile {
  file_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface Stage {
  stage_id: number;
  stage_name: string;
  description: string;
  deadline: string;
  level: number;
  files?: StageFile[];
}

interface SubmissionItem {
  submission_id: number;
  stage_id: number;
  student_id: number;
  file_paths: string[];
  submitted_at: string;
  status: string;
  stage_name?: string;
  deadline?: string;
}

const StudentSubmissions: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyStageId, setBusyStageId] = useState<number | null>(null);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, FileList | null>>({});

  const currentUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // Scope to the student's own degree program — the backend also includes
      // legacy/global stages (no academic_unit set) so this never hides
      // pre-existing stages.
      const academicUnitParam = currentUser?.academic_unit
        ? `?academicUnit=${encodeURIComponent(currentUser.academic_unit)}`
        : '';
      const stageRes = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}${academicUnitParam}`);
      const stageData = await stageRes.json();
      const stageList = stageData?.success ? stageData.data : [];
      setStages(stageList);

      if (!currentUser?.id) {
        setSubmissions([]);
        return;
      }

      const submissionRes = await fetch(`http://localhost:5000/api/submissions/student/${currentUser.id}`);
      const submissionData = await submissionRes.json();
      const submissionList = submissionData?.success ? submissionData.data : [];
      setSubmissions(submissionList);
    } catch (err) {
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
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getSubmissionForStage = (stageId: number) =>
    submissions.find((item) => item.stage_id === stageId);

  const handleFileChange = (stageId: number, files: FileList | null) => {
    setSelectedFiles((prev) => ({ ...prev, [stageId]: files }));
  };

  const handleUpload = async (stage: Stage) => {
    const files = selectedFiles[stage.stage_id];
    if (!files || files.length === 0) {
      setError('Please choose at least one file to upload.');
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
      Array.from(files).forEach((file) => formData.append('files', file));
      formData.append('stage_id', String(stage.stage_id));
      formData.append('student_id', String(currentUser.id));

      const response = await fetch('http://localhost:5000/api/submissions', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Submission upload failed.');
      }

      setMessage(`${files.length} file(s) submitted for ${stage.stage_name}.`);
      setSelectedFiles((prev) => ({ ...prev, [stage.stage_id]: null }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission upload failed.');
    } finally {
      setBusyStageId(null);
    }
  };

  const handleDeleteSubmission = async (submission: SubmissionItem) => {
    if (!currentUser?.id) {
      setError('Student account information was not found. Please sign in again.');
      return;
    }

    const confirmed = window.confirm('Delete this submission?');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingSubmissionId(submission.submission_id);
      setError('');
      setMessage('');

      const response = await fetch(`http://localhost:5000/api/submissions/${submission.submission_id}?studentId=${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete submission.');
      }

      setMessage('Submission deleted successfully.');
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
          Upload your work for each stage before the coordinator-set deadline. Accepted formats include PDF, PPT/PPTX, Word documents, images, and ZIP archives. You will see the remaining days and whether your submission is on time or late.
        </p>
      </div>

      {message && <div className="student-submission-alert success">{message}</div>}
      {error && <div className="student-submission-alert error">{error}</div>}

      {stages.length === 0 ? (
        <div className="student-tab-empty">No stages are available for this level yet.</div>
      ) : (
        <div className="student-submission-list">
          {stages.map((stage) => {
            const submission = getSubmissionForStage(stage.stage_id);
            const daysRemaining = getDaysRemaining(stage.deadline);
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const isDueSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
            const statusLabel = submission?.status || (daysRemaining === null ? 'Pending' : isOverdue ? 'Late' : 'On Time');
            const selectedFilesForStage = selectedFiles[stage.stage_id];
            const selectedFileNames = selectedFilesForStage ? Array.from(selectedFilesForStage).map((file) => file.name) : [];

            return (
              <div className="student-submission-card" key={stage.stage_id}>
                <div className="student-submission-card-header">
                  <div>
                    <h4>{stage.stage_name}</h4>
                    <p>{stage.description || 'No description provided.'}</p>
                  </div>
                  <span className={`student-submission-badge ${isOverdue ? 'late' : isDueSoon ? 'soon' : 'active'}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="student-submission-grid">
                  <div className="student-submission-main-panel">
                    <div className="student-submission-meta">
                      <span>
                        <strong>Deadline:</strong>{' '}
                        {stage.deadline ? new Date(stage.deadline).toLocaleString() : 'No deadline set'}
                      </span>
                      <span>
                        <strong>Reminder:</strong>{' '}
                        {daysRemaining === null
                          ? 'No deadline set'
                          : daysRemaining < 0
                            ? `Overdue by ${Math.abs(daysRemaining)} day(s)`
                            : daysRemaining === 0
                              ? 'Due today'
                              : `${daysRemaining} day(s) remaining`}
                      </span>
                    </div>

                    <div className="student-submission-upload-box">
                      <div className="student-upload-picker">
                        <label className="student-upload-label" htmlFor={`upload-${stage.stage_id}`}>
                          Choose files for this stage
                        </label>
                        <div className="student-upload-input-shell">
                          <input
                            id={`upload-${stage.stage_id}`}
                            type="file"
                            multiple
                            onChange={(event) => handleFileChange(stage.stage_id, event.target.files)}
                          />
                          <span className="student-upload-hint">
                            {selectedFileNames.length > 0 ? selectedFileNames.join(', ') : 'PDF, Word, PPT, image, or ZIP files'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="manage-project-btn"
                        onClick={() => handleUpload(stage)}
                        disabled={busyStageId === stage.stage_id}
                      >
                        {busyStageId === stage.stage_id ? 'Uploading...' : 'Submit Documents'}
                      </button>
                    </div>
                  </div>

                  <div className="student-submission-side-panel">
                    <div className="student-submission-side-header">
                      <h5>Uploaded files</h5>
                      <span>{submission ? `${submission.file_paths?.length || 0} file(s)` : 'Waiting'}</span>
                    </div>

                    {submission ? (
                      <div className="student-submission-file-list">
                        {submission.file_paths?.length ? (
                          submission.file_paths.map((fileUrl, index) => (
                            <div className="student-submission-file-item" key={`${submission.submission_id}-${index}`}>
                              <div>
                                <p className="student-submission-file-name">File {index + 1}</p>
                                <p className="student-submission-file-meta">{fileUrl}</p>
                              </div>
                              <div className="student-submission-file-actions">
                                <a href={fileUrl} target="_blank" rel="noreferrer">
                                  View
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubmission(submission)}
                                  disabled={deletingSubmissionId === submission.submission_id}
                                >
                                  {deletingSubmissionId === submission.submission_id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="student-submission-history empty">No files attached to this submission.</div>
                        )}
                      </div>
                    ) : (
                      <div className="student-submission-history empty">
                        No submission has been uploaded for this stage yet.
                      </div>
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
