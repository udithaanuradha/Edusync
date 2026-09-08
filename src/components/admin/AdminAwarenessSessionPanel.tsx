import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  Send, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  ExternalLink
} from 'lucide-react';
import './AdminAwarenessSessionPanel.css';

interface AwarenessSession {
  id: number;
  title: string;
  description: string;
  target_levels: string;
  degree_program: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  session_type: 'online' | 'physical' | 'hybrid';
  venue: string | null;
  meeting_link: string | null;
  resource_person_name: string;
  resource_person_title: string | null;
  author_name: string;
  created_at: string;
  days_remaining: number;
  reminderBadge: string | null;
  reminderType: string;
  isToday: boolean;
  is2DaysAlert: boolean;
}

const isValidMeetingUrl = (linkStr: string): boolean => {
  if (!linkStr || !linkStr.trim()) return false;
  const trimmed = linkStr.trim();
  let formatted = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    formatted = 'https://' + trimmed;
  }
  const urlPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i;
  if (!urlPattern.test(formatted)) return false;
  try {
    const parsed = new URL(formatted);
    return parsed.hostname.includes('.') && parsed.hostname.split('.').pop()!.length >= 2;
  } catch {
    return false;
  }
};

const formatTime12h = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '';
  if (/am|pm/i.test(trimmed)) return trimmed;

  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2).padStart(2, '0');
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHour = String(hours).padStart(2, '0');
      return `${formattedHour}:${minutes} ${ampm}`;
    }
  }
  return trimmed;
};

