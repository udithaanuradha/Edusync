 import React from 'react';
import './RecentProjects.css';

interface Project {
  name: string;
  group: string;
  members: number;
  status: 'On Track' | 'Delayed';
  progress: number;
  taskStats: string;
}

const projects: Project[] = [
  {
    name: 'Smart Campus Navigation',
    group: 'Group A',
    members: 3,
    status: 'On Track',
    progress: 62,
    taskStats: '1 completed · 1 in progress · 0 delayed'
  },
  {
    name: 'Attendance via Face Recognition',
    group: 'Group C',
    members: 2,
    status: 'Delayed',
    progress: 28,
    taskStats: '1 completed · 0 in progress · 1 delayed'
  },
  {
    name: 'Library Management System',
    group: 'Group B',
    members: 3,
    status: 'On Track',
    progress: 85,
    taskStats: '1 completed · 2 in progress · 0 delayed'
  }
];

const RecentProjects: React.FC = () => {
  return (
    <div className="projects-container">
      <h3 className="section-title">Assigned Projects</h3>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <div key={index} className="project-card">
            <div className="card-header">
              <h4 className="project-name">{project.name}</h4>
              <span className={`status-badge ${project.status.toLowerCase().replace(' ', '-')}`}>
                {project.status}
              </span>
            </div>

            <p className="group-info">{project.group} · {project.members} members</p>

            <div className="progress-section">
              <div className="progress-labels">
                <span>Progress</span>
                <span className="progress-val">{project.progress}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${project.progress}%`,
                    backgroundColor: project.status === 'Delayed' ? '#ef4444' : '#6366f1' 
                  }}
                ></div>
              </div>
            </div>

            <p className="task-summary">{project.taskStats}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentProjects;