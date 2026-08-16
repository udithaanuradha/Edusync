import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import "./SupervisorDashboard.css";
import "./SupervisorLevelPage.css";

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================

interface SupervisorLevelPageProps {
  levelNumber: number; // The specific academic/project level this page manages
}

// Data models for the three main entities: Stages, Groups, and Submissions
type StageFile = {
  file_id?: number;
  file_name: string;
  file_url: string;
  uploaded_by?: number;
  uploaded_at?: string;
  uploaded_by_role?: string;
};

type Stage = {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  level?: string;
  files?: StageFile[];
};

type GroupItem = {
  id: number | string;
  name: string;
  leader: string;
  members: string;
  memberCount: number;
  supervisorId: string;
  supervisorName: string;
  level: number | null;
};

type SubmissionItem = {
  requestId: number;
  projectName: string;
  groupName: string;
  groupLeader: string;
  members: string;
  studentMessage: string;
  studentName: string;
  levelLabel: string;
  status: string;
  supervisorId: string;
  supervisorName: string;
};

// UI and User specific types
type TabKey = "stages" | "groups" | "submissions";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  name?: string;
  full_name?: string;
  fullName?: string;
};

type ViewerIdentity = {
  idStr: string;
  name: string;
};

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const MAX_STAGE_VIEW = 3;
const GROUPS_API_BASE = "http://localhost:5000/api/groups";

// ============================================================================
// 3. UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely extracts an array from unpredictable backend payload structures.
 * Checks various common keys (requests, results, data, groups) if the root isn't an array.
 */
const toArray = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  if (payload && typeof payload === "object") {
    const data = payload as {
      requests?: unknown[];
      results?: unknown[];
      data?: unknown[];
      groups?: unknown[];
    };
    if (Array.isArray(data.requests))
      return data.requests as Record<string, unknown>[];
    if (Array.isArray(data.results))
      return data.results as Record<string, unknown>[];
    if (Array.isArray(data.data)) return data.data as Record<string, unknown>[];
    if (Array.isArray(data.groups))
      return data.groups as Record<string, unknown>[];
  }

  return [];
};

/** Normalizes text by lowercasing and removing extra spaces for accurate comparisons. */
const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

/** Retrieves and parses the user object stored in localStorage. */
const parseUserFromStorage = (): StoredUser => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    return JSON.parse(raw) as StoredUser;
  } catch {
    return {};
  }
};

/** Constructs a reliable ViewerIdentity (ID and Name) from local storage data. */
const getViewerIdentity = (): ViewerIdentity => {
  const storedUser = parseUserFromStorage();
  const id = storedUser.id ?? storedUser.user_id ?? "";

  const firstName = String(
    storedUser.first_name ?? storedUser.firstName ?? "",
  ).trim();
  const lastName = String(
    storedUser.last_name ?? storedUser.lastName ?? "",
  ).trim();
  const fallbackName = String(
    storedUser.full_name ?? storedUser.fullName ?? storedUser.name ?? "",
  ).trim();
  const joinedName = `${firstName} ${lastName}`.trim();

  return {
    idStr: String(id),
    name: normalizeText(joinedName || fallbackName),
  };
};

/**
 * Validates if a particular group/submission belongs to the currently logged-in supervisor.
 * Checks against both ID and Name to accommodate variations in backend data.
 */
const belongsToViewer = (
  supervisorId: string,
  supervisorName: string,
  viewer: ViewerIdentity,
): boolean => {
  const hasSupervisorRef = Boolean(supervisorId || supervisorName);
  if (!hasSupervisorRef) {
    return false;
  }

  const reqSupervisorId = String(supervisorId || "").trim();
  const reqSupervisorName = normalizeText(supervisorName || "");

  const idMatch = Boolean(
    viewer.idStr && reqSupervisorId && viewer.idStr === reqSupervisorId,
  );
  const nameMatch = Boolean(
    viewer.name && reqSupervisorName && reqSupervisorName.includes(viewer.name),
  );

  return idMatch || nameMatch;
};

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================

const SupervisorLevelPage: React.FC<SupervisorLevelPageProps> = ({
  levelNumber,
}) => {
  // Memoize the viewer identity so it doesn't recalculate on every render
  const viewer = useMemo(() => getViewerIdentity(), []);

  // UI State
  const [activeTab, setActiveTab] = useState<TabKey>("stages");

  // Data States
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  // Loading States
  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  // Error States
  const [stagesError, setStagesError] = useState("");
  const [groupsError, setGroupsError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");

  // --- API Fetching Methods ---

  /** Fetches the project stages applicable to the current level */
  const loadStages = async () => {
    setLoadingStages(true);
    setStagesError("");
    try {
      const response = await fetch(
        `http://localhost:5000/api/projects/level/${levelNumber}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch stages: ${response.statusText}`);
      }

      const data = await response.json();
      const list = data?.success && Array.isArray(data?.data) ? data.data : [];

      // Normalize data to ensure it fits the Stage interface
      const normalized = list
        .map(
          (item: Record<string, unknown>): Stage => ({
            stage_id: String(item.stage_id ?? item.id ?? ""),
            stage_name: String(
              item.stage_name ?? item.name ?? "Untitled Stage",
            ),
            description: String(item.description ?? ""),
            deadline: item.deadline ? String(item.deadline) : undefined,
            level: item.level ? String(item.level) : undefined,
            files: Array.isArray(item.files) ? (item.files as StageFile[]) : [],
          }),
        )
        .filter((stage: Stage) => Boolean(stage.stage_id || stage.stage_name))
        .slice(0, MAX_STAGE_VIEW);

      setStages(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load stages.";
      setStagesError(message);
      setStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  /** Fetches all student groups and filters them by the current supervisor */
  const loadGroups = async () => {
    setLoadingGroups(true);
    setGroupsError("");
    try {
      const response = await fetch(`${GROUPS_API_BASE}/level/${levelNumber}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`);
      }

      const payload = await response.json();
      // Normalize group data handling variations in property names from the API
      const normalized = toArray(payload)
        .map(
          (item): GroupItem => ({
            id:
              (item.group_id as number | string | undefined) ??
              (item.id as number | string | undefined) ??
              `tmp-${Math.random()}`,
            name: String(item.group_name ?? item.groupName ?? "Unnamed Group"),
            leader: String(
              item.group_leader ??
                item.leader_name ??
                item.leader ??
                "Not specified",
            ),
            members: String(
              item.members_list ?? item.members ?? "Not available",
            ),
            memberCount: Number(item.member_count ?? item.memberCount ?? 0),
            supervisorId: String(
              item.supervisor_id ??
                item.supervisorId ??
                item.assigned_supervisor_id ??
                "",
            ),
            supervisorName: String(
              item.supervisor_name ??
                item.supervisorName ??
                item.assigned_supervisor_name ??
                "",
            ),
            level:
              item.project_level !== undefined && item.project_level !== null
                ? Number(item.project_level)
                : item.level !== undefined && item.level !== null
                  ? Number(item.level)
                  : null,
          }),
        )
        // Filter out groups not matching the current level or supervisor
        .filter((group) => group.level === null || group.level === levelNumber)
        .filter((group) =>
          belongsToViewer(group.supervisorId, group.supervisorName, viewer),
        );

      setGroups(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load groups.";
      setGroupsError(message);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  /** Generates a list of potential API endpoints to try for fetching pending submissions */
  const getPendingPaths = (): string[] => {
    const idPath = viewer.idStr ? `/${encodeURIComponent(viewer.idStr)}` : "";
    return [
      `/pending${idPath}`,
      `/pending?supervisor_id=${encodeURIComponent(viewer.idStr)}`,
      "/pending-requests",
      "/pending-requests?status=pending",
      "/supervisor/pending-requests",
      `/supervisor/pending-requests${idPath}`,
      `/supervisor${idPath}/pending-requests`,
      `/supervisor/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
      `/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
      `/requests/supervisor${idPath}?status=pending`,
      "/supervisor/requests?status=pending",
    ];
  };

  /**
   * Fetches pending submissions. Since the backend endpoint might vary,
   * it tries multiple paths until one succeeds.
   */
  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    setSubmissionsError("");

    if (!viewer.idStr) {
      setSubmissionsError("Supervisor identity not found. Please login again.");
      setSubmissions([]);
      setLoadingSubmissions(false);
      return;
    }

    try {
      let loaded = false;
      const authHeaders = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      // Loop through fallback API paths
      for (const path of getPendingPaths()) {
        const response = await fetch(`${GROUPS_API_BASE}${path}`, {
          headers: authHeaders,
        });

        if (!response.ok) continue; // Try the next path if this one fails

        const payload = await response.json();

        // Normalize the payload from the successful endpoint
        const normalized = toArray(payload)
          .map(
            (item): SubmissionItem => ({
              requestId: Number(
                item.request_id ?? item.requestId ?? item.id ?? 0,
              ),
              projectName: String(
                item.project_name ?? item.projectName ?? "Untitled Project",
              ),
              groupName: String(
                item.group_name ?? item.groupName ?? "Unknown Group",
              ),
              groupLeader: String(
                item.group_leader ?? item.groupLeader ?? "N/A",
              ),
              members: String(item.members_list ?? item.members ?? "N/A"),
              studentMessage: String(
                item.request_message ?? item.message ?? "",
              ),
              studentName: String(
                item.student_name ?? item.studentName ?? "Student",
              ),
              levelLabel: String(item.project_level ?? item.level ?? "1"),
              status: String(item.status ?? item.request_status ?? "pending"),
              supervisorId: String(
                item.supervisor_id ??
                  item.supervisorId ??
                  item.assigned_supervisor_id ??
                  "",
              ),
              supervisorName: String(
                item.supervisor_name ??
                  item.supervisorName ??
                  item.assigned_supervisor_name ??
                  "",
              ),
            }),
          )
          .filter((item) => item.requestId > 0)
          .filter((item) => Number(item.levelLabel) === levelNumber)
          .filter((item) =>
            belongsToViewer(item.supervisorId, item.supervisorName, viewer),
          );

        setSubmissions(normalized);
        loaded = true;
        break; // Stop trying paths once we have a success
      }

      if (!loaded) {
        setSubmissionsError(
          "Unable to load level submissions. Verify pending request endpoints in backend.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load submissions.";
      setSubmissionsError(message);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Re-fetch all data whenever the levelNumber prop changes
  useEffect(() => {
    loadStages();
    loadGroups();
    loadSubmissions();
  }, [levelNumber]);

  // --- Render Helpers ---

  /** Renders the Stages tab content */
  const renderStages = () => {
    if (loadingStages)
      return (
        <p className="supervisor-level-muted">Loading project stages...</p>
      );
    if (stagesError)
      return <p className="supervisor-level-error">{stagesError}</p>;
    if (stages.length === 0)
      return (
        <p className="supervisor-level-muted">
          No stages found for this level.
        </p>
      );

    return (
      <div className="supervisor-level-card-grid">
        {stages.map((stage, index) => {
          // Filter files to only show those uploaded by a coordinator
          const coordinatorFiles = (stage.files || []).some(
            (file) =>
              (file.uploaded_by_role || "").toLowerCase() === "coordinator",
          )
            ? (stage.files || []).filter(
                (file) =>
                  (file.uploaded_by_role || "").toLowerCase() === "coordinator",
              )
            : stage.files || [];

          return (
            <article
              key={stage.stage_id || `${stage.stage_name}-${index}`}
              className="supervisor-level-card"
            >
              <div className="supervisor-level-card-head">
                <h4>
                  {index + 1}. {stage.stage_name}
                </h4>
                <span className="supervisor-pill">Level {levelNumber}</span>
              </div>

              {stage.description && (
                <p className="supervisor-level-card-desc">
                  {stage.description}
                </p>
              )}

              {stage.deadline && (
                <p className="supervisor-level-card-meta">
                  <strong>Deadline:</strong>{" "}
                  {new Date(stage.deadline).toLocaleDateString()}
                </p>
              )}

              <div className="supervisor-doc-list">
                <p>
                  <strong>Coordinator Documents</strong>
                </p>
                {coordinatorFiles.length === 0 ? (
                  <p className="supervisor-level-muted">
                    No coordinator documents uploaded yet.
                  </p>
                ) : (
                  <ul>
                    {coordinatorFiles.map((file, fileIndex) => (
                      <li key={`${stage.stage_id}-file-${fileIndex}`}>
                        <a
                          href={
                            file.file_url.startsWith("http")
                              ? file.file_url
                              : `http://localhost:5000${file.file_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file.file_name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  /** Renders the Groups tab content */
  const renderGroups = () => {
    if (loadingGroups)
      return (
        <p className="supervisor-level-muted">Loading project groups...</p>
      );
    if (groupsError)
      return <p className="supervisor-level-error">{groupsError}</p>;
    if (groups.length === 0) {
      return (
        <p className="supervisor-level-muted">
          No supervisor-assigned groups found for Level {levelNumber}.
        </p>
      );
    }

    return (
      <div className="supervisor-level-card-grid">
        {groups.map((group) => (
          <article key={group.id} className="supervisor-level-card">
            <div className="supervisor-level-card-head">
              <h4>{group.name}</h4>
              <span className="supervisor-pill">
                {group.memberCount || 0} members
              </span>
            </div>
            <p className="supervisor-level-card-meta">
              <strong>Leader:</strong> {group.leader}
            </p>
            <p className="supervisor-level-card-meta">
              <strong>Supervisor:</strong> {group.supervisorName || "Assigned"}
            </p>
            <p className="supervisor-level-card-meta">
              <strong>Members:</strong> {group.members}
            </p>
          </article>
        ))}
      </div>
    );
  };

  /** Renders the Submissions tab content */
  const renderSubmissions = () => {
    if (loadingSubmissions)
      return (
        <p className="supervisor-level-muted">Loading student submissions...</p>
      );
    if (submissionsError)
      return <p className="supervisor-level-error">{submissionsError}</p>;
    if (submissions.length === 0) {
      return (
        <p className="supervisor-level-muted">
          No approval requests found for Level {levelNumber}.
        </p>
      );
    }

    return (
      <div className="supervisor-level-card-grid">
        {submissions.map((item) => (
          <article key={item.requestId} className="supervisor-level-card">
            <div className="supervisor-level-card-head">
              <h4>{item.projectName}</h4>
              <span className="supervisor-pill">{item.status}</span>
            </div>
            <p className="supervisor-level-card-meta">
              <strong>Group:</strong> {item.groupName}
            </p>
            <p className="supervisor-level-card-meta">
              <strong>Leader:</strong> {item.groupLeader}
            </p>
            <p className="supervisor-level-card-meta">
              <strong>Student:</strong> {item.studentName}
            </p>
            <p className="supervisor-level-card-meta">
              <strong>Members:</strong> {item.members}
            </p>
            {item.studentMessage && (
              <p className="supervisor-level-card-meta">
                <strong>Message:</strong> {item.studentMessage}
              </p>
            )}
          </article>
        ))}
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="app-layout supervisor-shell">
      {/* Sidebar Navigation */}
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header />

        <main className="content-container supervisor-content-container">
          <div className="supervisor-level-page">
            {/* Page Header */}
            <div className="supervisor-level-header">
              <h2>Level {levelNumber} Management</h2>
              <p>
                Manage level-specific stages, supervisor-assigned groups, and
                approval submissions.
              </p>
            </div>

            {/* Tab Navigation */}
            <div
              className="supervisor-level-tabs"
              role="tablist"
              aria-label={`Level ${levelNumber} tabs`}
            >
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${activeTab === "stages" ? "active" : ""}`}
                aria-selected={activeTab === "stages"}
                onClick={() => setActiveTab("stages")}
              >
                Project Stages
              </button>
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${activeTab === "groups" ? "active" : ""}`}
                aria-selected={activeTab === "groups"}
                onClick={() => setActiveTab("groups")}
              >
                Project Groups
              </button>
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${activeTab === "submissions" ? "active" : ""}`}
                aria-selected={activeTab === "submissions"}
                onClick={() => setActiveTab("submissions")}
              >
                Student Submissions
              </button>
            </div>

            {/* Dynamic Content Panel based on selected tab */}
            <section className="supervisor-level-panel">
              {activeTab === "stages" && renderStages()}
              {activeTab === "groups" && renderGroups()}
              {activeTab === "submissions" && renderSubmissions()}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorLevelPage;
