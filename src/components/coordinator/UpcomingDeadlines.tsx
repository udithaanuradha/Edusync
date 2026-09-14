import React from 'react';
import { Calendar } from 'lucide-react';
import './UpcomingDeadlines.css';

interface Deadline {
  date: string;
  title: string;
  academicLevel: number;
  startTime?: string | null;
  targetGroup?: string | null;
  location?: string | null;
  // True once evaluators have submitted marks for this panel's stage, even
  // though it still counts as "upcoming" until the coordinator clicks
  // Complete on the Reports tab — see the matching badge on the Calendar
  // page's Upcoming Panels list.
  marksSubmitted?: boolean;
}

interface UpcomingDeadlinesProps {
  deadlines?: Deadline[];
  // Coordinator Dashboard passes this so the widget only surfaces panels
  // still awaiting evaluation — a panel stays in `deadlines` (still
  // "upcoming") even after marksSubmitted flips true, right up until the
  // coordinator clicks Complete on the Reports tab, so without this the
  // list fills up with panels that no longer need the coordinator's
  // attention. The Student Dashboard reuses this same component without
  // the flag, since "✓ Marked" is a useful status to a student, not noise.
  pendingOnly?: boolean;
}

const formatDay = (date: string): { day: string; month: string } => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '--', month: '---' };
  }

  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
};

// startTime comes straight from the DB's TIME column (e.g. "09:30:00", 24hr
// with seconds) via dashboardController's upcomingDeadlinesQuery — only used
// for display here.
const formatTime12Hour = (value: string): string => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines = [], pendingOnly = false }) => {
  const visibleDeadlines = pendingOnly ? deadlines.filter((d) => !d.marksSubmitted) : deadlines;
  const emptyMessage =
    pendingOnly && deadlines.length > 0
      ? "You're all caught up — no panels waiting for evaluation."
      : 'No upcoming panels found.';

  return (
    <div className="deadlines-card">
      <div className="card-header">
        <Icon size={20} className="header-icon" />
        <h3 className="card-title">{title}</h3>
      </div>

      <div className="deadlines-list">
        {visibleDeadlines.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', padding: '8px 0 4px' }}>
            {emptyMessage}
          </div>
        ) : (
          visibleDeadlines.map((deadline, index) => {
            const { day, month } = formatDay(deadline.date);
            const academicLevel = Number(deadline.academicLevel);
            const displayLevel = Number.isFinite(academicLevel)
              ? `Level ${Math.max(1, academicLevel)}`
              : 'Level 1';

            return (
              <div className="deadline-item" key={index}>
                <div className="date-box">
                  <span className="date-day">{day}</span>
                  <span className="date-month">{month}</span>
                </div>

                <div className="deadline-info">
                  <div className="deadline-title-row">
                    <h4 className="deadline-title">{deadline.title}</h4>
                    {deadline.marksSubmitted && (
                      <span
                        className="deadline-marks-badge"
                        title="Marks submitted — awaiting your confirmation"
                      >
                        ✓ Marked
                      </span>
                    )}
                  </div>
                  <p className="deadline-subtitle">
                    {deadline.targetGroup || displayLevel}
                    {deadline.startTime ? ` • ${formatTime12Hour(deadline.startTime)}` : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;