const AdminAwarenessSessionPanel: React.FC = () => {
  const [sessions, setSessions] = useState<AwarenessSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1, 2]);
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>(['IT', 'ITM', 'AI']);
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sessionType, setSessionType] = useState<'online' | 'physical'>('online');
  const [venue, setVenue] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [resourcePersonName, setResourcePersonName] = useState('');
  const [resourcePersonTitle, setResourcePersonTitle] = useState('');

  // Fetch all sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/awareness-sessions?role=admin');
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load awareness sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleLevelToggle = (levelNum: number) => {
    if (selectedLevels.includes(levelNum)) {
      setSelectedLevels(selectedLevels.filter(l => l !== levelNum));
    } else {
      setSelectedLevels([...selectedLevels, levelNum].sort());
    }
  };

  const handleSelectAllLevels = () => {
    if (selectedLevels.length === 4) {
      setSelectedLevels([]);
    } else {
      setSelectedLevels([1, 2, 3, 4]);
    }
  };

  const handleDegreeToggle = (degCode: string) => {
    if (selectedDegrees.includes(degCode)) {
      setSelectedDegrees(selectedDegrees.filter(d => d !== degCode));
    } else {
      setSelectedDegrees([...selectedDegrees, degCode]);
    }
  };

  const handleSelectAllDegrees = () => {
    if (selectedDegrees.length === 3) {
      setSelectedDegrees([]);
    } else {
      setSelectedDegrees(['IT', 'ITM', 'AI']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim() || !description.trim() || !sessionDate || !startTime || !resourcePersonName.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in all required fields marked with *' });
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (sessionDate < todayStr) {
      setFeedback({ type: 'error', message: 'Session date cannot be a past date. Please select today or a future date.' });
      return;
    }

    if (startTime && endTime && endTime <= startTime) {
      setFeedback({ type: 'error', message: 'End time must be later than start time.' });
      return;
    }

    // Validate Resource Person Name (Only letters, spaces, dots, hyphens)
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    if (!nameRegex.test(resourcePersonName.trim()) || resourcePersonName.trim().length < 2) {
      setFeedback({ type: 'error', message: 'Resource Person name must contain only letters (no numbers or special symbols).' });
      return;
    }

    // Validate Designation / Organization if provided (Allows letters, numbers like 99x/WSO2, spaces, &, @, /, -, (), .)
    if (resourcePersonTitle.trim()) {
      const orgRegex = /^[a-zA-Z0-9\s.,'&/()@_-]+$/;
      if (!orgRegex.test(resourcePersonTitle.trim())) {
        setFeedback({ type: 'error', message: 'Designation / Organization contains invalid special characters.' });
        return;
      }
    }

    if (selectedLevels.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one target student level.' });
      return;
    }

    if (selectedDegrees.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one target degree program.' });
      return;
    }

    if (sessionType === 'online') {
      const trimmedLink = meetingLink.trim();
      let formattedLink = trimmedLink;
      if (!/^https?:\/\//i.test(trimmedLink) && trimmedLink.includes('.')) {
        formattedLink = 'https://' + trimmedLink;
      }

      const urlPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i;
      if (!trimmedLink || !urlPattern.test(formattedLink)) {
        setFeedback({ 
          type: 'error', 
          message: 'Please enter a valid meeting URL (e.g., https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij).' 
        });
        return;
      }
    }

    if (sessionType === 'physical' && !venue.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the physical venue (e.g. Auditorium / Hall).' });
      return;
    }

    try {
      setIsSubmitting(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      let finalMeetingLink: string | null = null;
      if (sessionType === 'online') {
        const trimmed = meetingLink.trim();
        finalMeetingLink = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        target_levels: selectedLevels.length === 4 ? 'All' : selectedLevels.join(','),
        degree_program: selectedDegrees.length === 3 ? 'All' : selectedDegrees.join(','),
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime || null,
        session_type: sessionType,
        venue: sessionType === 'physical' ? venue.trim() : null,
        meeting_link: finalMeetingLink,
        resource_person_name: resourcePersonName.trim(),
        resource_person_title: resourcePersonTitle.trim() || null,
        created_by: user?.id || null,
        author_name: user?.name || 'Admin'
      };

      const res = await fetch('http://localhost:5000/api/awareness-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish awareness session.');

      setFeedback({ 
        type: 'success', 
        message: 'Awareness session published successfully! Students of target levels will receive calendar entries and in-app reminders.' 
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedDegrees(['IT', 'ITM', 'AI']);
      setSessionDate('');
      setStartTime('');
      setEndTime('');
      setMeetingLink('');
      setVenue('');
      setResourcePersonName('');
      setResourcePersonTitle('');

      fetchSessions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this awareness session?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/awareness-sessions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <div className="awareness-panel-container">
      {/* Header Banner - Matching Onboard Mentors Card Style */}
      <div className="awareness-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="awareness-icon-box">
            <GraduationCap size={22} />
          </div>
          <div className="awareness-header-info">
            <h2>Student Awareness & Guidance Sessions</h2>
            <p>Schedule and publish level-wise awareness sessions for students. Events automatically sync with student calendars and trigger in-app reminders 2 days prior and on the session day.</p>
          </div>
        </div>
        <div className="awareness-stats-pill">
          <GraduationCap size={16} />
          <span>{sessions.length} Published Sessions</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="awareness-grid-layout">
        {/* Create Session Form */}
        <div className="awareness-card">
          <h3 className="awareness-card-title">
            <Send size={18} color="#2563eb" /> Schedule New Awareness Session
          </h3>

          {feedback && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="awareness-form">
            <div className="form-field">
              <label>Session Title / Topic *</label>
              <input
                type="text"
                placeholder="e.g., Final Year Project Guidelines & Industry Expectations"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Target Levels Multi-select */}
            <div className="form-field">
              <label>Target Academic Levels *</label>
              <div className="level-checkbox-group">
                {[1, 2, 3, 4].map(lvl => {
                  const isChecked = selectedLevels.includes(lvl);
                  return (
                    <label 
                      key={lvl} 
                      className={`level-checkbox-item ${isChecked ? 'checked' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleLevelToggle(lvl); }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                      />
                      <span>Level {lvl}</span>
                    </label>
                  );
                })}
                <label 
                  className={`level-checkbox-item ${selectedLevels.length === 4 ? 'checked' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSelectAllLevels(); }}
                >
                  <Layers size={14} />
                  <span>{selectedLevels.length === 4 ? 'Clear All' : 'Select All Levels'}</span>
                </label>
              </div>
            </div>

            {/* Target Degree Programs Multi-select */}
            <div className="form-field">
              <label>Target Degree Programs *</label>
              <div className="level-checkbox-group">
                {[
                  { code: 'IT', label: 'Information Technology (IT)' },
                  { code: 'ITM', label: 'IT Management (ITM)' },
                  { code: 'AI', label: 'Artificial Intelligence (AI)' }
                ].map(deg => {
                  const isChecked = selectedDegrees.includes(deg.code);
                  return (
                    <label 
                      key={deg.code} 
                      className={`level-checkbox-item ${isChecked ? 'checked' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleDegreeToggle(deg.code); }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                      />
                      <span>{deg.code}</span>
                    </label>
                  );
                })}
                <label 
                  className={`level-checkbox-item ${selectedDegrees.length === 3 ? 'checked' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleSelectAllDegrees(); }}
                >
                  <Layers size={14} />
                  <span>{selectedDegrees.length === 3 ? 'Clear All' : 'Select All Degrees'}</span>
                </label>
              </div>
            </div>

            {/* Date and Time Period */}
            <div className="form-group-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr' }}>
              <div className="form-field">
                <label>Session Date *</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="form-input"
                  min={todayStr}
                  required
                />
              </div>
              <div className="form-field">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-field">
                <label>End Time (Optional)</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 10:30"
                />
              </div>
            </div>

            {/* Resource Person */}
            <div className="form-group-row">
              <div className="form-field">
                <label>Resource Person / Speaker *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rohan Jayasinghe"
                  value={resourcePersonName}
                  onChange={e => setResourcePersonName(e.target.value.replace(/[^a-zA-Z\s.'-]/g, ''))}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-field">
                <label>Designation / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Tech Lead at 99x / WSO2"
                  value={resourcePersonTitle}
                  onChange={e => setResourcePersonTitle(e.target.value.replace(/[^a-zA-Z0-9\s.,'&/()@_-]/g, ''))}
                  className="form-input"
                />
              </div>
            </div>

            {/* Session Type */}
            <div className="form-field">
              <label>Delivery Mode *</label>
              <div className="session-type-toggle">
                <button
                  type="button"
                  className={`type-btn ${sessionType === 'online' ? 'active' : ''}`}
                  onClick={() => setSessionType('online')}
                >
                  <Video size={16} /> Online (Zoom/Teams)
                </button>
                <button
                  type="button"
                  className={`type-btn ${sessionType === 'physical' ? 'active' : ''}`}
                  onClick={() => setSessionType('physical')}
                >
                  <MapPin size={16} /> Physical (On Campus)
                </button>
              </div>
            </div>

            {sessionType === 'online' ? (
              <div className="form-field">
                <label>Meeting URL / Zoom Link *</label>
                <input
                  type="text"
                  placeholder="https://zoom.us/j/123456789 or https://meet.google.com/..."
                  value={meetingLink}
                  onChange={e => setMeetingLink(e.target.value)}
                  className="form-input"
                  style={{
                    borderColor: meetingLink.trim().length > 0 
                      ? (isValidMeetingUrl(meetingLink) ? '#22c55e' : '#ef4444') 
                      : undefined,
                    backgroundColor: meetingLink.trim().length > 0 
                      ? (isValidMeetingUrl(meetingLink) ? '#f0fdf4' : '#fff5f5') 
                      : undefined
                  }}
                  required
                />
                {meetingLink.trim().length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    {isValidMeetingUrl(meetingLink) ? (
                      <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <CheckCircle2 size={13} /> Valid meeting link format
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <AlertCircle size={13} /> Invalid URL. Must be a valid meeting link (e.g. https://zoom.us/j/... or https://meet.google.com/...)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="form-field">
                <label>Campus Venue / Hall *</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Auditorium, Floor 2"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}

            {/* Agenda / Description */}
            <div className="form-field">
              <label>Agenda & Session Overview *</label>
              <textarea
                placeholder="Detail what topics will be covered, who should attend, and preparation instructions..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-textarea"
                rows={3}
                required
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="publish-btn">
              <Send size={16} />
              {isSubmitting ? 'Publishing Session...' : 'Publish Awareness Session'}
            </button>
          </form>
        </div>

        {/* Published Sessions List */}
        <div className="awareness-card">
          <h3 className="awareness-card-title">
            <Calendar size={18} color="#2563eb" /> Active & Scheduled Sessions ({sessions.length})
          </h3>

          {loading ? (
            <div className="empty-sessions-box">Loading awareness sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-sessions-box">
              <GraduationCap size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <p>No awareness sessions scheduled yet.<br/>Use the form on the left to publish a new session.</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map(s => {
                let badgeClass = 'badge-upcoming';
                if (s.reminderType === 'today') badgeClass = 'badge-today';
                else if (s.reminderType === '2days' || s.reminderType === 'tomorrow') badgeClass = 'badge-2days';
                else if (s.reminderType === 'past') badgeClass = 'badge-past';

                return (
                  <div 
                    key={s.id} 
                    className={`session-item-card ${s.isToday ? 'is-today' : s.is2DaysAlert ? 'is-2days' : ''}`}
                  >
                    <div className="session-card-header">
                      <h4 className="session-card-title">{s.title}</h4>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="delete-session-btn"
                        title="Delete Session"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <span className={`session-badge ${badgeClass}`}>
                        {s.reminderBadge}
                      </span>
                    </div>

                    <div className="session-meta-row">
                      <div className="meta-item">
                        <Calendar size={13} color="#2563eb" />
                        <span>{s.session_date}</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={13} color="#2563eb" />
                        <span>{formatTime12h(s.start_time)}{s.end_time ? ` - ${formatTime12h(s.end_time)}` : ''}</span>
                      </div>
                      <div className="meta-item">
                        <span className="target-level-pill">
                          {s.target_levels === 'All' ? 'All Levels' : `Levels: ${s.target_levels}`}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="target-level-pill" style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                          {(!s.degree_program || s.degree_program === 'All') ? 'All Degrees' : `Degrees: ${s.degree_program}`}
                        </span>
                      </div>
                    </div>

                    <div className="session-speaker-box">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="#475569" />
                        <strong>{s.resource_person_name}</strong>
                        {s.resource_person_title && <span style={{ color: '#64748b' }}>({s.resource_person_title})</span>}
                      </span>
                      {s.session_type === 'online' && s.meeting_link ? (
                        <a 
                          href={s.meeting_link} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <Video size={13} /> Link <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <MapPin size={12} /> {s.venue || 'Campus Hall'}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                      {s.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAwarenessSessionPanel;
