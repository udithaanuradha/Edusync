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

type SlotStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface SupervisorSlot {
  supervisorId: number | null;
  status: SlotStatus;
  rejectionReason: string;
}

const emptySlot = (): SupervisorSlot => ({ supervisorId: null, status: 'none', rejectionReason: '' });

const GroupRequest: React.FC<GroupRequestProps> = ({ levelNumber = 2 }) => {
  const [supervisors, setSupervisors] = useState<{ id: number, name: string }[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [supervisorsError, setSupervisorsError] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  // Overall request status mirrors group_requests.status on the backend.
  // It only becomes 'approved' once BOTH supervisor slots below are approved.
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isFinalized, setIsFinalized] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  // Set when the student already belongs to a real, live group at this level
  // (via /api/groups/my-status) — takes priority over requestStatus so the
  // form stays locked even if a stale/mismatched request row exists.
  const [activeGroup, setActiveGroup] = useState<{ groupId: number; groupName: string } | null>(null);

  const [formData, setFormData] = useState({
    projectName: '',
    groupName: '',
    groupLeader: '',
    message: '',
  });

  // Exactly two independent supervisor slots. Each can be requested on its
  // own (its own "Request" button) — both must reach 'approved' before the
  // group can be submitted to the coordinator.
  const [slots, setSlots] = useState<[SupervisorSlot, SupervisorSlot]>([emptySlot(), emptySlot()]);

  // State for dynamic member selection
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string>('');
  // Search text narrows which <option>s show in the member/supervisor
  // <select>s below — the select + Add/Request flow itself is unchanged,
  // this only filters what's offered.
  const [memberSearch, setMemberSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState<[string, string]>(['', '']);
  // Whether each typeahead's suggestion list is currently shown (opened on
  // focus, closed on blur — with a short delay so a click on a suggestion
  // registers before the list unmounts).
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState<[boolean, boolean]>([false, false]);
  // university_ids parsed out of a saved request's members_list, waiting on
  // allStudents to finish loading (separate fetch, may resolve after
  // checkExistingRequest) so they can be matched back into full Student
  // objects for selectedMembers — see the restore effect below.
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);

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
    // department as the requesting student (?studentId=) — this endpoint
    // also excludes students who already belong to a live group, unlike
    // the old /api/users/level one, so they can no longer be picked here.
    fetch(`http://localhost:5000/api/groups/available-members/${levelNumber}?studentId=${user?.id ?? ''}`, {
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

    // Check whether the student already belongs to a real, live group at
    // this level — if so, the form stays locked regardless of requestStatus.
    fetch(`http://localhost:5000/api/groups/my-status/${user?.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const groups = Array.isArray(data) ? data : [];
        const match = groups.find((g: any) => Number(g.level) === Number(levelNumber));
        setActiveGroup(match ? { groupId: match.groupId, groupName: match.groupName } : null);
      })
      .catch(err => {
        console.error("Error checking active group", err);
        setActiveGroup(null);
      });

    checkExistingRequest();
  }, [levelNumber]);

  // Runs once both pieces are in: the saved request's member university_ids
  // (set by checkExistingRequest) and the student list to match them against
  // (a separate, independently-timed fetch above). Clears pendingMemberIds
  // once matched so it doesn't re-run and clobber later manual add/remove.
  useEffect(() => {
    if (pendingMemberIds.length === 0 || allStudents.length === 0) return;

    const matched = allStudents.filter((s) => pendingMemberIds.includes(s.university_id));
    if (matched.length > 0) {
      setSelectedMembers(matched);
    }
    setPendingMemberIds([]);
  }, [pendingMemberIds, allStudents]);

  // The supervisor search boxes are plain text inputs now (not a native
  // <select>, which used to derive its own display straight from
  // slot.supervisorId) — so when checkExistingRequest restores a saved
  // request's slots on load, the matching name needs to be filled in here
  // too, once the (separately-fetched) supervisors list has arrived. Only
  // fills a slot whose search box is still empty, so it never overwrites
  // something the student is actively typing.
  useEffect(() => {
    if (supervisors.length === 0) return;
    setSupervisorSearch(prev => {
      const next = [...prev] as [string, string];
      let changed = false;
      ([0, 1] as const).forEach(i => {
        if (!next[i] && slots[i].supervisorId) {
          const match = supervisors.find(s => s.id === slots[i].supervisorId);
          if (match) {
            next[i] = match.name;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [slots, supervisors]);

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

        setFormData({
          projectName: latest.request_message?.match(/Project:\s*([^\n.]+)/i)?.[1]?.trim() || '',
          groupName: latest.group_name || '',
          groupLeader: latest.members_list?.match(/Leader:\s*([^,\n]+)/i)?.[1]?.trim() || '',
          message: latest.request_message?.split('. ')?.[1] || '',
        });

        // members_list looks like "Leader: X, Members: Name1 (id1), Name2 (id2)"
        // (see handleRequestSlot) — pull the university_ids back out so the
        // "Add Group Members" list reflects the group's real, saved members
        // instead of resetting to empty on every reload. Queued in
        // pendingMemberIds because allStudents (a separate fetch) may not
        // have loaded yet; the restore effect below matches them once it has.
        const membersSegment = latest.members_list?.match(/Members:\s*(.+)$/i)?.[1] || '';
        const memberIds = Array.from(membersSegment.matchAll(/\(([^()]+)\)/g)).map((m) => m[1].trim());
        setPendingMemberIds(memberIds);

        // Populate the two supervisor slots from this request's per-supervisor
        // responses (at most 2, since the form only ever sends 2). A
        // 'cancelled' response (the other slot, after one supervisor
        // rejected) is shown the same way as 'rejected' so both slots
        // re-open for the student to retry.
        const responses = Array.isArray(latest.supervisor_responses) ? latest.supervisor_responses : [];
        const nextSlots: [SupervisorSlot, SupervisorSlot] = [emptySlot(), emptySlot()];
        responses.slice(0, 2).forEach((r: any, i: number) => {
          const status = r.status === 'cancelled' ? 'rejected' : r.status;
          nextSlots[i] = {
            supervisorId: Number(r.supervisor_id),
            status: (status || 'pending') as SlotStatus,
            rejectionReason: r.rejection_reason || '',
          };
        });
        setSlots(nextSlots);
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
      setMemberSearch(''); // Clear the search box so it's ready for the next student
    }
  };

  const removeMember = (id: number) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== id));
  };

  const setSlotSupervisor = (index: 0 | 1, supervisorId: number | null) => {
    setSlots(prev => {
      const next = [...prev] as [SupervisorSlot, SupervisorSlot];
      next[index] = { ...next[index], supervisorId };
      return next;
    });
  };

  const handleRequestSlot = async (index: 0 | 1) => {
    const slot = slots[index];
    if (!slot.supervisorId) {
      alert("Please choose a supervisor for this slot first.");
      return;
    }
    if (!formData.groupName) {
      alert("Please fill in the Group Name first.");
      return;
    }
    const otherSlot = slots[index === 0 ? 1 : 0];
    if (otherSlot.supervisorId === slot.supervisorId) {
      alert("Please choose two different supervisors.");
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
          supervisor_ids: [slot.supervisorId],
          member_ids: selectedMembers.map(s => s.id),
          student_id: user.id,
          project_level: levelNumber
        })
      });

      const result = await response.json();

      if (response.ok) {
        setRequestId(result.groupId ?? result.request_id ?? requestId);
        setRequestStatus('pending');
        setSlots(prev => {
          const next = [...prev] as [SupervisorSlot, SupervisorSlot];
          next[index] = { ...next[index], status: 'pending' };
          return next;
        });
        alert(`Request sent to supervisor for Level ${levelNumber}!`);
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
  const memberSearchResults = memberSearch.trim()
    ? availableStudents.filter(s => s.name.toLowerCase().includes(memberSearch.trim().toLowerCase()))
    : availableStudents;

  const setSlotSupervisorSearch = (index: 0 | 1, value: string) => {
    setSupervisorSearch(prev => {
      const next = [...prev] as [string, string];
      next[index] = value;
      return next;
    });
  };

  const setSlotDropdownOpen = (index: 0 | 1, open: boolean) => {
    setSupervisorDropdownOpen(prev => {
      const next = [...prev] as [boolean, boolean];
      next[index] = open;
      return next;
    });
  };

  // activeGroup takes priority over requestStatus — a student already in a
  // real, live group sees a locked notice instead of the form, regardless
  // of what requestStatus currently holds.
  if (activeGroup) {
    return (
      <div className="group-container">
        <div className="group-header">
          <h1>Project Group Formation</h1>
          <p>EduSync Project Management System</p>
        </div>
        <div className="rejection-reason-box" style={{ backgroundColor: 'var(--eds-color-primary-soft-border)', color: 'var(--eds-color-primary-hover)', border: '1px solid var(--eds-color-primary-soft-border)' }}>
          <strong>You're already part of Group: {activeGroup.groupName}.</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="group-container">
      <div className="group-header">
        <h1>Project Group Formation</h1>
        <p>EduSync Project Management System</p>
      </div>

      <div className="form-grid">
        {/* LEFT COLUMN: project details, members, message */}
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

          <div className="input-group">
            <label>Add Group Members (Max 4)</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setCurrentSelection(''); }}
                  onFocus={() => setMemberDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                  placeholder="Search students by name..."
                  disabled={requestStatus !== 'none' && requestStatus !== 'rejected' || selectedMembers.length >= 4}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--eds-color-border)', boxSizing: 'border-box' }}
                />
                {memberDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', background: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '6px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                    {memberSearchResults.length === 0 ? (
                      <div style={{ padding: '10px 12px', color: 'var(--eds-color-text-faint)', fontSize: '13px' }}>No students match your search.</div>
                    ) : (
                      memberSearchResults.map(s => (
                        <div
                          key={s.id}
                          onMouseDown={() => { setCurrentSelection(String(s.id)); setMemberSearch(s.name); }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            background: String(s.id) === currentSelection ? 'var(--eds-color-primary-soft)' : 'transparent',
                          }}
                        >
                          {s.name} - {s.university_id}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={addMember}
                disabled={!currentSelection || requestStatus !== 'none' && requestStatus !== 'rejected'}
                style={{ padding: '0 20px', backgroundColor: 'var(--eds-color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>

            <div className="selected-members-list" style={{ minHeight: '100px', padding: '10px', border: '1px solid var(--eds-color-border)', borderRadius: '8px', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
              {selectedMembers.length === 0 && <p style={{ color: 'var(--eds-color-text-faint)', fontSize: '14px', textAlign: 'center', marginTop: '30px' }}>No members added yet.</p>}
              {selectedMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', border: '1px solid var(--eds-color-border)', borderRadius: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{member.name} ({member.university_id})</span>
                  {(requestStatus === 'none' || requestStatus === 'rejected') && (
                    <button
                      onClick={() => removeMember(member.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--eds-color-danger-solid)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
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

        {/* RIGHT COLUMN: both supervisor slots, each with its own Request button */}
        <div className="form-column">
          <div className="input-group">
            <label>Supervisors — both must approve</label>
          </div>

          {([0, 1] as const).map((i) => {
            const slot = slots[i];
            const otherId = slots[i === 0 ? 1 : 0].supervisorId;
            const isLocked = slot.status !== 'none' && slot.status !== 'rejected';
            return (
              <div className="supervisor-slot" key={i}>
                <label className="supervisor-slot-label">Supervisor {i + 1}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={supervisorSearch[i]}
                    onChange={(e) => { setSlotSupervisorSearch(i, e.target.value); setSlotSupervisor(i, null); }}
                    onFocus={() => setSlotDropdownOpen(i, true)}
                    onBlur={() => setTimeout(() => setSlotDropdownOpen(i, false), 150)}
                    placeholder={supervisorsLoading ? 'Loading supervisors...' : 'Search supervisors by name...'}
                    disabled={isLocked || supervisorsLoading}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--eds-color-border)', boxSizing: 'border-box' }}
                  />
                  {supervisorDropdownOpen[i] && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', background: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '6px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                      {supervisors
                        .filter(s => s.id !== otherId)
                        .filter(s => !supervisorSearch[i].trim() || s.name.toLowerCase().includes(supervisorSearch[i].trim().toLowerCase()))
                        .length === 0 ? (
                        <div style={{ padding: '10px 12px', color: 'var(--eds-color-text-faint)', fontSize: '13px' }}>No supervisors match your search.</div>
                      ) : (
                        supervisors
                          .filter(s => s.id !== otherId)
                          .filter(s => !supervisorSearch[i].trim() || s.name.toLowerCase().includes(supervisorSearch[i].trim().toLowerCase()))
                          .map(s => (
                            <div
                              key={s.id}
                              onMouseDown={() => { setSlotSupervisor(i, s.id); setSlotSupervisorSearch(i, s.name); }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '14px',
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
                  onClick={() => handleRequestSlot(i)}
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
            );
          })}

          {!supervisorsLoading && supervisorsError && (
            <p className="supervisor-list-status error">{supervisorsError}</p>
          )}
        </div>
      </div>

      <div className="action-area">
        {requestStatus === 'approved' && (
          <button
            onClick={handleFinalSubmit}
            disabled={isFinalized}
            className="btn-final"
          >
            {isFinalized ? "Submitted to Coordinator" : "Final Submit to Coordinator"}
          </button>
        )}

        {requestStatus === 'pending' && !isFinalized && (
          <p className="supervisor-hint">
            Waiting for both supervisors to approve before you can submit to the coordinator.
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupRequest;
