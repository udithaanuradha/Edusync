import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import SupervisorFeedback from "../../components/supervisor/SupervisorFeedback";
import SupervisorGroupMarks from "../../components/supervisor/SupervisorGroupMarks";
import { Award, ListTodo } from "lucide-react";
import "./SupervisorDashboard.css";
import "./SupervisorLevelPage.css";

interface SupervisorLevelPageProps {
  levelNumber?: number; // 🎯 App.tsx එකෙන් pass නොකළද error නොඑන සේ optional (?) කරන ලදී
}

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

type TabKey = "stages" | "groups" | "submissions" | "progress";

type ProgressGroupItem = {
  groupId: number;
  groupName: string;
  level: number;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  totalMilestones: number;
  approvedMilestones: number;
};

type ProgressMilestone = {
  id: number;
  title: string;
  description?: string;
  status: string;
  start_date?: string;
  due_date?: string;
  total: number;
  completed: number;
  percent: number;
};

type ProgressMember = {
  id: number | string;
  name: string;
  university_id?: string;
  is_leader?: number | boolean;
  total: number;
  completed: number;
  percent: number;
};

type ProgressTask = {
  id: number;
  milestone_id: number;
  milestone_title: string;
  assigned_to: number | string;
  assigned_to_name: string;
  task_name: string;
  description?: string;
  status: string;
  due_date?: string;
  created_at?: string;
};

type ProgressDetail = {
  group: { id: number; name: string; level: number };
  overall: { total: number; completed: number; percent: number };
  milestones: ProgressMilestone[];
  members: ProgressMember[];
  tasks: ProgressTask[];
};

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

const MAX_STAGE_VIEW = 3;
const GROUPS_API_BASE = "http://localhost:5000/api/groups";
const PROGRESS_API_BASE = "http://localhost:5000/api/supervice-st-progress";

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

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const parseUserFromStorage = (): StoredUser => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    return JSON.parse(raw) as StoredUser;
  } catch {
    return {};
  }
};

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

