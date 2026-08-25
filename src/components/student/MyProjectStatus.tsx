 import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle, FiUsers, FiCalendar } from 'react-icons/fi';
import StatCard from '../shared/ui/StatCard';

const MyProjectStatus: React.FC = () => {
  const stats = [
    { label: 'Completion', value: '75%', icon: <FiCheckCircle />, tone: 'success' as const },
    { label: 'Tasks Done', value: '12/15', icon: <FiClock />, tone: 'primary' as const },
    { label: 'Delayed', value: '1', icon: <FiAlertCircle />, tone: 'danger' as const },
    { label: 'Members', value: '3', icon: <FiUsers />, tone: 'warning' as const },
    { label: 'Deadline', value: '20 Dec', icon: <FiCalendar />, tone: 'neutral' as const },
  ];

  return (
    <div className="student-stats-grid">
      {stats.map((stat) => (
        <StatCard key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
      ))}
    </div>
  );
};

export default MyProjectStatus;