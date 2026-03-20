// src/components/mentor/StatCards.tsx
import React from 'react';
import { FolderKanban, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import './StatCard.css';

// ── Inline mock data (replace with API call when backend is ready) ─────────
const projects = [
  { status: 'On Track' },
  { status: 'Delayed'  },
  { status: 'On Track' },
];
// ──────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBgClass: string;
  iconColorClass: string;
  subtitle: string;
  subtitleColorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, icon: Icon,
  iconBgClass, iconColorClass,
  subtitle, subtitleColorClass,
}) => (
  <div className="stat-card">
    <div className={`stat-icon-wrapper ${iconBgClass}`}>
      <Icon size={22} className={iconColorClass} />
    </div>
    <div className="stat-info">
      <p className="stat-value">{value}</p>
      <p className="stat-title">{title}</p>
      <p className={`stat-subtitle ${subtitleColorClass}`}>{subtitle}</p>
    </div>
  </div>
);

const StatCards: React.FC = () => {
  const total     = projects.length;
  const ongoing   = projects.filter(p => p.status === 'On Track' || p.status === 'In Progress').length;
  const delayed   = projects.filter(p => p.status === 'Delayed').length;
  const completed = projects.filter(p => p.status === 'Completed').length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cards: StatCardProps[] = [
    {
      title: 'Assigned Groups', value: total, icon: FolderKanban,
      iconBgClass: 'icon-bg-blue', iconColorClass: 'icon-color-blue',
      subtitle: '+3 this month', subtitleColorClass: 'subtitle-blue',
    },
    {
      title: 'Ongoing Projects', value: ongoing, icon: Clock,
      iconBgClass: 'icon-bg-green', iconColorClass: 'icon-color-green',
      subtitle: '+2 active', subtitleColorClass: 'subtitle-green',
    },
    {
      title: 'Delayed Projects', value: delayed, icon: AlertCircle,
      iconBgClass: 'icon-bg-orange', iconColorClass: 'icon-color-orange',
      subtitle: delayed > 0 ? `${delayed} need attention` : 'All on track',
      subtitleColorClass: 'subtitle-orange',
    },
    {
      title: 'Completed', value: completed, icon: CheckCircle,
      iconBgClass: 'icon-bg-teal', iconColorClass: 'icon-color-teal',
      subtitle: `${rate}% completion`, subtitleColorClass: 'subtitle-teal',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map(card => <StatCard key={card.title} {...card} />)}
    </div>
  );
};

export default StatCards;