const SupervisorLevelPage: React.FC<SupervisorLevelPageProps> = ({
  levelNumber: propsLevelNumber,
}) => {
  const navigate = useNavigate();

  // 🎯 URL Parameter (:levelNumber) හෝ Props හරහා එන level එක Dynamic ලෙස ගනී
  const { levelNumber: urlLevelNumber } = useParams<{ levelNumber: string }>();
  const levelNumber = propsLevelNumber ?? Number(urlLevelNumber) ?? 1;

  // Deep-link support (e.g. from the Overview dashboard's group card):
  // ?tab=progress&groupId=123 opens straight into that group's progress
  // detail instead of landing on the Stages tab / groups list.
  const [searchParams] = useSearchParams();
  const deepLinkGroupId = searchParams.get("groupId");
  const autoOpenedGroupRef = useRef(false);

  const viewer = useMemo(() => getViewerIdentity(), []);
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    searchParams.get("tab") === "progress" ? "progress" : "stages",
  );

  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  const [progressGroups, setProgressGroups] = useState<ProgressGroupItem[]>([]);
  const [selectedProgressGroupId, setSelectedProgressGroupId] = useState<number | null>(null);
  const [progressDetail, setProgressDetail] = useState<ProgressDetail | null>(null);
  const [loadingProgressGroups, setLoadingProgressGroups] = useState(true);
  const [loadingProgressDetail, setLoadingProgressDetail] = useState(false);
  const [progressError, setProgressError] = useState("");
  // Drill-down within a selected group's detail panel: at most one of these
  // is set at a time — picking a milestone lists that milestone's tasks,
  // picking a student lists that student's tasks across the whole group.
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | string | null>(null);
  // The Overview dashboard's "View Full Progress" button links here for
  // exactly the milestone/task detail it's showing a preview of — so a
  // groupId deep link should land on the "Milestone & Task Progress"
  // sub-view, not the default "Student Marks & Grades" one.
  const [progressSubTab, setProgressSubTab] = useState<'marks' | 'tasks'>(() =>
    deepLinkGroupId ? 'tasks' : 'marks',
  );

  // 🎯 Real DB Result මත පමණක් button එක පෙන්නීමට default = false කර ඇත
  const [isEvaluatorAssigned, setIsEvaluatorAssigned] = useState<boolean>(false);

  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const [stagesError, setStagesError] = useState("");
  const [groupsError, setGroupsError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");

  // 🎯 REAL Backend Evaluator Check Logic
  const checkEvaluatorAssignment = async () => {
    try {
      const userRaw = localStorage.getItem("user");
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const joinedName = [userObj?.first_name, userObj?.last_name].filter(Boolean).join(" ");
      const currentUserName = userObj?.name || userObj?.full_name || joinedName || viewer.name || "";
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/evaluation-panels/check-evaluator?level=${levelNumber}&evaluatorName=${encodeURIComponent(currentUserName)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (response.ok) {
        const resData = await response.json();
        setIsEvaluatorAssigned(resData.isEvaluator === true);
      } else {
        setIsEvaluatorAssigned(false);
      }
    } catch (err) {
      console.error("Failed to verify evaluator assignment:", err);
      setIsEvaluatorAssigned(false);
    }
  };

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

  const loadGroups = async () => {
    setLoadingGroups(true);
    setGroupsError("");

    if (!viewer.idStr) {
      setGroupsError("Supervisor identity not found. Please login again.");
      setGroups([]);
      setLoadingGroups(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/groupdetailstosupervisordashboard/level/${levelNumber}/supervisor/${encodeURIComponent(viewer.idStr)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`);
      }

      const payload = await response.json();
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
              item.members ?? item.members_list ?? "Not available"
            ),
            memberCount: Number(item.memberCount ?? item.member_count ?? 0),
            supervisorId: String(
              item.supervisor_id ??
              item.supervisorId ??
              item.assigned_supervisor_id ??
              "",
            ),
            supervisorName: String(
              item.supervisor_name ??
              item.supervisorName ??
              item.supervisor ??
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
        .filter((group) => group.level === null || group.level === levelNumber);
      // No belongsToViewer re-filter here (unlike loadSubmissions below) —
      // this endpoint's SQL already scopes to
      // `supervisor_id = ? OR supervisor_id_2 = ?` server-side, and the
      // response's single supervisorId/supervisorName field is always the
      // *primary* supervisor, so re-filtering against it here would wrongly
      // drop every group where the viewer is only the second supervisor.

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

      for (const path of getPendingPaths()) {
        const response = await fetch(`${GROUPS_API_BASE}${path}`, {
          headers: authHeaders,
        });
        if (!response.ok) continue;

        const payload = await response.json();
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
        break;
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
  const loadProgressGroups = async () => {
    setLoadingProgressGroups(true);
    setProgressError("");

    if (!viewer.idStr) {
      setProgressError("Supervisor identity not found. Please login again.");
      setProgressGroups([]);
      setLoadingProgressGroups(false);
      return;
    }

    try {
      const response = await fetch(
        `${PROGRESS_API_BASE}/level/${levelNumber}/supervisor/${encodeURIComponent(viewer.idStr)}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }

      const payload = await response.json();
      const normalized: ProgressGroupItem[] = toArray(payload).map((item) => ({
        groupId: Number(item.groupId ?? item.group_id ?? 0),
        groupName: String(item.groupName ?? item.group_name ?? "Unnamed Group"),
        level: Number(item.level ?? levelNumber),
        memberCount: Number(item.memberCount ?? 0),
        totalTasks: Number(item.totalTasks ?? 0),
        completedTasks: Number(item.completedTasks ?? 0),
        progressPercent: Number(item.progressPercent ?? 0),
        totalMilestones: Number(item.totalMilestones ?? 0),
        approvedMilestones: Number(item.approvedMilestones ?? 0),
      }));

      setProgressGroups(normalized);
      // Land on the group list first; only keep a prior selection if that
      // group is still in this level's list (e.g. re-fetch after a status
      // change), otherwise reset to the list view.
      setSelectedProgressGroupId((prev) => {
        const stillPresent = prev && normalized.some((g) => g.groupId === prev);
        if (!stillPresent) {
          setSelectedMilestoneId(null);
          setSelectedStudentId(null);
        }
        return stillPresent ? prev : null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load progress.";
      setProgressError(message);
      setProgressGroups([]);
      setSelectedProgressGroupId(null);
      setSelectedMilestoneId(null);
      setSelectedStudentId(null);
    } finally {
      setLoadingProgressGroups(false);
    }
  };

  const loadProgressDetail = async (groupId: number) => {
    setLoadingProgressDetail(true);
    try {
      const response = await fetch(`${PROGRESS_API_BASE}/group/${groupId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to fetch group progress: ${response.statusText}`);
      }
      setProgressDetail(payload.data as ProgressDetail);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load group progress.";
      setProgressError(message);
      setProgressDetail(null);
    } finally {
      setLoadingProgressDetail(false);
    }
  };

  useEffect(() => {
    loadStages();
    loadGroups();
    loadSubmissions();
    checkEvaluatorAssignment();
    loadProgressGroups();
  }, [levelNumber]);

  useEffect(() => {
    if (selectedProgressGroupId) {
      loadProgressDetail(selectedProgressGroupId);
    } else {
      setProgressDetail(null);
    }
  }, [selectedProgressGroupId]);

  // Once the deep-linked group actually shows up in this level's progress
  // list, open it — once only, so it doesn't fight a user who's since
  // navigated back to the group list.
  useEffect(() => {
    if (autoOpenedGroupRef.current || !deepLinkGroupId || progressGroups.length === 0) return;
    const match = progressGroups.find((g) => g.groupId === Number(deepLinkGroupId));
    if (match) {
      autoOpenedGroupRef.current = true;
      openGroup(match.groupId);
    }
  }, [deepLinkGroupId, progressGroups]);

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

  // Completion-percent color band: fill carries the severity, track stays
  // neutral, and the percent is always shown as text alongside — color is a
  // reinforcement, never the only signal.
  const progressBandColor = (percent: number): string => {
    if (percent >= 75) return "var(--eds-color-success-solid)"; // good
    if (percent >= 40) return "#b45309"; // warning
    return "#d03b3b"; // critical (also covers 0 / no tasks yet)
  };

  const renderProgressMeter = (percent: number, fraction?: string) => (
    <div className="progress-meter">
      <div className="progress-meter-track">
        <div
          className="progress-meter-fill"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            background: progressBandColor(percent),
          }}
        />
      </div>
      <span className="progress-meter-label">
        {percent}%{fraction ? <span className="progress-meter-fraction"> ({fraction})</span> : null}
      </span>
    </div>
  );

  const milestoneStatusClass = (status: string): string => {
    const key = String(status || "").toLowerCase();
    if (key === "approved") return "supervisor-pill-approved";
    if (key === "rejected") return "supervisor-pill-rejected";
    return "supervisor-pill-pending";
  };

  const taskStatusClass = (status: string): string => {
    const key = String(status || "").toLowerCase();
    if (key === "completed") return "supervisor-pill-approved";
    if (key === "in_progress") return "supervisor-pill-inprogress";
    return "supervisor-pill-todo";
  };

  // Progress drill-down navigation: groups list -> group overview -> (at
  // most one of) milestone task list / student task list. Each "open"
  // clears any deeper selection so going back a level never lands on a
  // stale sub-view.
  const openGroup = (groupId: number) => {
    setSelectedMilestoneId(null);
    setSelectedStudentId(null);
    setSelectedProgressGroupId(groupId);
  };

  const backToGroupsList = () => {
    setSelectedMilestoneId(null);
    setSelectedStudentId(null);
    setSelectedProgressGroupId(null);
  };

  const backToGroupOverview = () => {
    setSelectedMilestoneId(null);
    setSelectedStudentId(null);
  };

  // "Delayed" applies once the due date has passed and the item hasn't
  // reached its done state (COMPLETED for a task, APPROVED for a milestone).
  const isPastDue = (dueDate?: string): boolean =>
    Boolean(dueDate) && new Date(dueDate as string).getTime() < Date.now();

  const daysLate = (dueDate: string): number =>
    Math.max(1, Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000));

  // Always shows a status — "On time" or "Delayed Nd" — rather than only
  // appearing when late, so the state is visible at a glance either way.
  const renderDelayedBadge = (dueDate: string | undefined, isDone: boolean) => {
    if (!dueDate) return null;
    const delayed = isPastDue(dueDate) && !isDone;
    return (
      <span className={`supervisor-pill ${delayed ? "supervisor-pill-delayed" : "supervisor-pill-on-time"}`}>
        {delayed ? `Delayed ${daysLate(dueDate)}d` : "On time"}
      </span>
    );
  };

  // Milestones have a real start_date; student_tasks has no start-date
  // column, so task rows pass created_at as their "Start" stand-in.
  const renderDateRange = (startDate?: string, dueDate?: string) => {
    if (!startDate && !dueDate) return null;
    return (
      <span className="supervisor-progress-row-due">
        {startDate ? `Start ${new Date(startDate).toLocaleDateString()}` : null}
        {startDate && dueDate ? " · " : null}
        {dueDate ? `Due ${new Date(dueDate).toLocaleDateString()}` : null}
      </span>
    );
  };

  const renderProgressGroupsList = () => (
    <div className="supervisor-level-card-grid">
      {progressGroups.map((group) => (
        <article
          key={group.groupId}
          className="supervisor-level-card supervisor-progress-card"
          onClick={() => openGroup(group.groupId)}
          role="button"
          tabIndex={0}
        >
          <div className="supervisor-level-card-head">
            <h4>{group.groupName}</h4>
            <span className="supervisor-pill">{group.memberCount} members</span>
          </div>
          {renderProgressMeter(
            group.progressPercent,
            `${group.completedTasks}/${group.totalTasks} tasks`,
          )}
          <p className="supervisor-level-card-meta">
            <strong>Milestones:</strong> {group.approvedMilestones}/{group.totalMilestones} approved
          </p>
        </article>
      ))}
    </div>
  );

  const renderProgressDetailPanel = () => {
    if (loadingProgressDetail) {
      return <p className="supervisor-level-muted">Loading group detail...</p>;
    }
    if (!progressDetail) {
      return <p className="supervisor-level-error">{progressError || "Failed to load group progress."}</p>;
    }

    return (
      <div className="supervisor-progress-detail">
        <button
          type="button"
          className="supervisor-progress-back"
          onClick={backToGroupsList}
        >
          ← Back to groups
        </button>

        <div className="supervisor-progress-detail-head">
          <h3>{progressDetail.group.name} — Overall Progress</h3>
          {renderProgressMeter(
            progressDetail.overall.percent,
            `${progressDetail.overall.completed}/${progressDetail.overall.total} tasks`,
          )}
        </div>

        <div className="supervisor-progress-section">
          <h4>Milestone Progress</h4>
          {progressDetail.milestones.length === 0 ? (
            <p className="supervisor-level-muted">No milestones created yet.</p>
          ) : (
            <div className="supervisor-progress-list">
              {progressDetail.milestones.map((m) => (
                <div
                  key={m.id}
                  className="supervisor-progress-row supervisor-progress-row-clickable"
                  onClick={() => setSelectedMilestoneId(m.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="supervisor-progress-row-head">
                    <span className="supervisor-progress-row-title">{m.title}</span>
                    <span className={`supervisor-pill ${milestoneStatusClass(m.status)}`}>
                      {m.status}
                    </span>
                    {renderDelayedBadge(m.due_date, m.status === "APPROVED")}
                    {renderDateRange(m.start_date, m.due_date)}
                    <SupervisorFeedback
                      kind="milestone"
                      groupId={progressDetail.group.id}
                      milestoneTitle={m.title}
                    />
                  </div>
                  {renderProgressMeter(m.percent, `${m.completed}/${m.total} tasks`)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="supervisor-progress-section">
          <h4>Student Progress</h4>
          {progressDetail.members.length === 0 ? (
            <p className="supervisor-level-muted">No members in this group.</p>
          ) : (
            <div className="supervisor-progress-list">
              {progressDetail.members.map((member) => {
                const delayedCount = progressDetail.tasks.filter(
                  (t) => t.assigned_to === member.id && isPastDue(t.due_date) && t.status !== "COMPLETED",
                ).length;

                return (
                  <div
                    key={member.id}
                    className="supervisor-progress-row supervisor-progress-row-clickable"
                    onClick={() => setSelectedStudentId(member.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="supervisor-progress-row-head">
                      <span className="supervisor-progress-row-title">
                        {member.name}
                        {(member.is_leader === 1 || member.is_leader === true) && (
                          <span className="supervisor-pill supervisor-pill-leader">Leader</span>
                        )}
                      </span>
                      <span className={`supervisor-pill ${delayedCount > 0 ? "supervisor-pill-delayed" : "supervisor-pill-on-time"}`}>
                        {delayedCount > 0 ? `${delayedCount} task(s) delayed` : "On time"}
                      </span>
                      {member.university_id && (
                        <span className="supervisor-progress-row-due">{member.university_id}</span>
                      )}
                    </div>
                    {renderProgressMeter(
                      member.percent,
                      `${member.completed}/${member.total} assigned tasks completed`,
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProgressTaskRow = (task: ProgressTask, subtitle: string) => (
    <div key={task.id} className="supervisor-progress-row">
      <div className="supervisor-progress-row-head">
        <span className="supervisor-progress-row-title">{task.task_name}</span>
        <span className={`supervisor-pill ${taskStatusClass(task.status)}`}>
          {task.status}
        </span>
        {renderDelayedBadge(task.due_date, task.status === "COMPLETED")}
        {renderDateRange(task.created_at, task.due_date)}
        <SupervisorFeedback
          kind="task"
          studentId={task.assigned_to}
          studentName={task.assigned_to_name}
          taskName={task.task_name}
          milestoneTitle={task.milestone_title}
        />
      </div>
      <p className="supervisor-progress-row-subtitle">{subtitle}</p>
      {task.description && (
        <p className="supervisor-level-card-desc">{task.description}</p>
      )}
    </div>
  );

  // Task list for one milestone: task name, description, assigned student,
  // status, dates.
  const renderMilestoneTasksPanel = () => {
    if (!progressDetail || selectedMilestoneId === null) return null;
    const milestone = progressDetail.milestones.find((m) => m.id === selectedMilestoneId);
    const tasks = progressDetail.tasks.filter((t) => t.milestone_id === selectedMilestoneId);

    return (
      <div className="supervisor-progress-detail">
        <button type="button" className="supervisor-progress-back" onClick={backToGroupOverview}>
          ← Back to {progressDetail.group.name}
        </button>

        <div className="supervisor-progress-detail-head">
          <h3>{milestone?.title || "Milestone"} — Tasks</h3>
          {milestone && (
            <div className="supervisor-progress-row-head">
              <span className={`supervisor-pill ${milestoneStatusClass(milestone.status)}`}>
                {milestone.status}
              </span>
              {renderDelayedBadge(milestone.due_date, milestone.status === "APPROVED")}
              {renderDateRange(milestone.start_date, milestone.due_date)}
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="supervisor-level-muted">No tasks created for this milestone yet.</p>
        ) : (
          <div className="supervisor-progress-list">
            {tasks.map((task) =>
              renderProgressTaskRow(task, `Assigned to: ${task.assigned_to_name}`),
            )}
          </div>
        )}
      </div>
    );
  };

  // Task list for one student: milestone number, task name, description,
  // status, dates — across every milestone in this group.
  const renderStudentTasksPanel = () => {
    if (!progressDetail || selectedStudentId === null) return null;
    const member = progressDetail.members.find((m) => m.id === selectedStudentId);
    const milestoneIndexById = new Map(
      progressDetail.milestones.map((m, index) => [m.id, index + 1]),
    );
    const tasks = progressDetail.tasks.filter((t) => t.assigned_to === selectedStudentId);

    return (
      <div className="supervisor-progress-detail">
        <button type="button" className="supervisor-progress-back" onClick={backToGroupOverview}>
          ← Back to {progressDetail.group.name}
        </button>

        <div className="supervisor-progress-detail-head">
          <h3>{member?.name || "Student"} — Assigned Tasks</h3>
          {member?.university_id && (
            <p className="supervisor-level-card-meta">{member.university_id}</p>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="supervisor-level-muted">No tasks assigned to this student yet.</p>
        ) : (
          <div className="supervisor-progress-list">
            {tasks.map((task) =>
              renderProgressTaskRow(
                task,
                `Milestone ${milestoneIndexById.get(task.milestone_id) ?? "?"} — ${task.milestone_title}`,
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  // Milestone and Task progress list & drill-down panels (Original View)
  const renderTasksMilestoneProgress = () => {
    if (loadingProgressGroups)
      return (
        <p className="supervisor-level-muted">Loading progress data...</p>
      );
    if (progressError && !selectedProgressGroupId)
      return <p className="supervisor-level-error">{progressError}</p>;
    if (progressGroups.length === 0) {
      return (
        <p className="supervisor-level-muted">
          No supervisor-assigned groups found for Level {levelNumber}.
        </p>
      );
    }

    if (!selectedProgressGroupId) return renderProgressGroupsList();
    if (selectedMilestoneId !== null) return renderMilestoneTasksPanel();
    if (selectedStudentId !== null) return renderStudentTasksPanel();
    return renderProgressDetailPanel();
  };

  // Progress tab: Allows toggling between Student Marks & Grades (for supervised groups) and Milestone/Task Progress
  const renderProgress = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Sub-View Switcher (Cards with soft icon badges and labels matching user theme) */}
        <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div
            onClick={() => setProgressSubTab('marks')}
            role="button"
            tabIndex={0}
            style={{
              position: 'relative',
              height: '52px',
              minHeight: '52px',
              padding: '8px 16px',
              borderRadius: '12px',
              border: progressSubTab === 'marks' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: progressSubTab === 'marks' ? '#ffffff' : '#ffffff',
              boxShadow: progressSubTab === 'marks'
                ? '0 4px 12px rgba(37, 99, 235, 0.12)'
                : '0 1px 3px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: progressSubTab === 'marks' ? '#1e40af' : '#1e293b' }}>
                Student Marks & Grades
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                Supervised Groups
              </div>
            </div>
          </div>

          <div
            onClick={() => setProgressSubTab('tasks')}
            role="button"
            tabIndex={0}
            style={{
              position: 'relative',
              height: '52px',
              minHeight: '52px',
              padding: '8px 16px',
              borderRadius: '12px',
              border: progressSubTab === 'tasks' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: progressSubTab === 'tasks' ? '#ffffff' : '#ffffff',
              boxShadow: progressSubTab === 'tasks'
                ? '0 4px 12px rgba(22, 163, 74, 0.12)'
                : '0 1px 3px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ListTodo size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: progressSubTab === 'tasks' ? '#15803d' : '#1e293b' }}>
                Milestone & Task Progress
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                Task Tracker
              </div>
            </div>
          </div>
        </div>

        {/* Sub-View Content */}
        {progressSubTab === 'marks' ? (
          <SupervisorGroupMarks
            levelNumber={levelNumber}
            supervisorId={viewer.idStr}
            supervisorName={viewer.name}
            assignedGroups={groups}
          />
        ) : (
          renderTasksMilestoneProgress()
        )}
      </div>
    );
  };

  const handleApproveRequest = async (requestId: number) => {
    if (!viewer.idStr) {
      setSubmissionsError("Supervisor identity not found. Please login again.");
      return;
    }

    try {
      setActionBusyId(requestId);
      const response = await fetch(`${GROUPS_API_BASE}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          supervisor_id: viewer.idStr,
          approved_by: viewer.idStr,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to approve request.");
      }

      setSubmissions((prev) => prev.filter((item) => item.requestId !== requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve request.";
      setSubmissionsError(message);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!viewer.idStr) {
      setSubmissionsError("Supervisor identity not found. Please login again.");
      return;
    }

    const reason = window.prompt("Please enter a rejection reason:", "Request does not meet the required criteria.");
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setSubmissionsError("Rejection reason is required.");
      return;
    }

    try {
      setActionBusyId(requestId);
      const response = await fetch(`${GROUPS_API_BASE}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          supervisor_id: viewer.idStr,
          rejected_by: viewer.idStr,
          rejection_reason: trimmedReason,
          reason: trimmedReason,
          reject_reason: trimmedReason,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reject request.");
      }

      setSubmissions((prev) => prev.filter((item) => item.requestId !== requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject request.";
      setSubmissionsError(message);
    } finally {
      setActionBusyId(null);
    }
  };

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

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleApproveRequest(item.requestId)}
                disabled={actionBusyId === item.requestId}
                style={{
                  background: "var(--eds-color-primary)",
                  color: "var(--eds-color-bg-surface)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: actionBusyId === item.requestId ? "not-allowed" : "pointer",
                  opacity: actionBusyId === item.requestId ? 0.7 : 1,
                }}
              >
                {actionBusyId === item.requestId ? "Processing..." : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => handleRejectRequest(item.requestId)}
                disabled={actionBusyId === item.requestId}
                style={{
                  background: "var(--eds-color-danger-solid)",
                  color: "var(--eds-color-bg-surface)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: actionBusyId === item.requestId ? "not-allowed" : "pointer",
                  opacity: actionBusyId === item.requestId ? 0.7 : 1,
                }}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="app-layout supervisor-shell">
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header />

        <main className="content-container supervisor-content-container">
          <div className="supervisor-level-page">
            <div
              className="supervisor-level-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ wordSpacing: '3px', letterSpacing: '0.2px' }}>Level {levelNumber} Management</h2>
                <p>
                  Manage level-specific stages, supervisor-assigned groups, and
                  approval submissions.
                </p>
              </div>
            </div>

            <div
              className="supervisor-level-tabs"
              role="tablist"
              aria-label={`Level ${levelNumber} tabs`}
            >
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${
                  activeTab === "stages" ? "active" : ""
                }`}
                aria-selected={activeTab === "stages"}
                onClick={() => setActiveTab("stages")}
              >
                Project Stages
              </button>
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${
                  activeTab === "groups" ? "active" : ""
                }`}
                aria-selected={activeTab === "groups"}
                onClick={() => setActiveTab("groups")}
              >
                Project Groups
              </button>
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${
                  activeTab === "submissions" ? "active" : ""
                }`}
                aria-selected={activeTab === "submissions"}
                onClick={() => setActiveTab("submissions")}
              >
                Student Submissions
              </button>
              <button
                type="button"
                role="tab"
                className={`supervisor-level-tab ${
                  activeTab === "progress" ? "active" : ""
                }`}
                aria-selected={activeTab === "progress"}
                onClick={() => setActiveTab("progress")}
              >
                Progress
              </button>
            </div>

            <section className="supervisor-level-panel">
              {activeTab === "stages" && renderStages()}
              {activeTab === "groups" && renderGroups()}
              {activeTab === "submissions" && renderSubmissions()}
              {activeTab === "progress" && renderProgress()}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorLevelPage;