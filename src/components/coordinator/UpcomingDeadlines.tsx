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

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines = [] }) => {
  return (
    <div className="deadlines-card">
      <div className="card-header">
        <Calendar size={20} className="header-icon" />
        <h3 className="card-title">Upcoming Deadlines</h3>
      </div>

      <div className="deadlines-list">
        {deadlines.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', padding: '8px 0 4px' }}>
            No upcoming deadlines found.
          </div>
        ) : (
          deadlines.map((deadline, index) => {
            const { day, month } = formatDay(deadline.date);

            return (
              <div className="deadline-item" key={index}>
                <div className="date-box">
                  <span className="date-day">{day}</span>
                  <span className="date-month">{month}</span>
                </div>

                <div className="deadline-info">
                  <h4 className="deadline-title">{deadline.title}</h4>
                  <p className="deadline-subtitle">
                    {deadline.targetGroup ? deadline.targetGroup : deadline.academicLevel ? `Level ${deadline.academicLevel}` : 'General'}
                    {deadline.startTime ? ` • ${deadline.startTime}` : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <button className="view-all-btn">View Full Calendar</button>
    </div>
  );
};

export default UpcomingDeadlines;