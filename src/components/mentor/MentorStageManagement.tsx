import React, { useState, useEffect } from 'react';
import { Download, FileText, Clock, Info } from 'lucide-react';
import './MentorStageManagement.css';

interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  files?: Array<{
    file_id: number;
    file_name: string;
    file_url: string;
  }>;
}

const MentorStageManagement: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
        const result = await response.json();
        if (result.success) setStages(result.data);
      } catch (err) {
        console.error("Mentor Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, [levelNumber]);

  if (loading) return <div className="mentor-loading">Loading Stage Details...</div>;

  return (
    <div className="mentor-stage-container">
      <div className="mentor-header">
        <div>
          <h3>Level {levelNumber} Projects</h3>
          <p className="subtitle">View project guidelines and download required documents.</p>
        </div>
        <div className="mentor-badge">Read Only Mode</div>
      </div>

      <div className="mentor-stages-list">
        {stages.length > 0 ? (
          stages.map((stage, index) => (
            <div key={stage.stage_id} className="mentor-stage-timeline-item">
              <div className="timeline-marker">
                <div className="timeline-circle">
                  <span>{index + 1}</span>
                </div>
                {index < stages.length - 1 && <div className="timeline-connector"></div>}
              </div>

              <div className="timeline-content">
                <div className="mentor-stage-card">
                  <div className="stage-top-flex-container">
                    <div className="description-side">
                      <h4>{stage.stage_name}</h4>
                      <div className="description-text">
                        <span className="label">Description:</span>
                        <span className="value">{stage.description}</span>
                      </div>
                    </div>

                    {stage.deadline && (
                      <div className="deadline-side">
                        <span className="deadline-label">Stage Deadline</span>
                        <div className="deadline-chip">
                          <Clock size={14} /> 
                          <span>{new Date(stage.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="stage-resources">
                    <h5><FileText size={16} /> Coordinator Attachments:</h5>
                    <div className="file-list-stack">
                      {stage.files && stage.files.length > 0 ? (
                        stage.files.map((file) => (
                          <div key={file.file_id} className="file-card-row">
                            <div className="file-info-box">
                              <FileText size={14} /> 
                              <span>{file.file_name}</span>
                            </div>
                            <a href={file.file_url} target="_blank" rel="noreferrer" className="btn-download-green">
                              <Download size={14} /> Download
                            </a>
                          </div>
                        ))
                      ) : (
                        <span className="no-files-text">No files provided.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* NEW: Structured Empty State Message */
          <div className="empty-state-wrapper">
            <div className="empty-state-card">
              <Info size={48} className="empty-icon" />
              <h4>No Updates Available</h4>
              <p>The project coordinator hasn't published any stage details or guidelines for Level {levelNumber} yet. Please check back later for updates.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorStageManagement;