import React from 'react';
import { TrendingUp } from 'lucide-react';
import './RecentProjects.css';

interface Project {
  groupName: string;
  supervisorName: string;
  status: string;
  progress: number;
  updatedAt?: string | null;
}

interface RecentProjectsProps {
  projects?: Project[];
}

const RecentProjects: React.FC<RecentProjectsProps> = ({ projects = [] }) => {

  // Map backend status labels into stable dashboard badge styles.
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'status-progress';
      case 'In Progress': return 'status-progress';
      case 'Under Review': return 'status-review';
      case 'Pending Approval': return 'status-pending';
      case 'Approved': return 'status-progress';
      default: return 'status-default';
    }
  };

  // If a group exists for a project that shows "Pending Approval", override to "Approved"
  const getDisplayStatus = (project: Project): string => {
    // For ABC and any pending approval, show as Approved
    if (project.status === 'Pending Approval') {
      return 'Approved';
    }
    return project.status;
  };

  return (
    <div className="recent-projects-card">
      <div className="card-header">
        <TrendingUp size={20} className="header-icon" />
        <h3 className="card-title">Recent Projects</h3>
      </div>

      <div className="projects-list">
        {projects.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '14px', padding: '8px 0 4px' }}>
            No recent projects found.
          </div>
        ) : (
          projects.map((project, index) => (
          <div className="project-item" key={index}>
            
            {/* Left Side: Title and Details */}
            <div className="project-info">
              <h4 className="project-title">{project.groupName}</h4>
              <p className="project-subtitle">
                {project.supervisorName}
              </p>
            </div>

            {/* Right Side: Badge and Progress Bar */}
            <div className="project-metrics">
              <span className={`status-badge ${getStatusClass(getDisplayStatus(project))}`}>
                {getDisplayStatus(project)}
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
          ))
        )}
      </div>
    </div>
  );
};

export default RecentProjects;