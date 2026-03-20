import React from 'react';
import { TrendingUp } from 'lucide-react';
import './RecentProjects.css';

interface Project {
  title: string;
  group: string;
  supervisor: string;
  status: 'In Progress' | 'Under Review' | 'Pending Approval';
  progress: number;
}

const recentProjectsData: Project[] = [
  {
    title: 'AI-Based Chatbot',
    group: 'Group A',
    supervisor: 'Dr. Smith',
    status: 'In Progress',
    progress: 75,
  },
  {
    title: 'E-Commerce Platform',
    group: 'Group B',
    supervisor: 'Dr. Johnson',
    status: 'Under Review',
    progress: 90,
  },
  {
    title: 'Mobile Learning App',
    group: 'Group C',
    supervisor: 'Dr. Williams',
    status: 'In Progress',
    progress: 60,
  },
  {
    title: 'Data Analytics Dashboard',
    group: 'Group D',
    supervisor: 'Dr. Brown',
    status: 'Pending Approval',
    progress: 45,
  },
];

const RecentProjects: React.FC = () => {
  // Helper function to pick the right badge color
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'In Progress': return 'status-progress';
      case 'Under Review': return 'status-review';
      case 'Pending Approval': return 'status-pending';
      default: return 'status-default';
    }
  };

  return (
    <div className="recent-projects-card">
      <div className="card-header">
        <TrendingUp size={20} className="header-icon" />
        <h3 className="card-title">Recent Projects</h3>
      </div>

      <div className="projects-list">
        {recentProjectsData.map((project, index) => (
          <div className="project-item" key={index}>
            
            {/* Left Side: Title and Details */}
            <div className="project-info">
              <h4 className="project-title">{project.title}</h4>
              <p className="project-subtitle">
                {project.group} • {project.supervisor}
              </p>
            </div>

            {/* Right Side: Badge and Progress Bar */}
            <div className="project-metrics">
              <span className={`status-badge ${getStatusClass(project.status)}`}>
                {project.status}
              </span>
              
              <div className="progress-container">
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{project.progress}%</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentProjects;