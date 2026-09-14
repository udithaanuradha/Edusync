import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../components/student/GroupRequest.css';

interface RequestSupervisorProps {
  levelNumber?: number;
}

type SlotStatus = 'none' | 'pending' | 'approved' | 'rejected';

// "Group of one" — this reuses the exact same group_requests /
// group_request_supervisors data model and endpoints as GroupRequest.tsx
// (Group Formation), just with no member-adding step and exactly one
// supervisor slot instead of two. A request with only one supervisor
// targeted already auto-approves as soon as that one supervisor accepts
// (see approveRequestBySupervisor on the backend) — there's no dual-
// approval logic to strip out, it simply never applies here.
const RequestSupervisor: React.FC<RequestSupervisorProps> = ({ levelNumber = 3 }) => {
  const navigate = useNavigate();

  const [supervisors, setSupervisors] = useState<{ id: number; name: string }[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState('');

  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isFinalized, setIsFinalized] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  // Set once the coordinator has actually created the (single-member) group
  // for this request — same activeGroup check GroupRequest.tsx uses, via
  // /api/groups/my-status. That's also this tab's cue to offer "Start
  // Manage the Project", since there's no separate Groups tab here to host it.
  const [activeGroup, setActiveGroup] = useState<{ groupId: number; groupName: string } | null>(null);

  const [formData, setFormData] = useState({
    projectName: '',
    leaderName: '',
    message: '',
  });

  const [slot, setSlot] = useState<{
    supervisorId: number | null;
    status: SlotStatus;
    rejectionReason: string;
  }>({ supervisorId: null, status: 'none', rejectionReason: '' });
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    setSupervisorsLoading(true);
    setSupervisorsError('');
    fetch('http://localhost:5000/api/groups/supervisors', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status} while loading supervisors.`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setSupervisors(data);
        else if (data?.results) setSupervisors(data.results);
        else setSupervisors([]);
      })
      .catch((err) => {
        console.error('Error fetching supervisors', err);
        setSupervisorsError('Could not load supervisors. Please refresh and try again.');
        setSupervisors([]);
      })
      .finally(() => setSupervisorsLoading(false));

    fetch(`http://localhost:5000/api/groups/my-status/${user?.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const groups = Array.isArray(data) ? data : [];
        const match = groups.find((g: any) => Number(g.level) === Number(levelNumber));
        setActiveGroup(match ? { groupId: match.groupId, groupName: match.groupName } : null);
      })
      .catch((err) => {
        console.error('Error checking active group', err);
        setActiveGroup(null);
      });

    checkExistingRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNumber]);

  useEffect(() => {
    if (supervisors.length === 0 || supervisorSearch || !slot.supervisorId) return;
    const match = supervisors.find((s) => s.id === slot.supervisorId);
    if (match) setSupervisorSearch(match.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.supervisorId, supervisors]);

  const checkExistingRequest = async () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (!user?.id) return;

    if (requestStatus === 'none') {
      setFormData((prev) => ({ ...prev, leaderName: user.name || '' }));
    }

    try {
      const res = await fetch(`http://localhost:5000/api/groups/my-requests/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const requests = Array.isArray(data) ? data : [data];
      const latest = requests.find((r: any) => Number(r.project_level || r.level) === Number(levelNumber));
      if (!latest) return;

      setRequestStatus((latest.status || 'none') as 'none' | 'pending' | 'approved' | 'rejected');
      setRequestId(Number(latest.request_id || latest.id || null));
      setIsFinalized(Boolean(latest.is_final_submitted));

      setFormData({
        projectName: latest.request_message?.match(/Project:\s*([^\n.]+)/i)?.[1]?.trim() || latest.group_name || '',
        leaderName: latest.members_list?.match(/Leader:\s*([^,\n]+)/i)?.[1]?.trim() || user.name || '',
        message: latest.request_message?.split('. ')?.[1] || '',
      });

      const responses = Array.isArray(latest.supervisor_responses) ? latest.supervisor_responses : [];
      if (responses.length > 0) {
        const r = responses[0];
        const status = r.status === 'cancelled' ? 'rejected' : r.status;
        setSlot({
          supervisorId: Number(r.supervisor_id),
          status: (status || 'pending') as SlotStatus,
          rejectionReason: r.rejection_reason || '',
        });
      }
    } catch (err) {
      console.error('Status check failed', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isLocked = slot.status !== 'none' && slot.status !== 'rejected';

  const handleRequest = async () => {
    if (!slot.supervisorId) {
      alert('Please choose a supervisor first.');
      return;
    }
    if (!formData.projectName) {
      alert('Please fill in the Project Name first.');
      return;
    }

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (!user?.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/groups/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          // No separate "Group Name" field on this form — the backend's
          // group_requests.group_name column still needs a value (it's
          // used for card titles/badges throughout), so the project name
          // doubles as it here. Doesn't touch GroupRequest.tsx or its own
          // Group Name field at all.
          group_name: formData.projectName,
          members_list: `Leader: ${formData.leaderName}, Members: `,
          request_message: `Project: ${formData.projectName}. ${formData.message}`,
          supervisor_ids: [slot.supervisorId],
          member_ids: [],
          student_id: user.id,
          project_level: levelNumber,
          project_type: 'individual',
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setRequestId(result.groupId ?? result.request_id ?? requestId);
        setRequestStatus('pending');
        setSlot((prev) => ({ ...prev, status: 'pending' }));
        alert(`Request sent to your supervisor for Level ${levelNumber}!`);
      } else {
        alert(result.error || 'Submission failed.');
      }
    } catch (error) {
      alert('Server connection error.');
    }
  };

  const handleFinalSubmit = async () => {
    if (!requestId) return;
    try {
      const response = await fetch('http://localhost:5000/api/groups/final-submit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (response.ok) {
        setIsFinalized(true);
        alert('Sent to Project Coordinator successfully!');
      } else {
        const errData = await response.json();
        alert(errData.error || 'Submission failed.');
      }
    } catch (error) {
      alert('Error contacting server.');
    }
  };

  const supervisorResults = supervisors.filter(
    (s) => !supervisorSearch.trim() || s.name.toLowerCase().includes(supervisorSearch.trim().toLowerCase()),
  );

  // Once the coordinator has created the group, this tab's job is done —
  // hand off to Project Management the same way the Groups tab's "Start
  // Manage the Project" button does for a real group.
  if (activeGroup) {
    return (
      <div className="group-container">
        <div className="group-header">
          <h1>Request Supervisor</h1>
          <p>EduSync Project Management System</p>
        </div>
        <div
          className="rejection-reason-box"
          style={{
            backgroundColor: 'var(--eds-color-success-bg)',
            color: 'var(--eds-color-success-text)',
            border: '1px solid var(--eds-color-success-bg)',
          }}
        >
          <strong>Your individual project "{activeGroup.groupName}" is set up and ready.</strong>
        </div>
        <div className="action-area">
          <button
            type="button"
            className="btn-final"
            onClick={() =>
              navigate('/student/project-management', {
                state: { level: levelNumber, groupId: activeGroup.groupId, groupLeader: formData.leaderName },
              })
            }
          >
            Start Manage the Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-container">
      <div className="group-header">
        <h1>Request Supervisor</h1>
        <p>EduSync Project Management System — Individual Project</p>
      </div>

      <div className="form-grid">
        <div className="form-column">
          <div className="input-group">
            <label>Project Name</label>
            <input
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="Enter project title"
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            />
          </div>
          <div className="input-group">
            <label>Student</label>
            <input name="leaderName" value={formData.leaderName} disabled />
          </div>
          <div className="input-group">
            <label>Message (Optional)</label>
            <input
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Brief message to supervisor"
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            />
          </div>
        </div>

        <div className="form-column">
          <div className="input-group">
            <label>Supervisor</label>
          </div>

          <div className="supervisor-slot">
            <label className="supervisor-slot-label">Requested Supervisor</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={supervisorSearch}
                onChange={(e) => {
                  setSupervisorSearch(e.target.value);
                  setSlot((prev) => ({ ...prev, supervisorId: null }));
                }}
                onFocus={() => setSupervisorDropdownOpen(true)}
                onBlur={() => setTimeout(() => setSupervisorDropdownOpen(false), 150)}
                placeholder={supervisorsLoading ? 'Loading supervisors...' : 'Search supervisors by name...'}
                disabled={isLocked || supervisorsLoading}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--eds-color-border)', boxSizing: 'border-box' }}
              />
              {supervisorDropdownOpen && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px',
                    background: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)',
                    borderRadius: '6px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                  }}
                >
                  {supervisorResults.length === 0 ? (
                    <div style={{ padding: '10px 12px', color: 'var(--eds-color-text-faint)', fontSize: '13px' }}>
                      No supervisors match your search.
                    </div>
                  ) : (
                    supervisorResults.map((s) => (
                      <div
                        key={s.id}
                        onMouseDown={() => {
                          setSlot((prev) => ({ ...prev, supervisorId: s.id }));
                          setSupervisorSearch(s.name);
                        }}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                          background: s.id === slot.supervisorId ? 'var(--eds-color-primary-soft)' : 'transparent',
                        }}
                      >
                        {s.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRequest}
              disabled={!slot.supervisorId || isLocked}
              className={`btn-request ${slot.status} supervisor-slot-request-btn`}
            >
              {slot.status === 'none' && 'Request'}
              {slot.status === 'pending' && 'Waiting for Approval...'}
              {slot.status === 'approved' && 'Approved ✓'}
              {slot.status === 'rejected' && 'Rejected - Retry'}
            </button>

            {slot.status === 'rejected' && slot.rejectionReason && (
              <div className="rejection-reason-box">
                <strong>Rejected Reason:</strong> {slot.rejectionReason}
              </div>
            )}
          </div>

          {!supervisorsLoading && supervisorsError && (
            <p className="supervisor-list-status error">{supervisorsError}</p>
          )}
        </div>
      </div>

      <div className="action-area">
        {requestStatus === 'approved' && (
          <button onClick={handleFinalSubmit} disabled={isFinalized} className="btn-final">
            {isFinalized ? 'Submitted to Coordinator' : 'Final Submit to Coordinator'}
          </button>
        )}

        {requestStatus === 'pending' && !isFinalized && (
          <p className="supervisor-hint">Waiting for your supervisor to approve before you can submit to the coordinator.</p>
        )}
      </div>
    </div>
  );
};

export default RequestSupervisor;
