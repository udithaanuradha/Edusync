import React, { useState, useEffect } from 'react';
import { FolderKanban, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import './StatCard.css';

interface StatData {
  totalGroups: number;
  ongoingCount: number;
  delayedCount: number;
  completedCount: number;
  completionRate: number;
}

interface StatCardProps {
  title: string;
  value: number | null;
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
      <p className="stat-value">{value !== null ? value : <span className="stat-skeleton stat-skeleton-value" />}</p>
      <p className="stat-title">{title}</p>
      <p className={`stat-subtitle ${subtitleColorClass}`}>
        {value !== null ? subtitle : <span className="stat-skeleton stat-skeleton-subtitle" />}
      </p>
    </div>
  </div>
);

const CARD_TEMPLATES = [
  {
    title: 'Assigned Groups',
    icon: FolderKanban,
    iconBgClass: 'icon-bg-blue',
    iconColorClass: 'icon-color-blue',
    subtitleColorClass: 'subtitle-blue',
    getSubtitle: () => 'Total assignments',
    getValue: (s: StatData) => s.totalGroups,
  },
  {
    title: 'Ongoing Projects',
    icon: Clock,
    iconBgClass: 'icon-bg-green',
    iconColorClass: 'icon-color-green',
    subtitleColorClass: 'subtitle-green',
    getSubtitle: () => 'Active now',
    getValue: (s: StatData) => s.ongoingCount,
  },
  {
    title: 'Delayed Projects',
    icon: AlertCircle,
    iconBgClass: 'icon-bg-orange',
    iconColorClass: 'icon-color-orange',
    subtitleColorClass: 'subtitle-orange',
    getSubtitle: (s: StatData) => s.delayedCount > 0 ? `${s.delayedCount} need attention` : 'All on track',
    getValue: (s: StatData) => s.delayedCount,
  },
  {
    title: 'Completed',
    icon: CheckCircle,
    iconBgClass: 'icon-bg-teal',
    iconColorClass: 'icon-color-teal',
    subtitleColorClass: 'subtitle-teal',
    getSubtitle: (s: StatData) => `${s.completionRate}% completion`,
    getValue: (s: StatData) => s.completedCount,
  },
];

const StatCards: React.FC = () => {
  const [stats, setStats] = useState<StatData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const url = mentorId 
          ? `http://localhost:5000/api/mentor/stats?mentorId=${mentorId}`
          : 'http://localhost:5000/api/mentor/stats';
        const response = await fetch(url, {
          headers: mentorId ? { 'x-user-id': String(mentorId) } : {}
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="stats-grid">
      {CARD_TEMPLATES.map(card => (
        <StatCard
          key={card.title}
          title={card.title}
          icon={card.icon}
          iconBgClass={card.iconBgClass}
          iconColorClass={card.iconColorClass}
          subtitleColorClass={card.subtitleColorClass}
          value={stats ? card.getValue(stats) : null}
          subtitle={stats ? card.getSubtitle(stats) : ''}
        />
      ))}
    </div>
  );
};

export default StatCards;
