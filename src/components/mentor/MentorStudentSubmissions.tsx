import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, CheckCircle2, AlertCircle, User, Award, Layers, Clock } from 'lucide-react';
import './MentorStudentSubmissions.css';

interface SubmissionFile {
  file_id: number;
  file_name: string;
  file_url: string;
}

interface StudentSubmission {
  submission_id: number;
  stage_id: number;
  stage_name: string;
  deadline?: string;
  level: number;
  student_id: number;
  student_name: string;
  student_email: string;
  university_id: string;
  is_leader: boolean;
  group_id: number;
  group_name: string;
  submitted_at: string;
  status: string;
  files: SubmissionFile[];
}

interface MentorStudentSubmissionsProps {
  levelNumber: number;
}

const MentorStudentSubmissions: React.FC<MentorStudentSubmissionsProps> = ({ levelNumber }) => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format download URLs properly (supporting local /uploads and remote Cloudinary URLs)
  const getFileUrl = (rawUrl?: string) => {
    if (!rawUrl) return '#';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return `http://localhost:5000${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  // Robust programmatic file downloader
  const handleDownload = (url: string, fileName: string) => {
    const fullUrl = getFileUrl(url);
    try {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', fileName || 'student-deliverable.pdf');
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Native download trigger failed, opening URL in new tab:', err);
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (mentorId) headers['x-user-id'] = String(mentorId);
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = mentorId
          ? `http://localhost:5000/api/mentor/submissions/${levelNumber}?mentorId=${mentorId}`
          : `http://localhost:5000/api/mentor/submissions/${levelNumber}`;

        const res = await fetch(url, { headers });
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setSubmissions(json.data);
        } else if (Array.isArray(json)) {
          setSubmissions(json);
        } else {
          setSubmissions([]);
        }
      } catch (err: any) {
        console.error('Failed to load student submissions for mentor:', err);
        setError('Unable to load student submissions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [levelNumber]);

  if (loading) {
    return (
      <div className="mss-loading-container">
        <div className="mss-spinner"></div>
        <p>Loading student submissions for Level {levelNumber}...</p>
      </div>
    );
  }

  const groupName = submissions.length > 0 ? submissions[0].group_name : `Level ${levelNumber} Group`;
  const totalSubmissions = submissions.length;
  const onTimeCount = submissions.filter((s) => s.status === 'On Time').length;
  const lateCount = submissions.filter((s) => s.status === 'Late').length;

  return (
    <div className="mss-container">
      {/* ── Top Header Section ── */}
      <div className="mss-header-card">
        <div className="mss-header-left">
          <div className="mss-header-badge">Level {levelNumber} Submissions</div>
          <h3>Student Submissions & Reports</h3>
          <p className="mss-subtitle">
            Review and download reports, project documents, and stage deliverables submitted by your assigned group members.
          </p>
        </div>

        <div className="mss-header-stats">
          <div className="mss-stat-pill">
            <Layers size={16} className="text-blue-500" />
            <div className="mss-stat-meta">
              <span className="mss-stat-val">{totalSubmissions}</span>
              <span className="mss-stat-lbl">Total Reports</span>
            </div>
          </div>
          <div className="mss-stat-pill">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <div className="mss-stat-meta">
              <span className="mss-stat-val">{onTimeCount}</span>
              <span className="mss-stat-lbl">On Time</span>
            </div>
          </div>
          {lateCount > 0 && (
            <div className="mss-stat-pill late">
              <Clock size={16} className="text-amber-500" />
              <div className="mss-stat-meta">
                <span className="mss-stat-val">{lateCount}</span>
                <span className="mss-stat-lbl">Late</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Submissions List Section ── */}
      {error && (
        <div className="mss-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {submissions.length > 0 ? (
        <div className="mss-cards-grid">
          {submissions.map((sub, index) => {
            const formattedDate = sub.submitted_at
              ? new Date(sub.submitted_at).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Unknown date';

            return (
              <div key={sub.submission_id || index} className="mss-submission-card">
                <div className="mss-card-header">
                  <div className="mss-stage-badge-wrap">
                    <span className="mss-stage-chip">{sub.stage_name || `Stage ${index + 1}`}</span>
                    <span className={`mss-status-chip ${sub.status === 'Late' ? 'late' : 'ontime'}`}>
                      {sub.status === 'Late' ? '⚠️ Late Submission' : '✅ On Time'}
                    </span>
                  </div>

                  <div className="mss-group-badge">
                    <Award size={13} /> {sub.group_name || groupName}
                  </div>
                </div>

                <div className="mss-student-row">
                  <div className="mss-avatar-circle">
                    <User size={16} />
                  </div>
                  <div className="mss-student-details">
                    <div className="mss-student-name-wrap">
                      <span className="mss-student-name">{sub.student_name || 'Student'}</span>
                      {sub.is_leader && <span className="mss-leader-badge">👑 Leader</span>}
                    </div>
                    <span className="mss-student-meta">
                      {sub.university_id ? `ID: ${sub.university_id}` : sub.student_email}
                    </span>
                  </div>
                </div>

                <div className="mss-timeline-meta">
                  <div className="mss-meta-item">
                    <Calendar size={14} />
                    <span>Submitted: {formattedDate}</span>
                  </div>
                  {sub.deadline && (
                    <div className="mss-meta-item deadline">
                      <Clock size={14} />
                      <span>Deadline: {new Date(sub.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mss-files-section">
                  <span className="mss-files-title">Submitted Deliverables & Attachments:</span>
                  <div className="mss-files-stack">
                    {sub.files && sub.files.length > 0 ? (
                      sub.files.map((file, fIdx) => (
                        <div key={file.file_id || fIdx} className="mss-file-item">
                          <div className="mss-file-info">
                            <FileText size={16} className="mss-file-icon" />
                            <span className="mss-file-name" title={file.file_name}>
                              {file.file_name || `Report_${fIdx + 1}.pdf`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(file.file_url, file.file_name)}
                            className="mss-btn-download"
                            title="Download document"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="mss-no-files">No files attached to this submission.</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="mss-empty-container">
          <div className="mss-empty-card">
            <FileText size={48} className="mss-empty-icon" />
            <h4>No Submissions Yet</h4>
            <p>
              Students in your assigned group ({groupName}) haven't submitted any stage deliverables for Level {levelNumber} yet. Uploaded student reports will automatically appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorStudentSubmissions;
