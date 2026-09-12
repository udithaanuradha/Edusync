import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  ExternalLink, 
  Info, 
  X,
  BellRing
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './StudentAwarenessBanner.css';

interface AwarenessSession {
  id: number;
  title: string;
  description: string;
  target_levels: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  session_type: 'online' | 'physical' | 'hybrid';
  venue: string | null;
  meeting_link: string | null;
  resource_person_name: string;
  resource_person_title: string | null;
  days_remaining: number;
  reminderBadge: string | null;
  reminderType: string;
  isToday: boolean;
  is2DaysAlert: boolean;
}

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

const StudentAwarenessBanner: React.FC = () => {
  const { user } = useAuth();
  const userAny = user as any;
  const studentLevel = userAny?.level || 1;
  const studentDegree = userAny?.academic_unit || userAny?.degreeProgram || userAny?.department || '';

  const [sessions, setSessions] = useState<AwarenessSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AwarenessSession | null>(null);

  useEffect(() => {
    const fetchStudentSessions = async () => {
      try {
        const degreeParam = studentDegree ? `&degree=${encodeURIComponent(studentDegree)}` : '';
        const res = await fetch(`http://localhost:5000/api/awareness-sessions?role=student&level=${studentLevel}${degreeParam}&upcomingOnly=true`);
        if (!res.ok) return;
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to load student awareness sessions:', err);
      }
    };

    fetchStudentSessions();
  }, [studentLevel, studentDegree]);

  if (sessions.length === 0) return null;

  return (
    <div className="student-awareness-banner-container">
      {sessions.map(session => {
        let cardClass = 'alert-card-upcoming';
        let icon = <Calendar size={20} />;

        if (session.isToday) {
          cardClass = 'alert-card-today';
          icon = <BellRing size={20} className="animate-bounce" />;
        } else if (session.is2DaysAlert) {
          cardClass = 'alert-card-2days';
          icon = <Sparkles size={20} />;
        }

        return (
          <div key={session.id} className={`student-session-alert-card ${cardClass}`}>
            <div className="alert-info-content">
              <div className="alert-icon-box">{icon}</div>
              <div className="alert-text-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4>{session.title}</h4>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: session.isToday ? '#fee2e2' : session.is2DaysAlert ? '#fef3c7' : '#dbeafe',
                    color: session.isToday ? '#b91c1c' : session.is2DaysAlert ? '#92400e' : '#1e40af'
                  }}>
                    {session.reminderBadge}
                  </span>
                </div>
                <p>{session.description.length > 120 ? session.description.slice(0, 120) + '...' : session.description}</p>
                <div className="alert-meta-tags">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e293b' }}>
                    <Calendar size={13} color="#2563eb" /> {session.session_date}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e293b' }}>
                    <Clock size={13} color="#2563eb" /> {formatTime12h(session.start_time)}{session.end_time ? ` - ${formatTime12h(session.end_time)}` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                    <User size={13} /> {session.resource_person_name}
                  </span>
                </div>
              </div>
            </div>

            <div className="alert-actions">
              <button 
                onClick={() => setSelectedSession(session)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#334155'
                }}
              >
                <Info size={14} /> Details
              </button>

              {session.session_type === 'online' && session.meeting_link ? (
                <a 
                  href={session.meeting_link} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`join-session-btn ${session.isToday ? 'live' : ''}`}
                >
                  <Video size={14} />
                  {session.isToday ? 'Join Live Meeting' : 'Meeting Link'}
                </a>
              ) : (
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} color="#dc2626" /> {session.venue || 'Campus Hall'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Detail Modal */}
      {selectedSession && (
        <div className="session-modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="session-modal-card" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedSession(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700
              }}>
                🎓 Awareness Session
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Levels: {selectedSession.target_levels === 'All' ? 'All Students' : selectedSession.target_levels}
              </span>
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {selectedSession.title}
            </h3>

            <div style={{
              background: '#f8fafc',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} color="#2563eb" />
                <strong>Date:</strong> {selectedSession.session_date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="#2563eb" />
                <strong>Time:</strong> {formatTime12h(selectedSession.start_time)} {selectedSession.end_time ? `- ${formatTime12h(selectedSession.end_time)}` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#2563eb" />
                <strong>Resource Person:</strong> {selectedSession.resource_person_name} {selectedSession.resource_person_title ? `(${selectedSession.resource_person_title})` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedSession.session_type === 'online' ? (
                  <>
                    <Video size={15} color="#2563eb" />
                    <strong>Mode:</strong> Online Session
                  </>
                ) : (
                  <>
                    <MapPin size={15} color="#dc2626" />
                    <strong>Venue:</strong> {selectedSession.venue || 'Campus Hall'}
                  </>
                )}
              </div>
            </div>

            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              Agenda & Details:
            </h4>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line', margin: '0 0 20px 0' }}>
              {selectedSession.description}
            </p>

            {selectedSession.session_type === 'online' && selectedSession.meeting_link && (
              <a 
                href={selectedSession.meeting_link} 
                target="_blank" 
                rel="noreferrer"
                className="join-session-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                <Video size={16} /> Open Meeting Link
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAwarenessBanner;
