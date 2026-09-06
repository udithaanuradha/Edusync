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
}

interface UpcomingDeadlinesProps {
  deadlines?: Deadline[];
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

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines = [] }) => {
  return (
    <div className="deadlines-card">
      <div className="card-header">
        <Calendar size={20} className="header-icon" />
        <h3 className="card-title">Upcoming Panels</h3>
      </div>

      <div className="deadlines-list">
        {deadlines.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', padding: '8px 0 4px' }}>
            No upcoming panels found.
          </div>
        ) : (
          deadlines.map((deadline, index) => {
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
                  <h4 className="deadline-title">{deadline.title}</h4>
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