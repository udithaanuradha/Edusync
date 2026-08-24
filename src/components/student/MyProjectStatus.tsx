 import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle, FiUsers, FiCalendar } from 'react-icons/fi';
import './MyProjectStatus.css';

interface DashboardStats {
  completionPercent: number | null;
  completedTasksCount: number;
  totalTasksCount: number;
  delayedCount: number;
  membersCount: number;
  nearestDeadline: { date: string; title?: string } | null;
}

interface MyProjectStatusProps {
  stats?: DashboardStats | null;
  loading?: boolean;
}

const formatDeadline = (date: string | null | undefined): string => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', { day: 'numeric', month: 'short' });
};

const MyProjectStatus: React.FC<MyProjectStatusProps> = ({ stats, loading }) => {
  const hasStats = Boolean(stats);

  const completionValue = loading
    ? '—'
    : hasStats && stats!.completionPercent !== null
    ? `${stats!.completionPercent}%`
    : '—';

  const tasksDoneValue = loading
    ? '—'
    : hasStats && stats!.totalTasksCount > 0
    ? `${stats!.completedTasksCount}/${stats!.totalTasksCount}`
    : '—';

  const delayedValue = loading ? '—' : hasStats ? String(stats!.delayedCount) : '—';

  const membersValue = loading ? '—' : hasStats ? String(stats!.membersCount) : '—';

  const deadlineValue = loading
    ? '—'
    : hasStats && stats!.nearestDeadline
    ? formatDeadline(stats!.nearestDeadline.date)
    : '—';

  const stat = [
    { id: 'completion', label: 'Completion', value: completionValue, icon: <FiCheckCircle />, color: '#059669', bg: '#ecfdf5' },
    { id: 'tasks-done', label: 'Tasks Done', value: tasksDoneValue, icon: <FiClock />, color: '#2563eb', bg: '#eff6ff' },
    { id: 'delayed', label: 'Delayed', value: delayedValue, icon: <FiAlertCircle />, color: '#dc2626', bg: '#fef2f2' },
    { id: 'members', label: 'Members', value: membersValue, icon: <FiUsers />, color: '#d97706', bg: '#fffbeb' },
    { id: 'deadline', label: 'Deadline', value: deadlineValue, icon: <FiCalendar />, color: '#4b5563', bg: '#f9fafb' },
  ];

  return (
    <div className="student-stats-grid">
      {stat.map((s) => (
        <div key={s.id} className="stat-card-view">
          <div className="stat-icon-box" style={{ backgroundColor: s.bg, color: s.color }}>
            {s.icon}
          </div>
          <div className="stat-text-content">
            <span className="stat-value-text">{s.value}</span>
            <span className="stat-label-text">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyProjectStatus;
