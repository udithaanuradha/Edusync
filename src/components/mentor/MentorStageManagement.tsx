import React, { useState, useEffect } from 'react';
import { Download, FileText, Clock, Info, ExternalLink, Link2 } from 'lucide-react';
import './MentorStageManagement.css';

interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  coordinator_name?: string;
  coordinator_academic_unit?: string;
  resource_links?: string;
  files?: Array<{
    file_id: number;
    file_name: string;
    file_url: string;
  }>;
}

const MentorStageManagement: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  // Format download URLs properly (both relative /uploads and remote Cloudinary URLs)
  const getFileUrl = (rawUrl?: string) => {
    if (!rawUrl) return '#';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return `http://localhost:5000${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  // Clean and sanitize external resource URLs
  const getCleanResourceUrl = (url?: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  // Robust file downloader for local and Cloudinary files
  const handleDownload = async (url: string, fileName: string) => {
    const fullUrl = getFileUrl(url);
    try {
      // Create temporary invisible link for native download trigger
      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', fileName || 'document.pdf');
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Native download trigger failed, opening URL in new tab:', err);
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Open coordinator shared documents or Google Sheets in new tab
  const handleOpenLink = (url: string) => {
    const cleanUrl = getCleanResourceUrl(url);
    if (cleanUrl) {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (mentorId) headers['x-user-id'] = String(mentorId);
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = mentorId
          ? `http://localhost:5000/api/mentor/stages/${levelNumber}?mentorId=${mentorId}`
          : `http://localhost:5000/api/mentor/stages/${levelNumber}`;

        const response = await fetch(url, { headers });
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setStages(result.data);
        } else if (Array.isArray(result)) {
          setStages(result);
        }
      } catch (err) {
        console.error("Mentor Stage Documents Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, [levelNumber]);

  if (loading) return <div className="mentor-loading">Loading Stage Documents...</div>;

  return (
    <div className="mentor-stage-container">
      <div className="mentor-header">
        <div>
          <h3>Level {levelNumber} Stage Documents</h3>
          <p className="subtitle">View stage documents and download required guidelines and attachments.</p>
        </div>
        <div className="mentor-badge">Read Only Mode</div>
      </div>

      <div className="mentor-stages-list">
        {stages.length > 0 ? (
          stages.map((stage, index) => {
            const hasFiles = Boolean(stage.files && stage.files.length > 0);
            const hasLink = Boolean(stage.resource_links && stage.resource_links.trim());

            return (
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
                          <span className="value">{stage.description || 'No description provided.'}</span>
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
                      <h5><FileText size={16} /> Coordinator Documents & Attachments:</h5>
                      <div className="file-list-stack">

                        {/* Coordinator Document / Sheet Link */}
                        {hasLink && (
                          <div className="file-card-row link-row">
                            <div className="file-info-box link-info-box">
                              <Link2 size={16} className="link-doc-icon" />
                              <div className="link-meta-block">
                                <span className="link-doc-title">Coordinator Shared Document / Sheet</span>
                                <span className="link-doc-url">{stage.resource_links}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenLink(stage.resource_links!)}
                              className="btn-open-link"
                              title="Open document in a new tab"
                            >
                              <ExternalLink size={14} /> Open Document
                            </button>
                          </div>
                        )}

                        {/* Uploaded Stage Files */}
                        {hasFiles && stage.files!.map((file) => (
                          <div key={file.file_id} className="file-card-row">
                            <div className="file-info-box">
                              <FileText size={15} /> 
                              <span>{file.file_name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownload(file.file_url, file.file_name)}
                              className="btn-download-green"
                              title="Download attachment"
                            >
                              <Download size={14} /> Download
                            </button>
                          </div>
                        ))}

                        {/* Empty state if neither files nor links exist */}
                        {!hasFiles && !hasLink && (
                          <span className="no-files-text">No stage documents or links provided.</span>
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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