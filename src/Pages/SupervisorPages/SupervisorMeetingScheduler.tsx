import React, { useState } from "react";
import { Users, Edit3, Trash2, CalendarClock, X, Plus } from "lucide-react";
import "./SupervisorMeetingScheduler.css";

// --- Mock Data ---
const initialRequests = [
  { id: 1, group: "Group 1", topic: "Project Proposal Review", date: "2026-08-20", time: "10:00", status: "pending" },
  { id: 2, group: "Group 4", topic: "Code Review Assistance", date: "2026-08-21", time: "14:30", status: "pending" },
];

const initialMeetings = [
  { id: 3, group: "Group 2", topic: "Interim Presentation Prep", date: "2026-08-18", time: "09:00", location: "Online (Zoom)", status: "scheduled" },
  { id: 4, group: "Group 3", topic: "Database Architecture", date: "2026-08-19", time: "13:00", location: "Room 402", status: "scheduled" },
];

const SupervisorMeetingScheduler: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "requests">("upcoming");
  const [requests, setRequests] = useState(initialRequests);
  const [meetings, setMeetings] = useState(initialMeetings);
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    group: "",
    topic: "",
    date: "",
    time: "",
    location: "",
  });

  const handleOpenModal = (meeting: any = null) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setFormData({
        group: meeting.group,
        topic: meeting.topic,
        date: meeting.date,
        time: meeting.time,
        location: meeting.location || "",
      });
    } else {
      setEditingMeeting(null);
      setFormData({ group: "", topic: "", date: "", time: "", location: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMeeting(null);
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeeting) {
      setMeetings(meetings.map(m => m.id === editingMeeting.id ? { ...m, ...formData } : m));
    } else {
      setMeetings([...meetings, { id: Date.now(), ...formData, status: "scheduled" }]);
    }
    handleCloseModal();
  };

  const handleApproveRequest = (request: any) => {
    setRequests(requests.filter(r => r.id !== request.id));
    setMeetings([...meetings, { ...request, id: Date.now(), location: "TBD", status: "scheduled" }]);
  };

  const handleDeclineRequest = (id: number) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  const handleDeleteMeeting = (id: number) => {
    setMeetings(meetings.filter(m => m.id !== id));
  };

  return (
    <>
      <button
        type="button"
        className="freeze-date-btn task-scheduler-btn"
        onClick={() => setIsOpen(true)}
      >
        <CalendarClock size={16} /> Meeting Scheduler
      </button>

      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="schedule-drawer meeting-scheduler-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Supervisor Tools</p>
                <h3>Meeting Scheduler</h3>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-summary-card freeze-card">
              <span className="drawer-summary-label">Manage Meetings</span>
              <strong>Upcoming & Requests</strong>
              <span>
                Schedule and reschedule meetings with your assigned project groups or review student requests.
              </span>
            </div>

            <div className="scheduler-header-section" style={{ padding: '0 1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="schedule-new-btn" onClick={() => handleOpenModal()} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                <Plus size={16} style={{ marginRight: '6px' }} /> Schedule Meeting
              </button>
            </div>

            <div className="scheduler-tabs" style={{ padding: '0 1.5rem' }}>
              <button 
                className={`scheduler-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming Meetings
                {meetings.length > 0 && <span className="tab-badge">{meetings.length}</span>}
              </button>
              <button 
                className={`scheduler-tab ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                Student Requests
                {requests.length > 0 && <span className="tab-badge alert-badge">{requests.length}</span>}
              </button>
            </div>

            <div className="scheduler-content" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'upcoming' && (
                <div className="meetings-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {meetings.length === 0 ? (
                    <div className="empty-state">No upcoming meetings scheduled.</div>
                  ) : (
                    meetings.map(meeting => (
                      <div key={meeting.id} className="meeting-card glass-card">
                        <div className="meeting-card-header">
                          <h3 className="meeting-group">
                            <Users size={16} /> {meeting.group}
                          </h3>
                          <div className="meeting-actions">
                            <button className="icon-btn edit" onClick={() => handleOpenModal(meeting)} title="Edit/Reschedule">
                              <Edit3 size={16} />
                            </button>
                            <button className="icon-btn delete" onClick={() => handleDeleteMeeting(meeting.id)} title="Cancel Meeting">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h4 className="meeting-topic">{meeting.topic}</h4>
                        <div className="meeting-details">
                          <div className="detail-item">
                            <span className="detail-label">Date:</span> {meeting.date}
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time:</span> {meeting.time}
                          </div>
                          {meeting.location && (
                            <div className="detail-item">
                              <span className="detail-label">Location:</span> {meeting.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="requests-list">
                  {requests.length === 0 ? (
                    <div className="empty-state">No pending student requests.</div>
                  ) : (
                    requests.map(request => (
                      <div key={request.id} className="request-card glass-card">
                        <div className="request-info">
                          <div className="request-header-row">
                            <h3 className="meeting-group"><Users size={16} /> {request.group}</h3>
                            <span className="status-badge pending">Pending</span>
                          </div>
                          <h4 className="meeting-topic">{request.topic}</h4>
                          <div className="meeting-details">
                            <div className="detail-item">
                              <span className="detail-label">Preferred Date:</span> {request.date}
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Preferred Time:</span> {request.time}
                            </div>
                          </div>
                        </div>
                        <div className="request-actions">
                          <button className="action-btn approve" onClick={() => handleApproveRequest(request)}>
                            Approve
                          </button>
                          <button className="action-btn decline" onClick={() => handleDeclineRequest(request.id)}>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>

          {showModal && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content glass-modal drawer-form" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{editingMeeting ? "Reschedule Meeting" : "Schedule New Meeting"}</h3>
                  <button className="close-btn" onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSaveMeeting}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Project Group</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Group 5" 
                      value={formData.group}
                      onChange={e => setFormData({...formData, group: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Meeting Topic</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Code Review"
                      value={formData.topic}
                      onChange={e => setFormData({...formData, topic: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                  <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Date</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Time</label>
                      <input 
                        type="time" 
                        required 
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Location / Link</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Zoom Link or Room 101"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                  <div className="modal-actions drawer-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="drawer-secondary-btn" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit" className="drawer-primary-btn">{editingMeeting ? "Save Changes" : "Schedule Meeting"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupervisorMeetingScheduler;
