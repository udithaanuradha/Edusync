import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import './ApprovedRequests.css';
import { ApprovedGroupRequest, ApprovedRequestMember } from './groupRequestTypes';

type ApiRecord = Record<string, unknown>;

interface ApprovedRequestsProps {
  levelNumber: number;
  onCreateGroup: (request: ApprovedGroupRequest) => void;
}

const API_BASE = 'http://localhost:5000/api/groups';

const toArray = (payload: unknown): ApiRecord[] => {
  if (Array.isArray(payload)) return payload as ApiRecord[];

  if (payload && typeof payload === 'object') {
    const data = payload as { requests?: unknown[]; results?: unknown[]; data?: unknown[] };
    if (Array.isArray(data.requests)) return data.requests as ApiRecord[];
    if (Array.isArray(data.results)) return data.results as ApiRecord[];
    if (Array.isArray(data.data)) return data.data as ApiRecord[];
  }

  return [];
};

const normalizeRequest = (item: ApiRecord): ApprovedGroupRequest => ({
  id: Number(item.request_id ?? item.requestId ?? item.id ?? 0),
  projectName: String(item.project_name ?? item.projectName ?? 'Untitled Project'),
  groupName: String(item.group_name ?? item.groupName ?? 'Unnamed Group'),
  groupLeader: String(item.group_leader ?? item.groupLeader ?? 'Not provided'),
  membersList: String(item.members_list ?? item.members ?? ''),
  supervisorName: String(item.supervisor_name ?? item.supervisorName ?? 'Not assigned'),
  studentId: Number(item.student_id ?? item.studentId ?? 0) || undefined,
  projectLevel: Number(item.project_level ?? item.projectLevel ?? 0) || undefined,
  resolvedMembers: Array.isArray(item.resolved_members)
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
    : undefined,
});

const ApprovedRequests: React.FC<ApprovedRequestsProps> = ({ levelNumber, onCreateGroup }) => {
  const [requests, setRequests] = useState<ApprovedGroupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApprovedRequests = async () => {
    setLoading(true);
    setError('');

    const endpoints = [
      `${API_BASE}/coordinator/approved?level=${levelNumber}`,
      `${API_BASE}/coordinator/requests?status=approved&is_final_submitted=1&level=${levelNumber}`,
      `${API_BASE}/requests?status=approved&is_final_submitted=1&level=${levelNumber}`,
      `${API_BASE}/approved?level=${levelNumber}`,
      `${API_BASE}/final-submissions?level=${levelNumber}`,
    ];

    const authHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    try {
      let existingGroupNames = new Set<string>();

      try {
        const groupsResponse = await fetch(`http://localhost:5000/api/groups/level/${levelNumber}`);
        if (groupsResponse.ok) {
          const groupsPayload = await groupsResponse.json();
          const groupList = Array.isArray(groupsPayload?.data)
            ? groupsPayload.data
            : Array.isArray(groupsPayload?.groups)
              ? groupsPayload.groups
              : [];

          existingGroupNames = new Set(
            (groupList as ApiRecord[])
              .map((group) => String(group.group_name ?? group.groupName ?? group.name ?? '').trim().toLowerCase())
              .filter((name) => !!name)
          );
        }
      } catch {
        // Continue without filtering if groups endpoint is not available.
      }

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, { headers: authHeaders });
        if (!response.ok) continue;

        const payload = await response.json();
        const normalized = toArray(payload)
          .map(normalizeRequest)
          .filter((request) => request.id > 0);

        const filtered = normalized.filter(
          (request) => !existingGroupNames.has(request.groupName.trim().toLowerCase())
        );

        setRequests(filtered);
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
  }, [levelNumber]);

  return (
    <div className="approved-requests-wrap">
      <div className="approved-requests-head">
        <div>
          <h3>Approved Group Formations</h3>
          <p>
            These requests were approved by supervisors and submitted to coordinator workflow.
            Click Create Group to prefill the group creation modal.
          </p>
        </div>
        <button type="button" className="approved-refresh-btn" onClick={loadApprovedRequests}>
          Refresh
        </button>
      </div>

      {loading && <p className="approved-muted">Loading approved requests...</p>}
      {!loading && error && <p className="approved-error">{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <p className="approved-muted">No approved requests found for Level {levelNumber}.</p>
      )}

      <div className="approved-grid">
        {requests.map((request) => (
          <article className="approved-card" key={request.id}>
            <div className="approved-badge-row">
              <span className="approved-status-badge">
                <CheckCircle2 size={14} /> Supervisor Approved
              </span>
            </div>

            <h4>Group: {request.groupName}</h4>
            <p><strong>Project Name:</strong> {request.projectName}</p>
            <p><strong>Supervisor:</strong> {request.supervisorName}</p>
            <p><strong>Group Leader:</strong> {request.groupLeader}</p>

            <div className="approved-members-box">
              <p className="approved-members-title">Submitted Members List:</p>
              <p className="approved-members-content">{request.membersList || 'No members submitted.'}</p>
            </div>

            <div className="approved-action-row">
              <button type="button" className="approved-create-btn" onClick={() => onCreateGroup(request)}>
                Create Group
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ApprovedRequests;
