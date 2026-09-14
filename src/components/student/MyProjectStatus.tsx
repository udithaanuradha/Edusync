import React from 'react';
import { FiCheckCircle, FiClock, FiAlertCircle, FiUsers, FiCalendar } from 'react-icons/fi';
import StatCard from '../shared/ui/StatCard';

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
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/**
 * Reads real data from the student dashboard summary endpoint's `stats`
 * object (dashboardController.js's getStudentSummary already computes all
 * five of these — completion, tasks done, delayed, members, and the
 * soonest upcoming deadline — scoped to the student's active group). Shows
 * "—" per card while loading or if the student has no active group yet,
 * rather than ever falling back to placeholder numbers.
 */
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

  const cards = [
    { label: 'Completion', value: completionValue, icon: <FiCheckCircle />, tone: 'success' as const },
    { label: 'Tasks Done', value: tasksDoneValue, icon: <FiClock />, tone: 'primary' as const },
    { label: 'Delayed', value: delayedValue, icon: <FiAlertCircle />, tone: 'danger' as const },
    { label: 'Members', value: membersValue, icon: <FiUsers />, tone: 'warning' as const },
    { label: 'Deadline', value: deadlineValue, icon: <FiCalendar />, tone: 'neutral' as const },
  ];

  return (
    <div className="student-stats-grid">
      {cards.map((card) => (
        <StatCard key={card.label} title={card.label} value={card.value} icon={card.icon} tone={card.tone} />
      ))}
    </div>
  );
};

export default MyProjectStatus;
