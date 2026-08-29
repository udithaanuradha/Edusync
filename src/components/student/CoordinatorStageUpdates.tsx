 import React, { useState, useEffect } from 'react';
import { Download, FileText, Clock } from 'lucide-react';
import './CoordinatorStageUpdates.css'; // Reuse your existing CSS

// Reuse your existing Stage interface
interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  level?: string;
  resource_links?: string;
  files?: Array<{
    file_id?: number;
    file_name: string;
    file_url: string;
  }>;
}

interface StudentStageViewProps {
  levelNumber: number;
}

const StudentStageView: React.FC<StudentStageViewProps> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        // Scope to the student's own degree program — the backend also
        // includes legacy/global stages (no academic_unit set) so this never
        // hides pre-existing stages.
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const academicUnit = user?.academic_unit ? `?academicUnit=${encodeURIComponent(user.academic_unit)}` : '';

        // Fetching from the same backend port you confirmed (5000)
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}${academicUnit}`);
        const data = await response.json();
        if (data.success) setStages(data.data);
      } catch (err) {
        console.error('❌ Error fetching stages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, [levelNumber]);

  // Function to handle secure Cloudinary downloads
  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank'); // Ensures it opens/downloads correctly
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading">Loading Project Stages...</div>;

  return (
    <div className="stage-management-container">
      <h3 className="text-xl font-bold mb-4">Project Timeline - Level {levelNumber}</h3>
      
      <div className="timeline-list">
        {stages.map((stage, index) => (
          <div key={stage.stage_id} className="timeline-item">
            <div className="timeline-marker">
              <span className="stage-number">{index + 1}</span>
            </div>

            <div className="timeline-content">
              <div className="stage-header-row">
                <h4 className="stage-name">{stage.stage_name}</h4>
                {stage.deadline && (
                  <span className="deadline-badge">
                    <Clock size={14} /> {new Date(stage.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              <p className="stage-description">{stage.description}</p>

              {stage.resource_links && (
                <div className="stage-info" style={{ marginTop: '8px' }}>
                  <div className="info-item">
                    <span className="info-label">Resource Link:</span>
                    <a
                      className="info-value"
                      href={stage.resource_links}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--eds-color-primary)', textDecoration: 'none', wordBreak: 'break-word' }}
                    >
                      🔗 View attached resource
                    </a>
                  </div>
                </div>
              )}

              {/* Downloadable Files Section */}
              {stage.files && stage.files.length > 0 && (
                <div className="student-files-section">
                  <p className="info-label">Coordinator Attachments:</p>
                  <div className="file-grid">
                    {stage.files.map((file, idx) => (
                      <div key={idx} className="student-file-card">
                        <div className="file-meta">
                          <FileText size={20} className="text-blue-500" />
                          <span className="file-name-text">{file.file_name}</span>
                        </div>
                        
                        {/* THE DOWNLOAD BUTTON */}
                        <button
                          onClick={() => handleDownload(file.file_url, file.file_name)}
                          className="btn-download-small"
                          title="Download Document"
                        >
                          <Download size={16} />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentStageView;