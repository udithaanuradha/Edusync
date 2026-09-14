import React, { useState, useEffect } from 'react';
import { CalendarPlus, X, Send, Trash2, FileText, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SupervisorMeetingRequest.css';

interface SupervisorMeetingRequestProps {
  levelNumber?: number;
}

const SupervisorMeetingRequest: React.FC<SupervisorMeetingRequestProps> = ({ levelNumber = 1 }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [topic, setTopic] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // Both the dropdown's options and the submit-time validation set now come
  // from the same assigned-supervisor lookup below — a student can only
  // ever pick (and only ever submit) a supervisor actually assigned to them.
  const [supervisors, setSupervisors] = useState<{ id: number; name: string }[]>([]);
  const [requestsHistory, setRequestsHistory] = useState<any[]>([]);
  // Only the first 2 history entries show by default — "See all" expands it.
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [assignedSupervisorIds, setAssignedSupervisorIds] = useState<Set<number>>(new Set());

  // Meeting reports — written by the student after an approved meeting,
  // sent to the supervisor for their own separate approval.
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [reportModalRequestId, setReportModalRequestId] = useState<number | null>(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [reportError, setReportError] = useState('');
  // A separate, read-only view for an already-approved report — distinct
  // from reportModalRequestId (the "write a new report" form) so opening
  // one never clobbers the other's state.
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  // Falls back to the student's own requests only when their group isn't
  // known yet (e.g. group-history lookup hasn't resolved). Once a group name
  // is available, group history is fetched instead — see fetchGroupHistory.
  const fetchHistory = async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meeting-requests/student/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setRequestsHistory(await res.json());
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  // Meeting request + report history for the WHOLE assigned group (every
  // member), not just this student's own — reuses the same group-history
  // endpoint the supervisor's "View History" panel is built on.
  const fetchGroupHistory = async (groupNameToFetch: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/meeting-reports/group-history/${encodeURIComponent(groupNameToFetch)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRequestsHistory(Array.isArray(data.meetings) ? data.meetings : []);
      setReportsHistory(Array.isArray(data.reports) ? data.reports : []);
    } catch (err) {
      console.error("Failed to load group history", err);
    }
  };

  // This student's actual assigned supervisor(s) — feeds both the dropdown
  // options and the submit-time validation set below. Served from
  // meetingRequestModel.js's own query (not /api/groups/*) specifically so
  // this stays confined to the meeting-request backend files — /api/groups
  // has a route collision (mentorGroupRoutes.js and groupRoutes.js both
  // define GET /my-status/:studentId under the same /api/groups prefix, and
  // since mentorGroupRoutes.js is mounted first in index.js, its handler
  // always wins there) that isn't this feature's to fix.
  //
  // Deliberately NOT scoped by `levelNumber` — that prop is driven by
  // whatever level CalendarPage's own filter happens to be on (defaults to
  // "1"), not this student's actual level, so filtering by it here could
  // find zero groups for a student who's really at level 2+ and leave the
  // dropdown empty. The backend query isn't level-scoped either.
  const fetchAssignedSupervisors = async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meeting-requests/assigned-supervisors/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: { id: number; name: string }[] = Array.isArray(data) ? data : (data.supervisors || []);
      setAssignedSupervisorIds(new Set(list.map((s) => Number(s.id))));
      setSupervisors(list);
      // Nothing to choose between when there's only one — pick it so the
      // student isn't forced to open a dropdown just to confirm it.
      if (list.length === 1) {
        setSupervisorId(String(list[0].id));
      }
      // Auto-fill the group name from the student's own assigned group —
      // they shouldn't have to type/remember it themselves. Also use it to
      // pull the whole group's request/report history (not just this
      // student's own).
      if (!Array.isArray(data) && data.groupName) {
        setGroupName(data.groupName);
        fetchGroupHistory(data.groupName);
      }
    } catch (err) {
      console.error("Failed to load assigned supervisor(s):", err);
    }
  };

  const fetchReports = async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meeting-reports/student/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setReportsHistory(await res.json());
      }
    } catch (err) {
      console.error("Failed to load meeting reports", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssignedSupervisors();
      fetchHistory();
      fetchReports();
    }
  }, [isOpen, user]);

  const openReportModal = (requestId: number) => {
    setReportModalRequestId(requestId);
    setReportSummary('');
    setReportError('');
    setReportStatus('idle');
  };

  const closeReportModal = () => {
    setReportModalRequestId(null);
    setReportSummary('');
    setReportError('');
    setReportStatus('idle');
  };

  const handleSubmitReport = async () => {
    if (!user || !user.id || reportModalRequestId === null) return;
    if (!reportSummary.trim()) {
      setReportError('Please write a summary of the meeting before submitting.');
      return;
    }

    setReportStatus('submitting');
    setReportError('');

    try {
      const response = await fetch('http://localhost:5000/api/meeting-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          meeting_request_id: reportModalRequestId,
          student_id: user.id,
          summary: reportSummary.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to submit meeting report");
      }

      window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
      closeReportModal();
      fetchReports();
    } catch (error) {
      console.error(error);
      setReportError(error instanceof Error ? error.message : "Failed to submit meeting report.");
      setReportStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      alert("You must be logged in to submit a request.");
      return;
    }

    // Client-side pre-check — only blocks submission when we actually know
    // who's assigned (an empty set means the lookup found nothing / hasn't
    // finished, so this stays permissive and lets the backend's own check
    // be the real gate rather than false-blocking a valid request).
    if (assignedSupervisorIds.size > 0 && !assignedSupervisorIds.has(Number(supervisorId))) {
      setErrorMessage("You can only request a meeting with your assigned supervisor.");
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('http://localhost:5000/api/meeting-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          student_id: user.id,
          supervisor_id: Number(supervisorId),
          group_name: groupName,
          topic,
          // No preferred_date/time from the student anymore — they list a
          // few options in `reason` instead, and the supervisor picks the
          // actual slot when scheduling.
          reason,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to submit request");
      }

      setStatus('success');
      window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
      setTopic('');
      setReason('');
      setGroupName('');
      setSupervisorId('');

      setTimeout(() => {
        setStatus('idle');
        fetchHistory(); // Refresh history
      }, 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to submit meeting request. Please try again later.");
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  // Cancelling a still-pending request — the backend only allows this while
  // status is 'pending', so an already-approved/rejected one can't be
  // deleted even if this were somehow called on it.
  const handleDelete = async (requestId: number) => {
    if (!user || !user.id) return;
    if (!window.confirm("Delete this pending meeting request?")) return;

    setDeletingId(requestId);
    try {
      const response = await fetch(`http://localhost:5000/api/meeting-requests/${requestId}?student_id=${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete request");
      }

      setRequestsHistory((prev) => prev.filter((r) => r.id !== requestId));
      window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete request.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="freeze-date-btn"
        onClick={() => setIsOpen(true)}
      >
        <CalendarPlus size={16} /> Request Meeting
      </button>

      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="schedule-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Student Tools</p>
                <h3>Request a Meeting</h3>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 1.5rem', flex: 1, overflowY: 'auto' }}>
              {status === 'success' && (
                <div className="alert success-alert" style={{ marginBottom: '1.5rem' }}>
                  Meeting request submitted successfully! Your supervisor will review and schedule it.
                </div>
              )}

              {status === 'error' && (
                <div className="alert error-alert" style={{ marginBottom: '1.5rem' }}>
                  {errorMessage || 'Failed to submit meeting request. Please try again later.'}
                </div>
              )}

              {requestsHistory.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--eds-color-text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--eds-color-border)', paddingBottom: '0.5rem' }}>
                    Group Request History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(showAllHistory ? requestsHistory : requestsHistory.slice(0, 2)).map(req => {
                      const isOwn = Number(req.student_id) === Number(user?.id);
                      return (
                      <div key={req.id} style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: `1px solid ${req.status === 'approved' ? 'var(--eds-color-success-solid)' : req.status === 'rejected' ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-border)'}`,
                        background: req.status === 'approved' ? 'var(--eds-color-success-bg)' : req.status === 'rejected' ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-bg-surface)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                          <div>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--eds-color-text-strong)' }}>{req.topic}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--eds-color-text-muted)', marginTop: '2px' }}>
                              {isOwn ? 'By you' : `By ${req.student_name || 'a group member'}`}
                              {req.supervisor_name ? ` → ${req.supervisor_name}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              backgroundColor: req.status === 'approved' ? 'var(--eds-color-success-solid)' : req.status === 'rejected' ? 'var(--eds-color-danger-solid)' : '#f59e0b',
                              color: 'var(--eds-color-bg-surface)'
                            }}>
                              {req.status}
                            </span>
                            {isOwn && req.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleDelete(req.id)}
                                disabled={deletingId === req.id}
                                title="Delete this pending request"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  padding: 0,
                                  border: '1px solid var(--eds-color-danger-solid)',
                                  borderRadius: '6px',
                                  background: 'var(--eds-color-bg-surface)',
                                  color: 'var(--eds-color-danger-solid)',
                                  cursor: deletingId === req.id ? 'not-allowed' : 'pointer',
                                  opacity: deletingId === req.id ? 0.6 : 1,
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--eds-color-text-muted)', marginBottom: '0.5rem' }}>
                          {req.preferred_date
                            ? `Requested for: ${req.preferred_date.split('T')[0]}${req.preferred_time ? ` at ${req.preferred_time.substring(0, 5)}` : ''}${req.end_time ? ` to ${req.end_time.substring(0, 5)}` : ''}`
                            : 'Your supervisor will pick a date/time from the availability you listed below.'}
                        </div>
                        {req.reason && (
                          <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--eds-color-text-body)',
                            background: 'var(--eds-color-bg-surface-soft)',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            marginBottom: '0.5rem',
                            whiteSpace: 'pre-wrap',
                          }}>
                            <strong>Your notes / availability:</strong><br/>
                            {req.reason}
                          </div>
                        )}
                        {req.supervisor_message && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--eds-color-text-body)', 
                            background: 'rgba(255,255,255,0.6)', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            borderLeft: `3px solid ${req.status === 'approved' ? 'var(--eds-color-success-solid)' : 'var(--eds-color-danger-solid)'}`,
                            marginTop: '0.5rem'
                          }}>
                            <strong>Supervisor Message:</strong><br/>
                            {req.supervisor_message}
                          </div>
                        )}
                        {req.status === 'approved' && (() => {
                          const report = reportsHistory.find((r) => r.meeting_request_id === req.id);
                          const reportApproved = report?.status === 'approved';

                          // Other members' requests: only ever a read-only
                          // status glance — creating/viewing the report stays
                          // limited to the student who owns the request.
                          if (!isOwn) {
                            return report ? (
                              <div style={{ marginTop: '0.75rem' }}>
                                <span
                                  title={report.supervisor_message || undefined}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    backgroundColor: report.status === 'approved' ? 'var(--eds-color-success-solid)' : report.status === 'rejected' ? 'var(--eds-color-danger-solid)' : '#f59e0b',
                                    color: 'var(--eds-color-bg-surface)',
                                  }}
                                >
                                  Report: {report.status}
                                </span>
                              </div>
                            ) : null;
                          }

                          return (
                            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => (reportApproved ? setViewingReport(report) : openReportModal(req.id))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: reportApproved ? 'var(--eds-color-primary)' : 'var(--eds-color-bg-surface)',
                                  border: '1px solid var(--eds-color-primary)',
                                  color: reportApproved ? 'var(--eds-color-bg-surface)' : 'var(--eds-color-primary)',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {reportApproved ? <Eye size={14} /> : <FileText size={14} />}
                                {reportApproved ? 'View Your Report' : 'Create Meeting Report'}
                              </button>
                              {report && !reportApproved && (
                                <span
                                  title={report.supervisor_message || undefined}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    backgroundColor: report.status === 'rejected' ? 'var(--eds-color-danger-solid)' : '#f59e0b',
                                    color: 'var(--eds-color-bg-surface)',
                                  }}
                                >
                                  Report: {report.status}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      );
                    })}
                  </div>
                  {requestsHistory.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllHistory((prev) => !prev)}
                      style={{
                        marginTop: '0.75rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--eds-color-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showAllHistory ? 'Show less' : `See all history (${requestsHistory.length})`}
                    </button>
                  )}
                </div>
              )}


              <h4 style={{ fontSize: '0.9rem', color: 'var(--eds-color-text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--eds-color-border)', paddingBottom: '0.5rem' }}>
                New Meeting Request
              </h4>
              <form className="drawer-form" onSubmit={handleSubmit}>
                <div className="drawer-inline-grid">
                  <label className="drawer-field">
                    <span>Group Name</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Group 05"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      readOnly={!!groupName}
                      style={groupName ? { background: 'var(--eds-color-bg-muted, #f3f4f6)', cursor: 'not-allowed' } : undefined}
                    />
                  </label>
                  <label className="drawer-field">
                    <span>Supervisor</span>
                    <select
                      required
                      value={supervisorId}
                      onChange={(e) => setSupervisorId(e.target.value)}
                      disabled={supervisors.length === 0}
                    >
                      <option value="">
                        {supervisors.length === 0 ? '-- No assigned supervisor yet --' : '-- Select Supervisor --'}
                      </option>
                      {supervisors.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="drawer-field">
                  <span>Topic / Purpose of Meeting</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Project Proposal Review"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </label>

                <label className="drawer-field">
                  <span>Additional Notes / Reason</span>
                  <textarea
                    rows={5}
                    placeholder={"List a few dates/times you're available (e.g., Mon 9/8 2-4pm, Tue 9/9 anytime after 10am), plus what you'd like to discuss. Your supervisor will confirm one and schedule it."}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  ></textarea>
                </label>

                <div className="drawer-actions" style={{ marginTop: '2rem' }}>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="drawer-secondary-btn"
                    onClick={() => setIsOpen(false)}
                    disabled={status === 'submitting'}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="drawer-primary-btn"
                    disabled={status === 'submitting' || status === 'success'}
                    style={{ background: 'var(--eds-color-primary)', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}
                  >
                    <Send size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {status === 'submitting' ? 'Submitting...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      )}

      {reportModalRequestId !== null && (
        <div className="report-modal-backdrop" role="dialog" aria-modal="true" onClick={closeReportModal}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Meeting Report</h3>
            <p>Summarize what was discussed/decided in this meeting — your supervisor will review and approve it.</p>
            <textarea
              value={reportSummary}
              onChange={(event) => setReportSummary(event.target.value)}
              placeholder="What did you discuss? What are the next steps?"
              rows={6}
            />
            {reportError && <p className="report-modal-error">{reportError}</p>}
            <div className="report-modal-actions">
              <button
                type="button"
                className="report-modal-submit-btn"
                onClick={handleSubmitReport}
                disabled={reportStatus === 'submitting'}
              >
                {reportStatus === 'submitting' ? 'Submitting...' : 'Submit Report'}
              </button>
              <button type="button" className="report-modal-cancel-btn" onClick={closeReportModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingReport !== null && (
        <div className="report-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setViewingReport(null)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Your Meeting Report</h3>
            <p>Submitted {new Date(viewingReport.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — approved by your supervisor.</p>

            <div style={{
              fontSize: '0.85rem',
              color: 'var(--eds-color-text-body)',
              background: 'var(--eds-color-bg-surface-soft)',
              padding: '0.75rem',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
            }}>
              {viewingReport.summary}
            </div>

            {viewingReport.supervisor_message && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--eds-color-text-body)',
                background: 'var(--eds-color-success-bg)',
                padding: '0.75rem',
                borderRadius: '8px',
                borderLeft: '3px solid var(--eds-color-success-solid)',
                marginTop: '0.75rem',
                whiteSpace: 'pre-wrap',
              }}>
                <strong>Supervisor Feedback:</strong><br />
                {viewingReport.supervisor_message}
              </div>
            )}

            <div className="report-modal-actions">
              <button type="button" className="report-modal-cancel-btn" onClick={() => setViewingReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupervisorMeetingRequest;
