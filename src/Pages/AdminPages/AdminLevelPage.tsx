import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import './AdminDashboard.css';

interface StageFile {
  file_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface Stage {
  stage_id: number;
  stage_name: string;
  description: string;
  deadline: string;
  level: number;
  created_at: string;
  mentor_details_url?: string;
  files?: StageFile[];
}

interface AdminLevelPageProps {
  levelNumber: number;
}

const AdminLevelPage: React.FC<AdminLevelPageProps> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStagesWithFiles();
  }, [levelNumber]);

  const fetchStagesWithFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      // We only need this one call because the backend already joins the files table
      const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
      const data = await response.json();

      if (data.success) {
        // data.data already contains the stages with their nested files array
        setStages(data.data);
      } else {
        setError('Failed to load stages');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'No deadline set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  const badgeStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    flexShrink: 0,
  };

  const fileLinkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '14px',
  };

  const mentorLinkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#ecfeff',
    borderRadius: '8px',
    color: '#0f766e',
    textDecoration: 'none',
    fontSize: '14px',
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-header-section">
            <h2 className="overview-title">Level {levelNumber} Project Stages</h2>
            <p className="overview-subtitle">
              Stages created by coordinator for Level {levelNumber} students.
            </p>
          </div>

          {error && (
            <div style={{ color: 'red', padding: '10px', marginBottom: '10px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              Loading stages...
            </div>
          ) : stages.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              color: '#6b7280',
            }}>
              <p style={{ fontSize: '18px' }}>📋 No stages created yet</p>
              <p>The coordinator has not created any stages for Level {levelNumber}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {stages.map((stage, index) => (
                <div key={stage.stage_id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={badgeStyle}>
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {stage.stage_name}
                      </h3>

                      {stage.description && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                          <span style={{ fontWeight: '500', color: '#374151' }}>Description:</span>
                          <span style={{ color: '#6b7280' }}>{stage.description}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                        <span style={{ fontWeight: '500', color: '#374151' }}>Deadline:</span>
                        <span style={{ color: stage.deadline ? '#dc2626' : '#9ca3af' }}>
                          {formatDate(stage.deadline)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                        <span style={{ fontWeight: '500', color: '#374151' }}>Created:</span>
                        <span style={{ color: '#6b7280' }}>{formatDate(stage.created_at)}</span>
                      </div>

                      {stage.mentor_details_url && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                          <span style={{ fontWeight: '500', color: '#374151' }}>Mentor Sheet:</span>
                          <a
                            href={stage.mentor_details_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={mentorLinkStyle}
                          >
                            Open industry mentor details
                          </a>
                        </div>
                      )}

                      {/* File Rendering Section */}
                      {stage.files && stage.files.length > 0 ? (
                        <div>
                          <p style={{ fontWeight: '500', color: '#374151', fontSize: '14px', marginBottom: '8px' }}>
                            Documents ({stage.files.length}):
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {stage.files.map((file) => (
                              <a 
                                key={file.file_id} 
                                href={file.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={fileLinkStyle}
                              >
                                📄 {file.file_name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#9ca3af', fontSize: '14px' }}>No documents uploaded</p>
                      )}
                    </div>

                    <div style={{
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      flexShrink: 0,
                    }}>
                      View Only
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLevelPage;