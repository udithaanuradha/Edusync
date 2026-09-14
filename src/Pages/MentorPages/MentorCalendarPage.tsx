import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  Layers,
  User,
  Users,
  Info,
  CalendarDays,
  Target
} from 'lucide-react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import './MentorCalendarPage.css';

/**
 * MentorCalendarPage Component
 *
 * PURPOSE:
 *   Dedicated calendar workspace for Industry Mentors to track:
 *   1. Student tasks due dates (color coded by status: Completed, In Progress, Todo) with assigned student names.
 *   2. Project milestones target completion dates.
 *   3. Official coordinator stage deadlines (Proposal, Interim, Final).
 *
 * FEATURES:
 *   - Interactive Month Grid with date selection and today quick-jump.
 *   - Event filter pills (All, Student Tasks, Milestones, Stage Deadlines).
 *   - Group switcher (for mentors assigned to multiple groups).
 *   - Right-side date inspector for full task/milestone descriptions and assigned student details.
 *   - Upcoming deadlines timeline.
 */

interface StudentTask {
  id: number;
  task_name: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'TODO' | string;
  due_date: string;
  created_at: string;
  mentor_feedback?: string | null;
  assigned_to_name?: string;
  university_id?: string;
  milestone_title?: string;
  group_id: number;
  group_name: string;
  level: number;
}

interface Milestone {
  id: number;
  group_id: number;
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  status: string;
  group_name: string;
  level: number;
}

interface StageDeadline {
  stage_id: number;
  level: number;
  stage_name: string;
  description: string;
  deadline: string;
  coordinator_name?: string;
}

interface AssignedGroup {
  id: number;
  group_name: string;
  level: number;
  department: string;
  created_by?: number;
}

interface CalendarEventItem {
  id: string;
  type: 'TASK' | 'MILESTONE' | 'STAGE';
  title: string;
  date: Date;
  dateKey: string; // 'YYYY-MM-DD'
  status?: string;
  subtitle?: string;
  rawTask?: StudentTask;
  rawMilestone?: Milestone;
  rawStage?: StageDeadline;
  groupName?: string;
}

const MentorCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'TASK' | 'STAGE' | 'MILESTONE'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  const [groups, setGroups] = useState<AssignedGroup[]>([]);
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stages, setStages] = useState<StageDeadline[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch mentor calendar events on mount
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        setError(null);

        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (mentorId) headers['x-user-id'] = String(mentorId);
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = mentorId
          ? `http://localhost:5000/api/mentor/calendar-events?mentorId=${mentorId}`
          : `http://localhost:5000/api/mentor/calendar-events`;

        const res = await fetch(url, { headers });
        const json = await res.json();

        if (json.success && json.data) {
          setGroups(json.data.groups || []);
          setTasks(json.data.tasks || []);
          setMilestones(json.data.milestones || []);
          setStages(json.data.stages || []);
        } else {
          setGroups([]);
          setTasks([]);
          setMilestones([]);
          setStages([]);
        }
      } catch (err: any) {
        console.error('Failed to load mentor calendar events:', err);
        setError('Unable to load calendar events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

  // Helper to format date into 'YYYY-MM-DD'
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert raw DB dates into unified CalendarEventItems
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const items: CalendarEventItem[] = [];

    // 1. Process Student Tasks
    tasks.forEach((t) => {
      if (selectedGroupId !== 'ALL' && String(t.group_id) !== selectedGroupId) return;
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (isNaN(d.getTime())) return;

      items.push({
        id: `task-${t.id}`,
        type: 'TASK',
        title: t.task_name,
        date: d,
        dateKey: formatDateKey(d),
        status: t.status,
        subtitle: t.assigned_to_name ? `Assigned to: ${t.assigned_to_name}` : 'Student Task',
        rawTask: t,
        groupName: t.group_name,
      });
    });

    // 2. Process Milestones
    milestones.forEach((m) => {
      if (selectedGroupId !== 'ALL' && String(m.group_id) !== selectedGroupId) return;
      if (!m.due_date) return;
      const d = new Date(m.due_date);
      if (isNaN(d.getTime())) return;

      items.push({
        id: `milestone-${m.id}`,
        type: 'MILESTONE',
        title: m.title,
        date: d,
        dateKey: formatDateKey(d),
        status: m.status,
        subtitle: `Milestone Target (${m.group_name})`,
        rawMilestone: m,
        groupName: m.group_name,
      });
    });

    // 3. Process Coordinator Stage Deadlines
    stages.forEach((s) => {
      if (!s.deadline) return;
      const d = new Date(s.deadline);
      if (isNaN(d.getTime())) return;

      items.push({
        id: `stage-${s.stage_id}`,
        type: 'STAGE',
        title: `${s.stage_name} Submission Deadline`,
        date: d,
        dateKey: formatDateKey(d),
        subtitle: `Level ${s.level} Official Stage (${s.coordinator_name || 'Coordinator'})`,
        rawStage: s,
        groupName: `Level ${s.level}`,
      });
    });

    return items;
  }, [tasks, milestones, stages, selectedGroupId]);

  // Filtered events based on eventTypeFilter
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'ALL') return allEvents;
    return allEvents.filter((ev) => ev.type === eventTypeFilter);
  }, [allEvents, eventTypeFilter]);

  // Map events by dateKey for fast calendar grid lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    filteredEvents.forEach((ev) => {
      const existing = map.get(ev.dateKey) || [];
      existing.push(ev);
      map.set(ev.dateKey, existing);
    });
    return map;
  }, [filteredEvents]);

  // Events for currently selected date
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDateEvents = eventsByDate.get(selectedDateKey) || [];

  // Upcoming events (from today onwards)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvents
      .filter((ev) => ev.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [allEvents]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDayOfMonth.getDate();

    const days: { date: Date; dateKey: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: true });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Summary counts
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasksCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const stageDeadlinesCount = stages.length;

  const currentMonthYearTitle = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container mentor-cal-page">
          {/* ── Page Header ── */}
          <div className="mentor-cal-header-card">
            <div className="mentor-cal-header-info">
              <h2>Project Calendar</h2>
              <p>
                Track student task due dates, major milestone targets, and official coordinator stage deadlines in real-time.
              </p>
            </div>

            {/* Quick Stat Pills */}
            <div className="mentor-cal-stats-row">
              <div className="mentor-cal-stat-chip">
                <Layers size={16} className="text-blue-500" />
                <div>
                  <span className="stat-num">{totalTasksCount}</span>
                  <span className="stat-lbl">Student Tasks</span>
                </div>
              </div>
              <div className="mentor-cal-stat-chip">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <div>
                  <span className="stat-num">{completedTasksCount}</span>
                  <span className="stat-lbl">Completed</span>
                </div>
              </div>
              <div className="mentor-cal-stat-chip">
                <Clock size={16} className="text-amber-500" />
                <div>
                  <span className="stat-num">{inProgressTasksCount}</span>
                  <span className="stat-lbl">In Progress</span>
                </div>
              </div>
              <div className="mentor-cal-stat-chip">
                <Flag size={16} className="text-rose-500" />
                <div>
                  <span className="stat-num">{stageDeadlinesCount}</span>
                  <span className="stat-lbl">Stage Deadlines</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Control Bar (Month Nav + Filters + Group Switcher) ── */}
          <div className="mentor-cal-controls-card">
            <div className="mentor-cal-nav-group">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="cal-nav-btn"
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="cal-month-title">{currentMonthYearTitle}</h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="cal-nav-btn"
                title="Next Month"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="cal-today-btn"
              >
                Today
              </button>
            </div>

            <div className="mentor-cal-filters-group">
              {/* Event Type Filter Buttons */}
              <div className="cal-filter-pills">
                <button
                  type="button"
                  className={`cal-filter-pill ${eventTypeFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter('ALL')}
                >
                  All Events
                </button>
                <button
                  type="button"
                  className={`cal-filter-pill tasks ${eventTypeFilter === 'TASK' ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter('TASK')}
                >
                  📝 Tasks
                </button>
                <button
                  type="button"
                  className={`cal-filter-pill stages ${eventTypeFilter === 'STAGE' ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter('STAGE')}
                >
                  🚩 Stage Deadlines
                </button>
                <button
                  type="button"
                  className={`cal-filter-pill milestones ${eventTypeFilter === 'MILESTONE' ? 'active' : ''}`}
                  onClick={() => setEventTypeFilter('MILESTONE')}
                >
                  🎯 Milestones
                </button>
              </div>

              {/* Group Selector (if multiple groups exist) */}
              {groups.length > 1 && (
                <div className="cal-group-select-wrap">
                  <Users size={15} />
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="cal-group-select"
                  >
                    <option value="ALL">All Assigned Groups</option>
                    {groups.map((g) => (
                      <option key={g.id} value={String(g.id)}>
                        {g.group_name} (Level {g.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── Main Layout: Calendar Grid + Inspector Panel ── */}
          <div className="mentor-cal-main-layout">
            {/* Left: Interactive Month Grid */}
            <div className="mentor-cal-grid-card">
              {loading ? (
                <div className="cal-loading-box">
                  <div className="cal-spinner"></div>
                  <p>Loading schedule and deadlines...</p>
                </div>
              ) : (
                <>
                  {/* Days of Week Header */}
                  <div className="cal-weekdays-row">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="cal-weekday-cell">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Date Cells Grid */}
                  <div className="cal-days-grid">
                    {calendarDays.map((dayObj) => {
                      const dayEvents = eventsByDate.get(dayObj.dateKey) || [];
                      const isSelected = dayObj.dateKey === selectedDateKey;
                      const isToday = dayObj.dateKey === formatDateKey(new Date());

                      return (
                        <div
                          key={dayObj.dateKey}
                          onClick={() => setSelectedDate(dayObj.date)}
                          className={`cal-day-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${
                            isSelected ? 'selected' : ''
                          } ${isToday ? 'today' : ''}`}
                        >
                          <div className="cal-day-top">
                            <span className="cal-day-number">{dayObj.date.getDate()}</span>
                            {dayEvents.length > 0 && (
                              <span className="cal-day-event-count">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event Badges List */}
                          <div className="cal-day-events-list">
                            {dayEvents.slice(0, 2).map((ev) => {
                              let badgeClass = 'event-badge-task';
                              if (ev.type === 'STAGE') badgeClass = 'event-badge-stage';
                              else if (ev.type === 'MILESTONE') badgeClass = 'event-badge-milestone';
                              else if (ev.status === 'COMPLETED') badgeClass = 'event-badge-completed';
                              else if (ev.status === 'IN_PROGRESS') badgeClass = 'event-badge-inprogress';

                              return (
                                <div
                                  key={ev.id}
                                  className={`cal-event-chip ${badgeClass}`}
                                  title={`${ev.title} (${ev.subtitle || ''})`}
                                >
                                  <span className="chip-dot"></span>
                                  <span className="chip-text">{ev.title}</span>
                                </div>
                              );
                            })}

                            {dayEvents.length > 2 && (
                              <div className="cal-event-more">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="cal-legend-footer">
                    <div className="legend-item">
                      <span className="legend-dot green"></span>
                      <span>Task: Completed</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot orange"></span>
                      <span>Task: In Progress</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot blue"></span>
                      <span>Task: Todo</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot red"></span>
                      <span>Coordinator Stage Deadline</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot purple"></span>
                      <span>Milestone Target</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Selected Date Inspector & Upcoming Schedule */}
            <div className="mentor-cal-side-panel">
              {/* Selected Day Header */}
              <div className="side-card selected-date-card">
                <div className="side-card-header">
                  <CalendarIcon size={18} className="text-blue-600" />
                  <div>
                    <h4 className="side-card-title">
                      {selectedDate.toLocaleDateString('default', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </h4>
                    <span className="side-card-subtitle">
                      {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'} on this date
                    </span>
                  </div>
                </div>

                <div className="selected-events-list">
                  {selectedDateEvents.length > 0 ? (
                    selectedDateEvents.map((ev) => (
                      <div key={ev.id} className={`event-detail-card ${ev.type.toLowerCase()}`}>
                        <div className="event-detail-top">
                          <span className={`event-type-pill ${ev.type.toLowerCase()}`}>
                            {ev.type === 'TASK' ? '📝 Student Task' : ev.type === 'STAGE' ? '🚩 Stage Deadline' : '🎯 Milestone'}
                          </span>
                          {ev.status && (
                            <span className={`event-status-tag ${ev.status.toLowerCase()}`}>
                              {ev.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <h5 className="event-detail-title">{ev.title}</h5>

                        {ev.type === 'TASK' && ev.rawTask && (
                          <div className="event-meta-block">
                            {ev.rawTask.assigned_to_name && (
                              <div className="meta-row">
                                <User size={13} />
                                <span>
                                  <strong>Student:</strong> {ev.rawTask.assigned_to_name}
                                  {ev.rawTask.university_id ? ` (${ev.rawTask.university_id})` : ''}
                                </span>
                              </div>
                            )}
                            {ev.rawTask.milestone_title && (
                              <div className="meta-row">
                                <Target size={13} />
                                <span>
                                  <strong>Milestone:</strong> {ev.rawTask.milestone_title}
                                </span>
                              </div>
                            )}
                            {ev.rawTask.description && (
                              <p className="task-desc-text">{ev.rawTask.description}</p>
                            )}
                            {ev.rawTask.mentor_feedback && (
                              <div className="mentor-feedback-box">
                                <span className="feedback-lbl">Your Feedback:</span>
                                <p>{ev.rawTask.mentor_feedback}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {ev.type === 'STAGE' && ev.rawStage && (
                          <div className="event-meta-block">
                            <div className="meta-row">
                              <Flag size={13} />
                              <span>
                                <strong>Level {ev.rawStage.level} Stage:</strong> {ev.rawStage.stage_name}
                              </span>
                            </div>
                            {ev.rawStage.coordinator_name && (
                              <div className="meta-row">
                                <User size={13} />
                                <span>
                                  <strong>Coordinator:</strong> {ev.rawStage.coordinator_name}
                                </span>
                              </div>
                            )}
                            {ev.rawStage.description && (
                              <p className="task-desc-text">{ev.rawStage.description}</p>
                            )}
                          </div>
                        )}

                        {ev.type === 'MILESTONE' && ev.rawMilestone && (
                          <div className="event-meta-block">
                            <div className="meta-row">
                              <Target size={13} />
                              <span>
                                <strong>Group:</strong> {ev.rawMilestone.group_name}
                              </span>
                            </div>
                            {ev.rawMilestone.description && (
                              <p className="task-desc-text">{ev.rawMilestone.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="no-events-box">
                      <Info size={24} className="text-slate-400" />
                      <p>No student tasks or deadlines scheduled for this date.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Deadlines Timeline Card */}
              <div className="side-card upcoming-card">
                <div className="side-card-header">
                  <Clock size={18} className="text-amber-600" />
                  <div>
                    <h4 className="side-card-title">Upcoming Deadlines</h4>
                    <span className="side-card-subtitle">Next critical project milestones</span>
                  </div>
                </div>

                <div className="upcoming-timeline-list">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="upcoming-timeline-item"
                        onClick={() => {
                          setSelectedDate(ev.date);
                          setCurrentDate(ev.date);
                        }}
                      >
                        <div className="upcoming-date-box">
                          <span className="up-month">
                            {ev.date.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="up-day">{ev.date.getDate()}</span>
                        </div>
                        <div className="upcoming-info">
                          <span className="upcoming-item-title">{ev.title}</span>
                          <span className="upcoming-item-sub">
                            {ev.subtitle || ev.groupName || ''}
                          </span>
                        </div>
                        <span className={`upcoming-badge-type ${ev.type.toLowerCase()}`}>
                          {ev.type === 'TASK' ? 'Task' : ev.type === 'STAGE' ? 'Stage' : 'Milestone'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="no-upcoming-text">No upcoming deadlines found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MentorCalendarPage;
