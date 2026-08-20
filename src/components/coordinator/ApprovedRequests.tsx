import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ApprovedRequests.css';
import { ApprovedGroupRequest, ApprovedRequestMember } from './groupRequestTypes';

type ApiRecord = Record<string, unknown>;

interface ApprovedRequestsProps {
  levelNumber: number;
  onCreateGroup: (request: ApprovedGroupRequest) => void;
}

const API_BASE = 'http://localhost:5000/api/groups';
const GROUP_STATE_CHANGED_EVENT = 'coordinator-group-state-changed';

const asTruthyBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', '1', 'yes', 'y', 'created', 'active'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'null', 'undefined'].includes(normalized)) return false;
    return Boolean(value);
  }
  return Boolean(value);
};

// Requests may arrive wrapped in different array keys depending on the backend route.
const toArray = (payload: unknown): ApiRecord[] => {
  if (Array.isArray(payload)) return payload as ApiRecord[];

  if (payload && typeof payload === 'object') {
    const data = payload as { requests?: unknown[]; results?: unknown[]; data?: unknown[] };
    if (Array.isArray(data.requests)) return data.requests as ApiRecord[];
    if (Array.isArray(data.results)) return data.results as ApiRecord[];
    if (Array.isArray(data.data)) return data.data as ApiRecord[];
    // Fallback: return the first top-level array found (tolerant parsing)
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val as ApiRecord[];
    }
  }

  return [];
};

const normalizeRequest = (item: ApiRecord): ApprovedGroupRequest => {
  const resolvedMembers: ApprovedRequestMember[] | undefined = Array.isArray(item.resolved_members)
    ? (item.resolved_members as ApiRecord[])
        .map((member): ApprovedRequestMember | null => {
          const id = Number(member.id ?? 0);
          const name = String(member.name ?? '').trim();
          const universityId = String(member.university_id ?? '').trim();
          if (!id || !name || !universityId) {
            return null;
          }
          return {
            id,
            name,
            university_id: universityId,
            email: String(member.email ?? '').trim() || undefined,
            level: Number(member.level ?? 0) || undefined,
          };
        })
        .filter((member): member is ApprovedRequestMember => member !== null)
    : undefined;

  const isGroupCreated =
    asTruthyBoolean(item.is_group_created) ||
    asTruthyBoolean(item.isGroupCreated) ||
    asTruthyBoolean(item.created_group_id) ||
    asTruthyBoolean(item.createdGroupId);

  return {
    id: Number(item.request_id ?? item.requestId ?? item.id ?? 0),
    projectName: String(
      item.project_name ?? item.projectName ?? item.request_message ?? item.requestMessage ?? 'Untitled Project'
    ),
    groupName: String(item.group_name ?? item.groupName ?? 'Unnamed Group'),
    groupLeader: String(item.group_leader ?? item.groupLeader ?? 'Not provided'),
    membersList: enrichMembersList(item, resolvedMembers),
    supervisorName: String(item.supervisor_name ?? item.supervisorName ?? 'Not assigned'),
    department: String(item.department ?? '') || undefined,
    studentId:
      Number(item.student_id ?? item.studentId ?? item.requester_id ?? item.requested_by ?? 0) || undefined,
    projectLevel: Number(item.project_level ?? item.projectLevel ?? 0) || undefined,
    resolvedMembers,
    status: String(item.status ?? item.request_status ?? '') || undefined,
    rejectionReason: String(item.rejection_reason ?? item.rejectionReason ?? item.reject_reason ?? '') || undefined,
    createdAt: String(item.created_at ?? item.createdAt ?? '') || undefined,
    isFinalSubmitted: Boolean(item.is_final_submitted ?? item.is_final_sub ?? item.isFinalSubmitted ?? false),
    isGroupCreated: isGroupCreated,
    raw: item as Record<string, unknown>,
  };
};

const formatResolvedMembers = (members?: ApprovedRequestMember[]): string => {
  if (!members || members.length === 0) return '';

  const leader = members[0]?.name ? `Leader: ${members[0].name}` : '';
  const others = members.slice(1).map((member) => `${member.name}${member.university_id ? ` (${member.university_id})` : ''}`);
  const parts = [leader, others.length > 0 ? `Members: ${others.join(', ')}` : ''].filter(Boolean);
  return parts.join(', ');
};

