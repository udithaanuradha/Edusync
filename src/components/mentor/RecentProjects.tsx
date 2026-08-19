import React, { useState, useEffect } from 'react';
import './RecentProjects.css';

interface Project {
  id: string;
  name: string;
  group: string;
  members: number;
  status: 'On Track' | 'Delayed';
  progress: number;
  taskStats: string;
}

const RecentProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const url = mentorId 
          ? `http://localhost:5000/api/mentor/projects?mentorId=${mentorId}`
          : 'http://localhost:5000/api/mentor/projects';
        const response = await fetch(url, {
          headers: mentorId ? { 'x-user-id': String(mentorId) } : {}
        });
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div className="projects-container">Loading projects...</div>;

  return (
    <div className="projects-container">
      <h3 className="section-title">Assigned Projects</h3>
      {projects.length === 0 ? (
        <p className="no-projects-text" style={{ color: '#64748b', padding: '16px 0' }}>
          No projects currently assigned to you.
        </p>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="card-header">
                <h4 className="project-name">{project.name}</h4>
                <span className={`status-badge ${project.status.toLowerCase().replace(' ', '-')}`}>
                  {project.status}
                </span>
              </div>

              <p className="group-info">{project.group} • {project.members} members</p>

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
      )}
    </div>
  );
};

export default RecentProjects;
