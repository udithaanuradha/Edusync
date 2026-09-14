import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { 
  GraduationCap, 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  Sparkles, 
  BellRing, 
  Info, 
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarCheck,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './StudentDashboard.css';

interface AwarenessSession {
  id: number;
  title: string;
  description: string;
  target_levels: string;
  degree_program?: string;
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

const getGoogleCalendarUrl = (session: AwarenessSession): string => {
  const title = encodeURIComponent(`[EduSync] ${session.title}`);
  const details = encodeURIComponent(
    `EduSync Awareness & Guidance Session\n\nSpeaker: ${session.resource_person_name}${session.resource_person_title ? ` (${session.resource_person_title})` : ''}\n${session.session_type === 'online' && session.meeting_link ? `Meeting Link: ${session.meeting_link}\n` : `Venue: ${session.venue || 'Campus Hall'}\n`}\nAgenda:\n${session.description}`
  );
  const location = encodeURIComponent(
    session.session_type === 'online' && session.meeting_link ? session.meeting_link : session.venue || 'University of Moratuwa'
  );

  const dateParts = session.session_date.split('-');
  const dateFormatted = dateParts.join('');

  let startHour = '09';
  let startMin = '00';
  if (session.start_time) {
    const tParts = session.start_time.split(':');
    if (tParts.length >= 2) {
      startHour = tParts[0].padStart(2, '0');
      startMin = tParts[1].slice(0, 2).padStart(2, '0');
    }
  }

  let endHour = '10';
  let endMin = '00';
  if (session.end_time) {
    const eParts = session.end_time.split(':');
    if (eParts.length >= 2) {
      endHour = eParts[0].padStart(2, '0');
      endMin = eParts[1].slice(0, 2).padStart(2, '0');
    }
  } else {
    const sH = parseInt(startHour, 10);
    endHour = String(Math.min(23, sH + 1)).padStart(2, '0');
    endMin = startMin;
  }

  const startIso = `${dateFormatted}T${startHour}${startMin}00`;
  const endIso = `${dateFormatted}T${endHour}${endMin}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
};

const downloadIcsFile = (session: AwarenessSession) => {
  const dateParts = session.session_date.split('-');
  const dateFormatted = dateParts.join('');
  let startHour = '09';
  let startMin = '00';
  if (session.start_time) {
    const tParts = session.start_time.split(':');
    if (tParts.length >= 2) {
      startHour = tParts[0].padStart(2, '0');
      startMin = tParts[1].slice(0, 2).padStart(2, '0');
    }
  }

  let endHour = '10';
  let endMin = '00';
  if (session.end_time) {
    const eParts = session.end_time.split(':');
    if (eParts.length >= 2) {
      endHour = eParts[0].padStart(2, '0');
      endMin = eParts[1].slice(0, 2).padStart(2, '0');
    }
  } else {
    const sH = parseInt(startHour, 10);
    endHour = String(Math.min(23, sH + 1)).padStart(2, '0');
    endMin = startMin;
  }

  const startIso = `${dateFormatted}T${startHour}${startMin}00`;
  const endIso = `${dateFormatted}T${endHour}${endMin}00`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EduSync//Awareness Sessions//EN',
    'BEGIN:VEVENT',
    `UID:awareness-${session.id}-${Date.now()}@edusync.lk`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:EduSync: ${session.title}`,
    `DESCRIPTION:${session.description.replace(/\n/g, '\\n')}\\n\\nSpeaker: ${session.resource_person_name}`,
    `LOCATION:${session.session_type === 'online' ? session.meeting_link || 'Online' : session.venue || 'Campus'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${session.title.replace(/[^a-zA-Z0-9]/g, '_')}_session.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const StudentAwarenessSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const userAny = user as any;
  const studentLevel = userAny?.level || 1;
  const studentDegree = userAny?.academic_unit || userAny?.degreeProgram || userAny?.department || '';

  const [sessions, setSessions] = useState<AwarenessSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AwarenessSession | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'feed'>('calendar');

  // Month grid navigation
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const degreeParam = studentDegree ? `&degree=${encodeURIComponent(studentDegree)}` : '';
        const res = await fetch(`http://localhost:5000/api/awareness-sessions?role=student&level=${studentLevel}${degreeParam}&upcomingOnly=true`);
        if (!res.ok) return;
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to load student awareness sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [studentLevel, studentDegree]);

  // Calendar calculations
  const { monthName, yearNumber, dayCells, sessionDateMap } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      cells.push({ day: d, dateStr });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateStr: null });
    }

    const map = new Map<string, AwarenessSession[]>();
    sessions.forEach((s) => {
      const existing = map.get(s.session_date) || [];
      existing.push(s);
      map.set(s.session_date, existing);
    });

    return { monthName, yearNumber: year, dayCells: cells, sessionDateMap: map };
  }, [viewDate, sessions]);

  // Filter sessions displayed in sidebar inspector
  const displayedScheduleSessions = useMemo(() => {
    if (selectedDateStr) {
      return sessions.filter(s => s.session_date === selectedDateStr);
    }
    return sessions;
  }, [selectedDateStr, sessions]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleTodayJump = () => {
    setViewDate(new Date());
    setSelectedDateStr(todayStr);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header pageTitle="Student Awareness & Guidance Sessions" />
        <main className="content-container" style={{ padding: '24px 32px' }}>
          
          {/* Header Banner */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            padding: '20px 24px',
            borderRadius: '16px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <GraduationCap size={22} />
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Level {studentLevel} Awareness & Guidance Calendar
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Official guidance, industry briefings, and academic workshops scheduled for your level.
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'calendar' ? '#ffffff' : 'transparent',
                  color: activeTab === 'calendar' ? '#2563eb' : '#64748b',
                  boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <CalendarIcon size={15} />
                <span>Calendar View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'feed' ? '#ffffff' : 'transparent',
                  color: activeTab === 'feed' ? '#2563eb' : '#64748b',
                  boxShadow: activeTab === 'feed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Layers size={15} />
                <span>All Sessions ({sessions.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              Loading guidance calendar and sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}>
              <Sparkles size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#334155' }}>
                No Upcoming Sessions Scheduled
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                There are currently no awareness sessions scheduled for Level {studentLevel}. Please check back later!
              </p>
            </div>
          ) : activeTab === 'calendar' ? (
            /* TAB 1: INTERACTIVE MONTH CALENDAR VIEW */
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.45fr 1fr',
              gap: '24px',
              alignItems: 'start'
            }}>
              
              {/* Left Side: Calendar Grid */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
              }}>
                {/* Month Navigator Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {monthName} {yearNumber}
                    </h3>
                    <button
                      type="button"
                      onClick={handleTodayJump}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Today
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#334155'
                      }}
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#334155'
                      }}
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Day Header Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                  textAlign: 'center',
                  marginBottom: '8px'
                }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                    <div 
                      key={dayName}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: idx === 0 || idx === 6 ? '#94a3b8' : '#475569',
                        textTransform: 'uppercase',
                        padding: '4px 0'
                      }}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px'
                }}>
                  {dayCells.map((cell, idx) => {
                    if (cell.day === null) {
                      return (
                        <div 
                          key={`empty-${idx}`} 
                          style={{
                            minHeight: '80px',
                            background: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px solid #f1f5f9',
                            opacity: 0.5
                          }}
                        />
                      );
                    }

                    const isToday = cell.dateStr === todayStr;
                    const isSelected = cell.dateStr === selectedDateStr;
                    const daySessions = cell.dateStr ? sessionDateMap.get(cell.dateStr) || [] : [];
                    const hasSessions = daySessions.length > 0;

                    return (
                      <div
                        key={`cell-${cell.dateStr}`}
                        onClick={() => {
                          if (cell.dateStr) {
                            setSelectedDateStr(selectedDateStr === cell.dateStr ? null : cell.dateStr);
                          }
                        }}
                        style={{
                          minHeight: '80px',
                          padding: '6px 8px',
                          borderRadius: '10px',
                          border: isSelected 
                            ? '2px solid #2563eb' 
                            : isToday 
                              ? '2px solid #60a5fa' 
                              : hasSessions 
                                ? '1.5px solid #bfdbfe' 
                                : '1px solid #e2e8f0',
                          backgroundColor: isSelected 
                            ? '#eff6ff' 
                            : hasSessions 
                              ? '#f0f7ff' 
                              : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: isToday || isSelected ? 800 : 600,
                            color: isToday ? '#2563eb' : isSelected ? '#1d4ed8' : '#334155',
                            width: isToday ? '20px' : 'auto',
                            height: isToday ? '20px' : 'auto',
                            borderRadius: isToday ? '50%' : 'none',
                            backgroundColor: isToday ? '#dbeafe' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {cell.day}
                          </span>

                          {hasSessions && (
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                              display: 'inline-block'
                            }} />
                          )}
                        </div>

                        {/* Session preview pill on the calendar date */}
                        {hasSessions && (
                          <div style={{ marginTop: '4px' }}>
                            {daySessions.map(s => (
                              <div
                                key={`pill-${s.id}`}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginBottom: '2px',
                                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                }}
                                title={`${s.title} (${formatTime12h(s.start_time)})`}
                              >
                                {s.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Schedule & Details Inspector */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedDateStr ? `Sessions on ${selectedDateStr}` : 'Upcoming Guidance Schedule'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {displayedScheduleSessions.length} {displayedScheduleSessions.length === 1 ? 'session' : 'sessions'} scheduled
                    </p>
                  </div>

                  {selectedDateStr && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(null)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        color: '#475569',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Show All
                    </button>
                  )}
                </div>

                {displayedScheduleSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
                    <CalendarCheck size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No sessions scheduled for this day.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '550px', overflowY: 'auto' }}>
                    {displayedScheduleSessions.map(session => (
                      <div
                        key={session.id}
                        style={{
                          border: `1px solid ${session.isToday ? '#fca5a5' : '#e2e8f0'}`,
                          borderLeft: `4px solid ${session.isToday ? '#ef4444' : '#2563eb'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                            {session.title}
                          </h4>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: session.isToday ? '#fee2e2' : '#eff6ff',
                            color: session.isToday ? '#b91c1c' : '#1d4ed8',
                            whiteSpace: 'nowrap'
                          }}>
                            {session.reminderBadge}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CalendarIcon size={13} color="#2563eb" />
                            <span><strong>Date:</strong> {session.session_date}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} color="#2563eb" />
                            <span><strong>Time:</strong> {formatTime12h(session.start_time)}{session.end_time ? ` - ${formatTime12h(session.end_time)}` : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} color="#2563eb" />
                            <span><strong>Speaker:</strong> {session.resource_person_name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {session.session_type === 'online' ? (
                              <>
                                <Video size={13} color="#2563eb" />
                                <span><strong>Mode:</strong> Online Zoom / Teams</span>
                              </>
                            ) : (
                              <>
                                <MapPin size={13} color="#dc2626" />
                                <span><strong>Venue:</strong> {session.venue || 'Campus Hall'}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Zoom link + Add to Google Calendar + ICS Download */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                          {session.session_type === 'online' && session.meeting_link && (
                            <a
                              href={session.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: '7px',
                                border: 'none',
                                background: session.isToday ? '#dc2626' : '#2563eb',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px'
                              }}
                            >
                              <Video size={13} /> {session.isToday ? 'Join Live' : 'Meeting Link'}
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedSession(session)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '7px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Info size={13} /> Details
                          </button>

                          <a
                            href={getGoogleCalendarUrl(session)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '7px 10px',
                              borderRadius: '7px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '12px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Add event to your personal Google Calendar"
                          >
                            <CalendarIcon size={13} /> Google Cal
                          </a>

                          <button
                            type="button"
                            onClick={() => downloadIcsFile(session)}
                            style={{
                              padding: '7px 8px',
                              borderRadius: '7px',
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#64748b',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Download .ics calendar event file for Outlook / Apple / Windows Calendar"
                          >
                            <Download size={13} /> .ics
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: ALL SESSIONS FEED GRID */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {sessions.map(session => {
                const isToday = session.isToday;
                const is2Days = session.is2DaysAlert;

                return (
                  <div 
                    key={session.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: `1px solid ${isToday ? '#fca5a5' : is2Days ? '#fde68a' : '#e2e8f0'}`,
                      borderLeft: `5px solid ${isToday ? '#ef4444' : is2Days ? '#f59e0b' : '#3b82f6'}`,
                      padding: '20px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                          {session.title}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          backgroundColor: isToday ? '#fee2e2' : is2Days ? '#fef3c7' : '#dbeafe',
                          color: isToday ? '#b91c1c' : is2Days ? '#92400e' : '#1e40af',
                          whiteSpace: 'nowrap'
                        }}>
                          {session.reminderBadge}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} color="#2563eb" />
                          <span><strong>Date:</strong> {session.session_date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#2563eb" />
                          <span><strong>Time:</strong> {formatTime12h(session.start_time)}{session.end_time ? ` - ${formatTime12h(session.end_time)}` : ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#2563eb" />
                          <span><strong>Speaker:</strong> {session.resource_person_name} {session.resource_person_title ? `(${session.resource_person_title})` : ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {session.session_type === 'online' ? (
                            <>
                              <Video size={14} color="#2563eb" />
                              <span><strong>Mode:</strong> Online Session</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={14} color="#dc2626" />
                              <span><strong>Venue:</strong> {session.venue || 'Campus Hall'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                        {session.description.length > 140 ? session.description.slice(0, 140) + '...' : session.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => setSelectedSession(session)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Info size={15} /> Details
                      </button>

                      {session.session_type === 'online' && session.meeting_link && (
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isToday ? '#dc2626' : '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Video size={15} /> {isToday ? 'Join Live' : 'Meeting Link'}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal for Details */}
          {selectedSession && (
            <div 
              style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
              onClick={() => setSelectedSession(null)}
            >
              <div 
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  maxWidth: '540px',
                  width: '100%',
                  padding: '28px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
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
                    {selectedSession.degree_program && selectedSession.degree_program !== 'All' ? ` | Degree: ${selectedSession.degree_program}` : ''}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 12px 0', fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
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
                    <CalendarIcon size={15} color="#2563eb" />
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
                  Agenda & Instructions:
                </h4>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-line', margin: '0 0 20px 0' }}>
                  {selectedSession.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedSession.session_type === 'online' && selectedSession.meeting_link && (
                    <a
                      href={selectedSession.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '12px',
                        background: '#2563eb',
                        color: '#ffffff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Video size={16} /> Open Meeting Link <ExternalLink size={14} />
                    </a>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                      href={getGoogleCalendarUrl(selectedSession)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <CalendarIcon size={14} /> Add to Google Calendar
                    </a>

                    <button
                      type="button"
                      onClick={() => downloadIcsFile(selectedSession)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Download size={14} /> Save (.ics File)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StudentAwarenessSessionsPage;
