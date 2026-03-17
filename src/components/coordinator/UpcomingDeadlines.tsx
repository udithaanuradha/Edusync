import React from 'react';
import { Calendar } from 'lucide-react';
import './UpcomingDeadlines.css';

interface Deadline {
  day: string;
  month: string;
  title: string;
  groupType: string;
}

const deadlinesData: Deadline[] = [
  {
    day: '15',
    month: 'DEC',
    title: 'Project Proposal Review',
    groupType: 'Level 2 Projects',
  },
  {
    day: '20',
    month: 'DEC',
    title: 'Mid-Term Evaluation',
    groupType: 'Level 3 Projects',
  },
  {
    day: '05',
    month: 'JAN',
    title: 'Final Code Submission',
    groupType: 'Level 4 Projects',
  },
];

const UpcomingDeadlines: React.FC = () => {
  return (
    <div className="deadlines-card">
      <div className="card-header">
        <Calendar size={20} className="header-icon" />
        <h3 className="card-title">Upcoming Deadlines</h3>
      </div>

      <div className="deadlines-list">
        {deadlinesData.map((deadline, index) => (
          <div className="deadline-item" key={index}>
            
            {/* The Calendar Date Box */}
            <div className="date-box">
              <span className="date-day">{deadline.day}</span>
              <span className="date-month">{deadline.month}</span>
            </div>

            {/* The Deadline Details */}
            <div className="deadline-info">
              <h4 className="deadline-title">{deadline.title}</h4>
              <p className="deadline-subtitle">{deadline.groupType}</p>
            </div>

          </div>
        ))}
      </div>
      
      <button className="view-all-btn">View Full Calendar</button>
    </div>
  );
};

export default UpcomingDeadlines;