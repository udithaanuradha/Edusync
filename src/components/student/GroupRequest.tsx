 import React, { useState, useEffect } from 'react';
import './GroupRequest.css';

const GroupRequest = () => {
  const [supervisors, setSupervisors] = useState<{ id: number, name: string }[]>([]);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [rejectReason, setRejectReason] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null); 
  
  const [formData, setFormData] = useState({
    projectName: '',
    groupName: '',
    groupLeader: '',
    members: '',
    message: '',
    primarySupervisor: '',
  });

  // 1. Fetch supervisors on load
  useEffect(() => {
    fetch('http://localhost:5000/api/groups/supervisors', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setSupervisors(data);
        } else if (data?.results) {
          setSupervisors(data.results);
        }
      })
      .catch(err => console.error("Error fetching supervisors", err));
      
    // Optional: Fetch existing request status on load to persist state
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (!user?.id) return;

    try {
      const endpoints = [
        `http://localhost:5000/api/groups/student/${user.id}/requests`,
        `http://localhost:5000/api/groups/student/${user.id}`,
        `http://localhost:5000/api/groups/my-requests/${user.id}`,
        `http://localhost:5000/api/groups/my-status/${user.id}`,
      ];

      for (const endpoint of endpoints) {
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) continue;

        const data = await res.json();
        const latest = Array.isArray(data)
          ? data[0]
          : Array.isArray(data?.requests)
            ? data.requests[0]
            : data;

        if (!latest) continue;

        setRequestStatus((latest.status || 'none') as 'none' | 'pending' | 'approved' | 'rejected');
        setRequestId(Number(latest.request_id || latest.requestId || latest.id || null));
        setIsFinalized(Boolean(latest.is_final_submitted));
        setRejectReason(latest.reject_reason || latest.rejection_reason || latest.reason || latest.decision_message || '');
        break;
      }
    } catch (err) {
      console.error("Status check failed", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. Send request to Supervisor
  const handleRequestSupervisor = async () => {
    if (!formData.primarySupervisor || !formData.groupName) {
      alert("Please fill in the Group Name and select a Supervisor.");
      return;
    }

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    
    // Safety check for user ID and Level
    if (!user?.id || !user?.level) {
      alert("User information not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/groups/request', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          group_name: formData.groupName,
          members_list: `Leader: ${formData.groupLeader}, Members: ${formData.members}`,
          request_message: `Project: ${formData.projectName}. ${formData.message}`,
          supervisor_id: formData.primarySupervisor,
          student_id: user.id,
          project_level: user.level // Dynamically sending the student's level
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setRequestStatus('pending');
        setRequestId(result.groupId); 
        alert(`Request for Level ${user.level} sent successfully!`);
      } else {
        alert(result.error || "Submission failed.");
      }
    } catch (error) {
      alert("Server connection error.");
    }
  };

  // 3. Final Submit to Coordinator
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
        alert(errData.error || "Submission failed. Supervisor must approve first.");
      }
    } catch (error) {
      alert("Error contacting server.");
    }
  };

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
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            />
          </div>
        </div>

        <div className="form-column">
          <div className="input-group">
            <label>Members List</label>
            <textarea 
              name="members" 
              value={formData.members}
              onChange={handleInputChange} 
              rows={3} 
              placeholder="Member names & IDs" 
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            />
          </div>
          <div className="input-group">
            <label>Primary Supervisor</label>
            <select 
              name="primarySupervisor" 
              value={formData.primarySupervisor}
              onChange={handleInputChange}
              disabled={requestStatus !== 'none' && requestStatus !== 'rejected'}
            >
              <option value="">Select a Supervisor</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
          <div className="rejection-reason-box">
            <strong>Rejected Reason:</strong> {rejectReason}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupRequest;