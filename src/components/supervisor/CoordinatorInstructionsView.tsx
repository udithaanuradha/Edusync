import React, { useEffect, useState } from "react";
import "./CoordinatorInstructionsView.css";

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================

/** Shape of a project stage retrieved from the backend */
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

/** Props for the view, specifically targeting a level number */
interface CoordinatorInstructionsViewProps {
  levelNumber: number;
}

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================

const CoordinatorInstructionsView: React.FC<
  CoordinatorInstructionsViewProps
> = ({ levelNumber }) => {
  // --- State Hooks ---
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Side Effects ---
  /**
   * Fetches stages whenever the levelNumber changes.
   * Ensures the UI stays in sync with the selected level.
   */
  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        // GET request to the project API based on level
        const response = await fetch(
          `http://localhost:5000/api/projects/level/${levelNumber}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch stages: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response structure
        if (data.success && Array.isArray(data.data)) {
          setStages(data.data);
        } else {
          throw new Error("Invalid response format from backend");
        }

        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setStages([]); // Reset list on error
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [levelNumber]);

  // ============================================================================
  // 3. RENDER LOGIC
  // ============================================================================

  return (
    <div className="supervisor-instructions-view stage-management-container">
      <div className="stages-timeline">
        {/* CASE 1: LOADING STATE */}
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h4>Loading stages...</h4>
          </div>
        ) : /* CASE 2: ERROR STATE */
        error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h4>Error loading stages</h4>
            <p>{error}</p>
          </div>
        ) : /* CASE 3: NO DATA FOUND */
        stages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h4>No stages created yet</h4>
            <p>No coordinator instructions are available for this level yet.</p>
          </div>
        ) : (
          /* CASE 4: DATA LIST (Timeline View) */
          <div className="timeline-list">
            {stages.map((stage, index) => (
              <div
                key={stage.stage_id}
                className="timeline-item"
                style={{ transition: "all 0.3s ease" }}
              >
                {/* Visual Circle Marker (Numbered) */}
                <div className="timeline-marker">
                  <span className="stage-number">{index + 1}</span>
                </div>

                {/* Main Instruction Content */}
                <div className="timeline-content">
                  <div className="stage-header-row">
                    <div style={{ flex: 1 }}>
                      <h4 className="stage-name">{stage.stage_name}</h4>
                    </div>
                  </div>

                  <div className="stage-info" style={{ marginTop: "12px" }}>
                    {/* Stage Description */}
                    {stage.description && (
                      <div className="info-item">
                        <span className="info-label">Description:</span>
                        <span className="info-value">{stage.description}</span>
                      </div>
                    )}

                    {/* Formatted Deadline */}
                    {stage.deadline && (
                      <div className="info-item">
                        <span className="info-label">Deadline:</span>
                        <span className="info-value">
                          {new Date(stage.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Level Badge */}
                    {stage.level && (
                      <div className="info-item">
                        <span className="info-label">Level:</span>
                        <span className="info-value">Level {stage.level}</span>
                      </div>
                    )}

                    {/* Document Attachments List */}
                    {stage.files && stage.files.length > 0 && (
                      <div className="info-item">
                        <span className="info-label">Documents:</span>
                        <div style={{ marginTop: "8px" }}>
                          {stage.files.map((file, idx) => (
                            <div key={idx} style={{ marginBottom: "6px" }}>
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="instruction-file-link"
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  fontSize: "14px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.textDecoration =
                                    "underline";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.textDecoration = "none";
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