const enrichMembersList = (item: ApiRecord, resolvedMembers?: ApprovedRequestMember[]): string => {
  const directMembers = String(item.members_list ?? item.members ?? '').trim();
  if (directMembers) return directMembers;

  const resolvedText = formatResolvedMembers(resolvedMembers);
  if (resolvedText) return resolvedText;

  const resolvedRaw = Array.isArray(item.resolved_members) ? (item.resolved_members as ApiRecord[]) : [];
  if (resolvedRaw.length === 0) return '';

  const names = resolvedRaw
    .map((member) => String(member.name ?? '').trim())
    .filter(Boolean)
    .join(', ');

  return names ? `Members: ${names}` : '';
};

const isRealStudentSubmission = (request: ApprovedGroupRequest): boolean => {
  // Accept submissions even if `studentId` is missing, as some backends
  // store only textual fields (members_list, request_message). Require
  // a non-empty members list and a project name/message.
  const hasMeaningfulMembers = request.membersList.trim().length > 0;
  const hasMeaningfulProject = request.projectName.trim().length > 0;

  return hasMeaningfulMembers && hasMeaningfulProject;
};

const ApprovedRequests: React.FC<ApprovedRequestsProps> = ({ levelNumber, onCreateGroup }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovedGroupRequest[]>([]);
  const [existingGroupNames, setExistingGroupNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawPayloadForDev, setRawPayloadForDev] = useState<ApiRecord | ApiRecord[] | null>(null);
  const [statusView, setStatusView] = useState<'approved' | 'pending' | 'all'>('pending');

  const loadApprovedRequests = async () => {
    setLoading(true);
    setError('');

    const endpointsForStatus = (status: typeof statusView) => {
      // candidate paths collected from other components (supervisor flows)
      const common = [
        `${API_BASE}/requests?level=${levelNumber}`,
        `${API_BASE}/requests?status=pending&level=${levelNumber}`,
        `${API_BASE}/requests?status=approved&level=${levelNumber}`,
        `${API_BASE}/requests`,
        `${API_BASE}/requests?status=pending`,
        `${API_BASE}/pending`,
        `${API_BASE}/pending-requests`,
        `${API_BASE}/pending?level=${levelNumber}`,
        `${API_BASE}/pending-requests?level=${levelNumber}`,
        `${API_BASE}/coordinator/requests?level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/requests?status=pending&level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/requests?status=approved&level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/approved?level=${levelNumber}&coordinatorId=${user?.id}&finalOnly=1`,
        `${API_BASE}/coordinator/pending?level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/pending-requests?level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/all?level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/approved?level=${levelNumber}`,
        `${API_BASE}/final-submissions?level=${levelNumber}`,
      ];

      if (status === 'pending') {
        // prefer endpoints that explicitly request pending
        return [
          `${API_BASE}/requests?status=pending&level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/pending?level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/pending-requests?level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/coordinator/requests?status=pending&level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/requests?level=${levelNumber}&coordinatorId=${user?.id}`,
          ...common,
        ];
      }

      if (status === 'all') {
        return [
          `${API_BASE}/coordinator/requests?level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/requests?level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/coordinator/all?level=${levelNumber}&coordinatorId=${user?.id}`,
          `${API_BASE}/all?level=${levelNumber}&coordinatorId=${user?.id}`,
          ...common,
        ];
      }

      // default: approved/final-submitted
      return [
        `${API_BASE}/coordinator/approved?level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/coordinator/requests?status=approved&is_final_submitted=1&level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/requests?status=approved&is_final_submitted=1&level=${levelNumber}&coordinatorId=${user?.id}`,
        `${API_BASE}/approved?level=${levelNumber}`,
        `${API_BASE}/final-submissions?level=${levelNumber}`,
        ...common,
      ];
    };

    const token = localStorage.getItem('token');
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders.Authorization = `Bearer ${token}`;

    try {
      let nextExistingGroupNames = new Set<string>();

      try {
        const groupsResponse = await fetch(`http://localhost:5000/api/groups/coordinator/${user?.id}/${levelNumber}`);
        if (groupsResponse.ok) {
          const groupsPayload = await groupsResponse.json();
          const groupList = Array.isArray(groupsPayload?.data)
            ? groupsPayload.data
            : Array.isArray(groupsPayload?.groups)
              ? groupsPayload.groups
              : [];

          nextExistingGroupNames = new Set(
            (groupList as ApiRecord[])
              .map((group) => String(group.group_name ?? group.groupName ?? group.name ?? '').trim().toLowerCase())
              .filter((name) => !!name)
          );
        }
      } catch {
        // Continue without filtering if groups endpoint is not available.
      }

      setExistingGroupNames(nextExistingGroupNames);

      const endpoints = endpointsForStatus(statusView);

      for (const endpoint of endpoints) {
        if (import.meta.env.DEV) console.log('[ApprovedRequests] trying endpoint', endpoint, 'statusView=', statusView);
        const response = await fetch(endpoint, { headers: authHeaders });

        if (!response.ok) {
          if (import.meta.env.DEV) console.log('[ApprovedRequests] endpoint responded not ok', endpoint, response.status, response.statusText);
          continue;
        }

        const payload = await response.json();
        if (import.meta.env.DEV) console.log('[ApprovedRequests] payload', payload);
        const arr = toArray(payload);
        if (import.meta.env.DEV) console.log('[ApprovedRequests] extracted array length', Array.isArray(arr) ? arr.length : 0, arr);

        const mapped = arr.map(normalizeRequest);
        if (import.meta.env.DEV) console.log('[ApprovedRequests] mapped requests (pre-filter)', mapped);

        const normalized = mapped.filter((request) => request.id > 0 && isRealStudentSubmission(request));
        if (import.meta.env.DEV) console.log('[ApprovedRequests] normalized requests', normalized);

        setRequests(normalized);
        // store raw payload for optional UI dump in DEV
        if (import.meta.env.DEV) setRawPayloadForDev(payload as ApiRecord | ApiRecord[]);
        setLoading(false);
        return;
      }

      setError('Approved requests endpoint not available yet.');
    } catch {
      setError('Failed to load approved requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedRequests();
  }, [levelNumber, statusView]);

  useEffect(() => {
    const handleGroupStateChanged = () => {
      void loadApprovedRequests();
    };

    window.addEventListener(GROUP_STATE_CHANGED_EVENT, handleGroupStateChanged);
    return () => {
      window.removeEventListener(GROUP_STATE_CHANGED_EVENT, handleGroupStateChanged);
    };
  }, [levelNumber, statusView, user?.id]);

  return (
    <div className="approved-requests-wrap">
      <div className="approved-requests-head">
        <div>
          <h3>{statusView === 'pending' ? 'Pending Group Formations' : 'Approved Group Formations'}</h3>
          <p>
            {statusView === 'pending'
              ? 'These requests are waiting for coordinator group creation.'
              : 'These requests were approved by supervisors and submitted to coordinator workflow.'}
            Click Create Group to prefill the group creation modal.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="approved-refresh-btn" onClick={loadApprovedRequests}>
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="approved-muted">Loading approved requests...</p>}
      {!loading && error && <p className="approved-error">{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <p className="approved-muted">
          {statusView === 'pending'
            ? `No pending requests found for Level ${levelNumber}.`
            : `No approved requests found for Level ${levelNumber}.`}
        </p>
      )}

      <div className="approved-grid">
        {requests.map((request) => {
          const alreadyCreated =
            Boolean(request.isGroupCreated) ||
            asTruthyBoolean(request.raw?.is_group_created) ||
            asTruthyBoolean(request.raw?.created_group_id) ||
            asTruthyBoolean(request.raw?.createdGroupId) ||
            existingGroupNames.has(request.groupName.trim().toLowerCase());

          return (
            <article className="approved-card" key={request.id}>
              <div className="approved-badge-row">
                <span className="approved-status-badge">
                  <CheckCircle2 size={14} /> Supervisor Approved
                </span>
              </div>

              <h4>Group: {request.groupName}</h4>
              <div className="approved-meta-row">
                <span className="approved-meta">ID: {request.id}</span>
                {request.projectLevel !== undefined && (
                  <span className="approved-meta">Level: {request.projectLevel}</span>
                )}
                {request.studentId !== undefined && (
                  <span className="approved-meta">Student ID: {request.studentId}</span>
                )}
                {request.status && <span className="approved-meta">Status: {request.status}</span>}
                {request.createdAt && <span className="approved-meta">Submitted: {request.createdAt}</span>}
              </div>

              <p><strong>Project Name:</strong> {request.projectName}</p>
              <p><strong>Supervisor:</strong> {request.supervisorName}</p>
              <p><strong>Group Leader:</strong> {request.groupLeader}</p>

              <div className="approved-members-box">
                <p className="approved-members-title">Submitted Members List:</p>
                <p className="approved-members-content">{request.membersList || 'No members submitted.'}</p>
              </div>

              <div className="approved-action-row">
                {request.rejectionReason && (
                  <div className="approved-rejection">Rejection: {request.rejectionReason}</div>
                )}

                {alreadyCreated ? (
                  <button type="button" className="approved-create-btn approved-create-btn--disabled" disabled>
                    Already Created
                  </button>
                ) : (
                  <button type="button" className="approved-create-btn" onClick={() => onCreateGroup(request)}>
                    Create Group
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {/* DEV-only raw payload removed per request */}
    </div>
  );
};

export default ApprovedRequests;
