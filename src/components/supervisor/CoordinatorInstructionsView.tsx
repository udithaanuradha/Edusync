import React, { useEffect, useState } from 'react';
import './CoordinatorInstructionsView.css';

interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  level?: string;
  files?: Array<{
    file_id?: number;
    file_name: string;
    file_url: string;
    uploaded_by?: number;
    uploaded_at?: string;
  }>;
}

interface CoordinatorInstructionsViewProps {
  levelNumber: number;
}

const CoordinatorInstructionsView: React.FC<CoordinatorInstructionsViewProps> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch stages: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setStages(data.data);
        } else {
          throw new Error('Invalid response format from backend');
        }

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [levelNumber]);

  return (
    <div className="supervisor-instructions-view stage-management-container">
      <div className="stages-timeline">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h4>Loading stages...</h4>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h4>Error loading stages</h4>
            <p>{error}</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h4>No stages created yet</h4>
            <p>No coordinator instructions are available for this level yet.</p>
          </div>
        ) : (
          <div className="timeline-list">
            {stages.map((stage, index) => (
              <div
                key={stage.stage_id}
                className="timeline-item"
                style={{ transition: 'all 0.3s ease' }}
              >
                <div className="timeline-marker">
                  <span className="stage-number">{index + 1}</span>
                </div>

                <div className="timeline-content">
                  <div className="stage-header-row">
                    <div style={{ flex: 1 }}>
                      <h4 className="stage-name">{stage.stage_name}</h4>
                    </div>
                  </div>

                  <div className="stage-info" style={{ marginTop: '12px' }}>
                    {stage.description && (
                      <div className="info-item">
                        <span className="info-label">Description:</span>
                        <span className="info-value">{stage.description}</span>
                      </div>
                    )}
                    {stage.deadline && (
                      <div className="info-item">
                        <span className="info-label">Deadline:</span>
                        <span className="info-value">
                          {new Date(stage.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {stage.level && (
                      <div className="info-item">
                        <span className="info-label">Level:</span>
                        <span className="info-value">Level {stage.level}</span>
                      </div>
                    )}
                    {stage.files && stage.files.length > 0 && (
                      <div className="info-item">
                        <span className="info-label">Documents:</span>
                        <div style={{ marginTop: '8px' }}>
                          {stage.files.map((file, idx) => (
                            <div key={idx} style={{ marginBottom: '6px' }}>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                              >
                                📄 {file.file_name}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorInstructionsView;
