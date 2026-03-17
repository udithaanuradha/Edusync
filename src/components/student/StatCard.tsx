 import React from 'react';
import { FolderKanban, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  colorClass: string;
}

const statData: StatCardProps[] = [
  {
    title: 'Total Projects',
    value: '24',
    subtext: '+3 this month',
    icon: <FolderKanban size={24} />,
    colorClass: 'icon-blue',
  },
  {
    title: 'Active Students',
    value: '120',
    subtext: '+8 new',
    icon: <Users size={24} />,
    colorClass: 'icon-green',
  },
  {
    title: 'Pending Evaluations',
    value: '8',
    subtext: '3 due soon',
    icon: <AlertCircle size={24} />,
    colorClass: 'icon-orange',
  },
  {
    title: 'Completed Projects',
    value: '16',
    subtext: '67% completion',
    icon: <CheckCircle2 size={24} />,
    colorClass: 'icon-teal',
  },
];

const StatCards: React.FC = () => {
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