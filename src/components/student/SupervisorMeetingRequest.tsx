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
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          end_time: endTime,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit request");
      }

      setStatus('success');
      setTopic('');
      setPreferredDate('');
      setPreferredTime('');
      setEndTime('');
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

            <div className="drawer-summary-card" style={{ margin: '0 1.5rem 1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span className="drawer-summary-label" style={{ color: '#1e3a8a' }}>Level {levelNumber} Project</span>
              <strong style={{ color: '#1e3a8a' }}>Supervisor Meeting</strong>
              <span style={{ color: '#3b82f6' }}>
                Use this form to request a meeting with your project supervisor. They will be notified and can schedule the meeting in their calendar.
              </span>
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
                  <h4 style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                    Your Request History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requestsHistory.map(req => (
                      <div key={req.id} style={{ 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        border: `1px solid ${req.status === 'approved' ? '#a7f3d0' : req.status === 'rejected' ? '#fecaca' : '#e5e7eb'}`,
                        background: req.status === 'approved' ? '#f0fdf4' : req.status === 'rejected' ? '#fef2f2' : '#ffffff' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{req.topic}</strong>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            backgroundColor: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b',
                            color: '#fff'
                          }}>
                            {req.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Requested for: {req.preferred_date ? req.preferred_date.split('T')[0] : ''} at {req.preferred_time ? req.preferred_time.substring(0, 5) : ''} to {req.end_time ? req.end_time.substring(0, 5) : ''}
                        </div>
                        {req.supervisor_message && (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#374151', 
                            background: 'rgba(255,255,255,0.6)', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            borderLeft: `3px solid ${req.status === 'approved' ? '#10b981' : '#ef4444'}`,
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

              <h4 style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
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
                  <span>Preferred Date</span>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </label>

                <div className="drawer-inline-grid">
                  <label className="drawer-field">
                    <span>Start Time</span>
                    <input
                      type="time"
                      required
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    />
                  </label>
                  <label className="drawer-field">
                    <span>End Time</span>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </label>
                </div>

                <label className="drawer-field">
                  <span>Additional Notes / Reason</span>
                  <textarea
                    rows={4}
                    placeholder="Briefly describe what you'd like to discuss..."
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
                    style={{ background: '#4f46e5', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}
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
