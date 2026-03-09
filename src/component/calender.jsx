
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import './Calendar.css';

const Calendar = ({ initialOpenSchedule = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11)); // December 2025
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Mock data for frozen dates (lecture days, assignments)
  const frozenDates = [
    { date: '2025-12-23', type: 'lecture', title: 'Advanced Programming Lecture' },
    { date: '2025-12-24', type: 'assignment', title: 'Database Assignment Due' },
    { date: '2025-12-26', type: 'lecture', title: 'Software Engineering Lecture' },
    { date: '2025-12-30', type: 'assignment', title: 'Web Development Assignment Due' },
  ];

  // Mock data for evaluation panels
  const evaluationPanels = [
    { date: '2025-12-22', supervisor: 'Dr. Smith', level: 'Level 2', stage: 'Code Review', time: '10:00 AM' },
    { date: '2025-12-25', supervisor: 'Dr. Johnson', level: 'Level 3', stage: 'Interim', time: '2:00 PM' },
    { date: '2025-12-27', supervisor: 'Dr. Williams', level: 'Level 1', stage: 'Proposal Stage', time: '9:00 AM' },
  ];

  // Mock data for meetings
  const [meetings, setMeetings] = useState([
    { date: '2025-12-20', title: 'Meeting with Admin', time: '10:00 AM' },
    { date: '2025-12-20', title: 'Meeting with Level 2 Group Cygen', time: '11:30 AM' },
  ]);

  const location = useLocation();
  const navState = location.state || null;

  // Supervisor's groups (mock) - in real app, fetch from API
  const [groups] = useState([
    { id: 1, name: 'Group A' },
    { id: 2, name: 'Group B' },
    { id: 3, name: 'Group C' },
  ]);

  const [selectedGroup, setSelectedGroup] = useState(navState?.groupName || null);
  const [showScheduleBox, setShowScheduleBox] = useState(Boolean(navState?.groupName) || Boolean(initialOpenSchedule));
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleMessage, setScheduleMessage] = useState('');

  useEffect(() => {
    if (navState?.groupName) {
      setSelectedGroup(navState.groupName);
      setShowScheduleBox(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (dateStr) => {
    const frozen = frozenDates.filter(e => e.date === dateStr);
    const panels = evaluationPanels.filter(e => e.date === dateStr);
    return { frozen, panels };
  };

  const getMeetingsForDate = (dateStr) => {
    return meetings.filter(m => m.date === dateStr);
  };

  const isDateFrozen = (dateStr) => {
    return frozenDates.some(e => e.date === dateStr);
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const { frozen, panels } = getEventsForDate(dateStr);
      const isFrozen = isDateFrozen(dateStr);
      const today = new Date();
      const isToday = today.getDate() === day && 
                     today.getMonth() === currentDate.getMonth() && 
                     today.getFullYear() === currentDate.getFullYear();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isFrozen ? 'frozen' : ''} ${isToday ? 'today' : ''} ${panels.length > 0 ? 'has-panel' : ''}`}
          onClick={() => setSelectedDate(dateStr)}
        >
          <span className="day-number">{day}</span>
          {frozen.length > 0 && (
            <div className="event-indicators">
              {frozen.map((event, idx) => (
                <span key={idx} className={`event-dot ${event.type}`} title={event.title}></span>
              ))}
            </div>
          )}
          {panels.length > 0 && (
            <div className="panel-indicator">
              {panels.length} Panel{panels.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : { frozen: [], panels: [] };
  const selectedMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h2>Calendar</h2>
          <p>Manage evaluation panels, frozen dates, and project schedules</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowScheduleBox(true)}>
            <Plus size={16} />
            Schedule Meeting
          </button>
          <button className="btn-primary" onClick={() => setShowAddEvent(true)}>
            <Plus size={20} />
            Freeze Date
          </button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-main">
          <div className="calendar-header">
            <button className="nav-btn" onClick={previousMonth}>
              <ChevronLeft size={20} />
            </button>
            <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <button className="nav-btn" onClick={nextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="day-header">Sun</div>
            <div className="day-header">Mon</div>
            <div className="day-header">Tue</div>
            <div className="day-header">Wed</div>
            <div className="day-header">Thu</div>
            <div className="day-header">Fri</div>
            <div className="day-header">Sat</div>
            {renderCalendarDays()}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot lecture"></span>
              <span>Lecture Day (Frozen)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot assignment"></span>
              <span>Assignment Due (Frozen)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot panel"></span>
              <span>Evaluation Panel</span>
            </div>
          </div>
        </div>

        <div className="calendar-sidebar">
          {showScheduleBox && (
            <div className="sidebar-section schedule-box">
              <h3>Schedule Meeting</h3>
              <div className="form-group">
                <label>Group</label>
                <select className="form-input" value={selectedGroup || ''} onChange={(e) => setSelectedGroup(e.target.value)}>
                  <option value="">-- Select group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-input" value={selectedDate || ''} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" className="form-input" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea className="form-input" rows={3} value={scheduleMessage} onChange={(e) => setScheduleMessage(e.target.value)} placeholder="Message to the group" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowScheduleBox(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => {
                  if (!selectedGroup) { alert('Select a group'); return; }
                  if (!selectedDate) { alert('Select a date'); return; }
                  // format time to am/pm
                  const timeVal = scheduleTime;
                  const [hh, mm] = timeVal.split(':');
                  const hour = parseInt(hh, 10);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = ((hour + 11) % 12) + 1;
                  const formattedTime = `${hour12}:${mm} ${ampm}`;

                  const newMeeting = { date: selectedDate, title: `Meeting with ${selectedGroup}`, time: formattedTime };
                  setMeetings(prev => [newMeeting, ...prev]);

                  // pretend to send message
                  if (scheduleMessage.trim()) {
                    // in real app, call API to send message
                    alert(`Message sent to ${selectedGroup}: "${scheduleMessage}"`);
                  }

                  alert(`Meeting scheduled for ${selectedGroup} on ${selectedDate} at ${formattedTime}`);
                  setShowScheduleBox(false);
                  setScheduleMessage('');
                }}>Schedule &amp; Send</button>
              </div>
            </div>
          )}
          <div className="sidebar-section">
            <h3>Upcoming Panels</h3>
            <div className="panels-list">
              {evaluationPanels.map((panel, idx) => (
                <div key={idx} className="panel-card">
                  <div className="panel-date">
                    {new Date(panel.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="panel-details">
                    <h4>{panel.stage}</h4>
                    <p>{panel.level} • {panel.supervisor}</p>
                    <span className="panel-time">{panel.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Meetings</h3>
            <div className="meetings-list">
              {meetings.map((meeting, idx) => (
                <div key={idx} className="meeting-card">
                  <div className="meeting-date">
                    {new Date(meeting.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="meeting-details">
                    <h4>{meeting.title}</h4>
                    <span className="meeting-time">{meeting.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="sidebar-section">
              <h3>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              
              {selectedDateEvents.frozen.length > 0 && (
                <div className="date-events">
                  <h4>Frozen Events</h4>
                  {selectedDateEvents.frozen.map((event, idx) => (
                    <div key={idx} className={`event-item ${event.type}`}>
                      <span className="event-type">{event.type}</span>
                      <span>{event.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedDateEvents.panels.length > 0 && (
                <div className="date-events">
                  <h4>Evaluation Panels</h4>
                  {selectedDateEvents.panels.map((panel, idx) => (
                    <div key={idx} className="event-item panel">
                      <span className="event-type">{panel.level}</span>
                      <span>{panel.stage}</span>
                      <span className="event-time">{panel.time}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedDateEvents.frozen.length === 0 && selectedDateEvents.panels.length === 0 && (
                <p className="no-events">No events on this date. Available for evaluation panels.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Freeze Date</h3>
              <button className="close-btn" onClick={() => setShowAddEvent(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-input" />
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <select className="form-input">
                  <option value="lecture">Lecture Day</option>
                  <option value="assignment">Assignment Due</option>
                  <option value="exam">Exam</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input type="text" className="form-input" placeholder="Event title" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddEvent(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => setShowAddEvent(false)}>
                Freeze Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
