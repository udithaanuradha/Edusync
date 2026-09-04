// Shared pending-group-request fetching for the supervisor role. Extracted
// from SupervisorApprovalPage so the dashboard's "Pending Approvals" stat
// card can show the same count/list without duplicating the endpoint-probe
// logic (the backend route for this list isn't nailed down to one path, so
// both callers need to try the same candidates).

export type PendingRequest = {
  requestId: number;
  projectName: string;
  groupName: string;
  groupLeader: string;
  members: string;
  studentMessage: string;
  studentName: string;
  levelLabel: string;
  supervisorId: string;
  supervisorName: string;
};

const API_BASE = 'http://localhost:5000/api/groups';

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
  first_name?: string;
  firstname?: string;
  firstName?: string;
  last_name?: string;
  lastname?: string;
  lastName?: string;
  name?: string;
  full_name?: string;
  fullName?: string;
};

export type ViewerIdentity = {
  idStr: string;
  name: string;
};

const toArray = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  if (payload && typeof payload === 'object') {
    const data = payload as { requests?: unknown[]; results?: unknown[]; data?: unknown[] };
    if (Array.isArray(data.requests)) return data.requests as Record<string, unknown>[];
    if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
    if (Array.isArray(data.data)) return data.data as Record<string, unknown>[];
  }

  return [];
};

const normalizeRequest = (item: Record<string, unknown>): PendingRequest => ({
  requestId: Number(item.request_id ?? item.requestId ?? item.id ?? 0),
  projectName: String(item.project_name ?? item.projectName ?? 'Untitled Project'),
  groupName: String(item.group_name ?? item.groupName ?? 'Unknown Group'),
  groupLeader: String(item.group_leader ?? item.groupLeader ?? 'N/A'),
  members: String(item.members_list ?? item.members ?? 'N/A'),
  studentMessage: String(item.request_message ?? item.message ?? ''),
  studentName: String(item.student_name ?? item.studentName ?? 'Student'),
  levelLabel: String(item.project_level ?? item.level ?? '1'),
  supervisorId: String(item.supervisor_id ?? item.supervisorId ?? item.assigned_supervisor_id ?? ''),
  supervisorName: String(item.supervisor_name ?? item.supervisorName ?? item.assigned_supervisor_name ?? ''),
});

const parseUserFromStorage = (): StoredUser => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    return JSON.parse(raw) as StoredUser;
  } catch {
    return {};
  }
};

const normalizeText = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const getViewerIdentity = (): ViewerIdentity => {
  const storedUser = parseUserFromStorage();
  const id = storedUser.id ?? storedUser.user_id ?? '';

  const firstName = String(
    storedUser.first_name ?? storedUser.firstname ?? storedUser.firstName ?? ''
  ).trim();
  const lastName = String(
    storedUser.last_name ?? storedUser.lastname ?? storedUser.lastName ?? ''
  ).trim();

  const fallbackName = String(storedUser.full_name ?? storedUser.fullName ?? storedUser.name ?? '').trim();
  const joinedName = `${firstName} ${lastName}`.trim();

  return {
    idStr: String(id),
    name: normalizeText(joinedName || fallbackName),
  };
};

const getPendingPaths = (viewer: ViewerIdentity): string[] => {
  const idPath = viewer.idStr ? `/${encodeURIComponent(viewer.idStr)}` : '';

  return [
    `/pending${idPath}`,
    `/pending?supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    '/pending-requests',
    '/pending-requests?status=pending',
    '/supervisor/pending-requests',
    `/supervisor/pending-requests${idPath}`,
    `/supervisor${idPath}/pending-requests`,
    `/supervisor/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    `/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    `/requests/supervisor${idPath}?status=pending`,
    '/supervisor/requests?status=pending',
  ];
};

const belongsToViewer = (request: PendingRequest, viewer: ViewerIdentity): boolean => {
  const hasSupervisorRef = Boolean(request.supervisorId || request.supervisorName);
  if (!hasSupervisorRef) {
    return true;
  }

  const reqSupervisorId = String(request.supervisorId || '').trim();
  const reqSupervisorName = normalizeText(request.supervisorName || '');
  const idMatch = Boolean(viewer.idStr && reqSupervisorId && viewer.idStr === reqSupervisorId);
  const nameMatch = Boolean(viewer.name && reqSupervisorName && reqSupervisorName.includes(viewer.name));
  return idMatch || nameMatch;
};

export type PendingApprovalResult = {
  requests: PendingRequest[];
  /** False when none of the candidate endpoints responded OK — distinct
   * from a successful load that just happens to have zero requests. */
  loaded: boolean;
};

/** Fetches this supervisor's pending group requests, trying each candidate
 * endpoint until one responds OK. Never throws; `loaded: false` signals
 * every candidate failed so callers can tell that apart from "genuinely no
 * pending requests". */
export const fetchPendingApprovalRequests = async (
  viewer: ViewerIdentity,
): Promise<PendingApprovalResult> => {
  if (!viewer.idStr) return { requests: [], loaded: false };

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  for (const path of getPendingPaths(viewer)) {
    try {
      const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders });
      if (!response.ok) continue;

      const data = await response.json();
      const normalized = toArray(data).map(normalizeRequest).filter((item) => item.requestId > 0);
      const requests = normalized.filter((request) => belongsToViewer(request, viewer));
      return { requests, loaded: true };
    } catch {
      // try the next candidate path
    }
  }

  return { requests: [], loaded: false };
};
