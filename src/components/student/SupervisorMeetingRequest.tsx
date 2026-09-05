import React, { useState, useEffect } from 'react';
import { CalendarPlus, X, Send } from 'lucide-react';
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
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [requestsHistory, setRequestsHistory] = useState<any[]>([]);

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

  useEffect(() => {
    if (isOpen) {
      if (supervisors.length === 0) {
        fetch('http://localhost:5000/api/groups/supervisors')
          .then(res => res.json())
          .then(data => setSupervisors(data))
          .catch(err => console.error("Failed to load supervisors:", err));
      }
      fetchHistory();
    }
  }, [isOpen, supervisors.length, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      alert("You must be logged in to submit a request.");
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
        throw new Error("Failed to submit request");
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
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
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
                  Failed to submit meeting request. Please try again later.
                </div>
              )}

              {requestsHistory.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--eds-color-text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--eds-color-border)', paddingBottom: '0.5rem' }}>
                    Your Request History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requestsHistory.map(req => (
                      <div key={req.id} style={{ 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        border: `1px solid ${req.status === 'approved' ? 'var(--eds-color-success-solid)' : req.status === 'rejected' ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-border)'}`,
                        background: req.status === 'approved' ? 'var(--eds-color-success-bg)' : req.status === 'rejected' ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-bg-surface)' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--eds-color-text-strong)' }}>{req.topic}</strong>
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
                      </div>
                    ))}
                  </div>
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
                    />
                  </label>
                  <label className="drawer-field">
                    <span>Supervisor</span>
                    <select
                      required
                      value={supervisorId}
                      onChange={(e) => setSupervisorId(e.target.value)}
                    >
                      <option value="">-- Select Supervisor --</option>
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
    </>
  );
};

export default SupervisorMeetingRequest;
