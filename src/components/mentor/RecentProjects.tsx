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
        // Replace with your actual API endpoint
        const response = await fetch('http://localhost:5000/api/mentor/projects');
        const data = await response.json();
        setProjects(data);
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
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
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
                    // Dynamic color based on status[cite: 12]
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