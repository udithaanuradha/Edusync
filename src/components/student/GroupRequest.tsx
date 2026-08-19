import React, { useState, useEffect } from 'react';
import './GroupRequest.css';

interface GroupRequestProps {
  levelNumber?: number;
}

interface Student {
  id: number;
  name: string;
  university_id: string;
}

const GroupRequest: React.FC<GroupRequestProps> = ({ levelNumber = 2 }) => {
  const [supervisors, setSupervisors] = useState<{ id: number, name: string }[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [rejectReason, setRejectReason] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null); 
  
  const [formData, setFormData] = useState({
    projectName: '',
    groupName: '',
    groupLeader: '',
    message: '',
  });

  // Multiple supervisors can now be targeted by a single request.
  const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<number[]>([]);

  // State for dynamic member selection
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string>('');

  // 1. Fetch supervisors and students on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // Fetch Supervisors — resolves supervisorsLoading in every case
    // (success, empty, or failure) so the UI never gets stuck on
    // "Loading supervisors..." forever.
    setSupervisorsLoading(true);
    setSupervisorsError('');
    fetch('http://localhost:5000/api/groups/supervisors', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Server returned ${res.status} while loading supervisors.`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setSupervisors(data);
        else if (data?.results) setSupervisors(data.results);
        else setSupervisors([]);
      })
      .catch(err => {
        console.error("Error fetching supervisors", err);
        setSupervisorsError('Could not load supervisors. Please refresh and try again.');
        setSupervisors([]);
      })
      .finally(() => setSupervisorsLoading(false));

    // Fetch Students for this level, scoped server-side to the same
    // department as the requesting student (?studentId=).
    fetch(`http://localhost:5000/api/users/level/${levelNumber}?studentId=${user?.id ?? ''}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter out the current user (leader) from the potential members list
          const filtered = data.filter((s: Student) => String(s.id) !== String(user?.id));
          setAllStudents(filtered);
        }
      })
      .catch(err => console.error("Error fetching students", err));

    checkExistingRequest();
  }, [levelNumber]);

  const checkExistingRequest = async () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (!user?.id) return;

    if (requestStatus === 'none') {
      setFormData(prev => ({ ...prev, groupLeader: user.name || '' }));
    }

    try {
      const res = await fetch(`http://localhost:5000/api/groups/my-requests/${user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      const requests = Array.isArray(data) ? data : [data];
      const latest = requests.find((r: any) => Number(r.project_level || r.level) === Number(levelNumber));

      if (latest) {
        setRequestStatus((latest.status || 'none') as 'none' | 'pending' | 'approved' | 'rejected');
        setRequestId(Number(latest.request_id || latest.id || null));
        setIsFinalized(Boolean(latest.is_final_submitted));
        setRejectReason(latest.rejection_reason || latest.reject_reason || latest.reason || '');
        
        setFormData({
          projectName: latest.request_message?.match(/Project:\s*([^\n.]+)/i)?.[1]?.trim() || '',
          groupName: latest.group_name || '',
          groupLeader: latest.members_list?.match(/Leader:\s*([^,\n]+)/i)?.[1]?.trim() || '',
          message: latest.request_message?.split('. ')?.[1] || '',
        });

        // If already approved, the approving supervisor is known; otherwise
        // restore whichever supervisors are still pending on this request.
        if (latest.supervisor_id) {
          setSelectedSupervisorIds([Number(latest.supervisor_id)]);
        } else if (Array.isArray(latest.supervisor_responses)) {
          setSelectedSupervisorIds(
            latest.supervisor_responses
              .filter((s: any) => s.status === 'pending')
              .map((s: any) => Number(s.supervisor_id))
          );
        }

        // Optional: If you want to parse members_list back into selectedMembers objects, you'd need more data
        // For now, we just keep it as is since they can't edit approved/pending requests anyway.
      }
    } catch (err) {
      console.error("Status check failed", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addMember = () => {
    if (!currentSelection) return;
    if (selectedMembers.length >= 4) {
      alert("Maximum 4 additional members allowed (Total 5 including leader).");
      return;
    }

    const student = allStudents.find(s => String(s.id) === currentSelection);
    if (student && !selectedMembers.some(m => m.id === student.id)) {
      setSelectedMembers([...selectedMembers, student]);
      setCurrentSelection(''); // Reset selection
    }
  };

  const removeMember = (id: number) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== id));
  };

  const toggleSupervisor = (id: number) => {
    setSelectedSupervisorIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleRequestSupervisor = async () => {
    if (selectedSupervisorIds.length === 0 || !formData.groupName) {
      alert("Please fill in the Group Name and select at least one Supervisor.");
      return;
    }

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    
    if (!user?.id) {
      alert("User information not found. Please log in again.");
      return;
    }

    const memberDetails = selectedMembers
      .map(s => `${s.name} (${s.university_id})`)
      .join(', ');

    try {
      const response = await fetch('http://localhost:5000/api/groups/request', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          group_name: formData.groupName,
          members_list: `Leader: ${formData.groupLeader}, Members: ${memberDetails}`,
          request_message: `Project: ${formData.projectName}. ${formData.message}`,
          supervisor_ids: selectedSupervisorIds,
          member_ids: selectedMembers.map(s => s.id),
          student_id: user.id,
          project_level: levelNumber
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setRequestStatus('pending');
        setRequestId(result.groupId); 
        alert(`Request for Level ${levelNumber} sent successfully!`);
      } else {
        alert(result.error || "Submission failed.");
      }
    } catch (error) {
      alert("Server connection error.");
    }
  };

  const handleFinalSubmit = async () => {
    if (!requestId) return;
    try {
      const response = await fetch('http://localhost:5000/api/groups/final-submit', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ request_id: requestId })
      });

      if (response.ok) {
        setIsFinalized(true);
        alert("Sent to Project Coordinator successfully!");
      } else {
        const errData = await response.json();
        alert(errData.error || "Submission failed.");
      }
    } catch (error) {
      alert("Error contacting server.");
    }
  };

  // Filter out already selected students from the dropdown
  const availableStudents = allStudents.filter(s => !selectedMembers.some(m => m.id === s.id));

  return (
    <div className="group-container">
      <div className="group-header">
        <h1>Project Group Formation</h1>
        <p>EduSync Project Management System</p>
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
            <label>Group Name</label>
            <input 
              name="groupName" 
              value={formData.groupName}
              onChange={handleInputChange} 
              placeholder="e.g. CYGEN" 
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            />
          </div>
          <div className="input-group">
            <label>Group Leader</label>
            <input 
              name="groupLeader" 
              value={formData.groupLeader}
              onChange={handleInputChange} 
              placeholder="Full Name" 
              disabled={true}
            />
          </div>
        </div>

        <div className="form-column">
          <div className="input-group">
            <label>Add Group Members (Max 4)</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <select
                value={currentSelection}
                onChange={(e) => setCurrentSelection(e.target.value)}
                disabled={requestStatus !== 'none' && requestStatus !== 'rejected' || selectedMembers.length >= 4}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="">Choose a student...</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.university_id}</option>
                ))}
              </select>
              <button 
                type="button"
                onClick={addMember}
                disabled={!currentSelection || requestStatus !== 'none' && requestStatus !== 'rejected'}
                style={{ padding: '0 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>

            <div className="selected-members-list" style={{ minHeight: '100px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              {selectedMembers.length === 0 && <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '30px' }}>No members added yet.</p>}
              {selectedMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{member.name} ({member.university_id})</span>
                  {(requestStatus === 'none' || requestStatus === 'rejected') && (
                    <button 
                      onClick={() => removeMember(member.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <div className="supervisor-select-header">
              <label style={{ marginBottom: 0 }}>Supervisors (select one or more)</label>
              <span className={`supervisor-count-badge ${selectedSupervisorIds.length > 0 ? 'has-selection' : ''}`}>
                {selectedSupervisorIds.length} supervisor{selectedSupervisorIds.length === 1 ? '' : 's'} selected
              </span>
            </div>

            <div className="supervisor-list">
              {supervisorsLoading && (
                <p className="supervisor-list-status">Loading supervisors...</p>
              )}
              {!supervisorsLoading && supervisorsError && (
                <p className="supervisor-list-status error">{supervisorsError}</p>
              )}
              {!supervisorsLoading && !supervisorsError && supervisors.length === 0 && (
                <p className="supervisor-list-status">No supervisors found.</p>
              )}
              {!supervisorsLoading && supervisors.map(s => {
                const isSelected = selectedSupervisorIds.includes(s.id);
                const isLocked = requestStatus !== 'none' && requestStatus !== 'rejected';
                return (
                  <label
                    key={s.id}
                    className={`supervisor-row ${isSelected ? 'selected' : ''} ${isLocked ? 'disabled-row' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSupervisor(s.id)}
                      disabled={isLocked}
                    />
                    <span className="supervisor-row-name">{s.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedSupervisorIds.length > 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                The request is approved as soon as one supervisor accepts.
              </p>
            )}
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
      </div>

      <div className="action-area">
        <button
          onClick={handleRequestSupervisor}
          disabled={requestStatus === 'pending' || requestStatus === 'approved' || isFinalized}
          className={`btn-request ${requestStatus}`}
        >
          {requestStatus === 'none' && "Request Supervisor"}
          {requestStatus === 'pending' && "Waiting for Approval..."}
          {requestStatus === 'approved' && "Supervisor Accepted ✓"}
          {requestStatus === 'rejected' && "Rejected - Try Again"}
        </button>

        {requestStatus === 'approved' && (
          <button
            onClick={handleFinalSubmit}
            disabled={isFinalized}
            className="btn-final"
          >
            {isFinalized ? "Submitted to Coordinator" : "Final Submit to Coordinator"}
          </button>
        )}

        {requestStatus === 'rejected' && rejectReason && (
          <div className="rejection-reason-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <strong>Rejected Reason:</strong> {rejectReason}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupRequest;