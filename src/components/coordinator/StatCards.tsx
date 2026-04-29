import React from 'react';
import { FolderKanban, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import './StatCards.css';

interface DashboardStats {
  totalProjects: number;
  activeStudents: number;
  pendingEvaluations: number;
  completedProjects: number;
}

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface StatCardsProps {
  stats?: DashboardStats | null;
}

const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const resolvedStats: DashboardStats = stats ?? {
    totalProjects: 0,
    activeStudents: 0,
    pendingEvaluations: 0,
    completedProjects: 0,
  };

  const completionRate = resolvedStats.totalProjects > 0
    ? Math.round((resolvedStats.completedProjects / resolvedStats.totalProjects) * 100)
    : 0;

  const statData: StatCardProps[] = [
    {
      title: 'Total Projects',
      value: String(resolvedStats.totalProjects),
      subtext: 'Across all coordinator groups',
      icon: <FolderKanban size={24} />,
      colorClass: 'icon-blue',
    },
    {
      title: 'Active Students',
      value: String(resolvedStats.activeStudents),
      subtext: 'Registered student accounts',
      icon: <Users size={24} />,
      colorClass: 'icon-green',
    },
    {
      title: 'Pending Evaluations',
      value: String(resolvedStats.pendingEvaluations),
      subtext: 'Still waiting for marks',
      icon: <AlertCircle size={24} />,
      colorClass: 'icon-orange',
    },
    {
      title: 'Completed Projects',
      value: String(resolvedStats.completedProjects),
      subtext: `${completionRate}% completion rate`,
      icon: <CheckCircle2 size={24} />,
      colorClass: 'icon-teal',
    },
  ];

  return (
    <div className="stat-cards-container">
      {statData.map((stat, index) => (
        <div className="stat-card" key={index}>
          <div className={`stat-icon-wrapper ${stat.colorClass}`}>
            {stat.icon}
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{stat.value}</h3>
            <p className="stat-title">{stat.title}</p>
            <p className="stat-subtext">{stat.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;