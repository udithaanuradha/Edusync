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
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [supervisors, setSupervisors] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && supervisors.length === 0) {
      fetch('http://localhost:5000/api/groups/supervisors')
        .then(res => res.json())
        .then(data => setSupervisors(data))
        .catch(err => console.error("Failed to load supervisors:", err));
    }
  }, [isOpen, supervisors.length]);

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
      setReason('');
      setGroupName('');
      setSupervisorId('');
      
      setTimeout(() => {
        setStatus('idle');
        setIsOpen(false);
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

                <div className="drawer-inline-grid">
                  <label className="drawer-field">
                    <span>Preferred Date</span>
                    <input
                      type="date"
                      required
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                    />
                  </label>
                  <label className="drawer-field">
                    <span>Preferred Time</span>
                    <input
                      type="time"
                      required
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
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
