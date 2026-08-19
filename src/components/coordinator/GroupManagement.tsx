import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './GroupManagement.css';
import { ApprovedGroupRequest } from './groupRequestTypes';
import MemberProfileModal from '../shared/MemberProfileModal';

type GroupApiRecord = Record<string, unknown>;

interface Student {
  id: number;
  name: string;
  university_id: string;
  email: string;
  level: number;
}

interface SupervisorOption {
  id: number;
  name: string;
  email: string;
}

interface GroupMember {
  id?: number;
  name: string;
  university_id?: string;
}

interface GroupView {
  id: number | string;
  name: string;
  department?: string;
  supervisor: string;
  memberCount: number;
  members: GroupMember[];
  leaderName: string;
}

interface GroupManagementProps {
  levelNumber: number;
  initialRequest?: ApprovedGroupRequest | null;
  onPrefillHandled?: () => void;
}

const STUDENT_INDEX_REGEX = /\b\d{6}[A-Za-z]\b/g;
const GROUP_STATE_CHANGED_EVENT = 'coordinator-group-state-changed';

const normalizeIndex = (value?: string | null) => value?.trim().toUpperCase() ?? '';

// Backends in this project return different wrappers, so normalize them into one list shape.
const toArray = (payload: unknown): GroupApiRecord[] => {
  if (Array.isArray(payload)) {
    return payload as GroupApiRecord[];
  }

  if (payload && typeof payload === 'object') {
    const data = payload as {
      data?: unknown[];
      groups?: unknown[];
      results?: unknown[];
      requests?: unknown[];
    };

    if (Array.isArray(data.data)) return data.data as GroupApiRecord[];
    if (Array.isArray(data.groups)) return data.groups as GroupApiRecord[];
    if (Array.isArray(data.results)) return data.results as GroupApiRecord[];
    if (Array.isArray(data.requests)) return data.requests as GroupApiRecord[];
    // Fallback: if any top-level property is an array, return it (tolerant parsing)
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val as GroupApiRecord[];
    }
  }

  return [];
};

// Accept multiple id and name aliases so the coordinator UI keeps working across API variants.
const normalizeGroup = (raw: GroupApiRecord): GroupView => {
  const id =
    (raw.group_id as number | string | undefined) ??
    (raw.id as number | string | undefined) ??
    (raw.groupId as number | string | undefined) ??
    (raw.groupID as number | string | undefined) ??
    (raw.project_group_id as number | string | undefined) ??
    (raw.projectGroupId as number | string | undefined) ??
    (raw.server_id as number | string | undefined) ??
    (raw.serverId as number | string | undefined) ??
    `temp-${Math.random().toString(36).slice(2)}`;

  const name =
    (raw.group_name as string | undefined) ??
    (raw.groupName as string | undefined) ??
    (raw.name as string | undefined) ??
    'Unnamed Group';

  const supervisor =
    (raw.supervisor_name as string | undefined) ??
    (raw.supervisorName as string | undefined) ??
    (raw.supervisor as string | undefined) ??
    'Not assigned';

  const membersRaw = Array.isArray(raw.members) ? (raw.members as GroupApiRecord[]) : [];
  const members: GroupMember[] = membersRaw.map((m) => ({
    id: typeof m.id === 'number' ? m.id : undefined,
    name: (m.name as string | undefined) ?? 'Unknown student',
    university_id: m.university_id as string | undefined,
  }));

  const leaderName =
    (raw.leader_name as string | undefined) ??
    (raw.leaderName as string | undefined) ??
    (raw.leader as string | undefined) ??
    (members[0]?.name ?? 'Not set');

  const memberCount =
    (raw.member_count as number | undefined) ??
    (raw.memberCount as number | undefined) ??
    members.length;

  const department = (raw.department as string | undefined) ?? undefined;

  return { id, name, department, supervisor, memberCount, members, leaderName };
};

const GroupManagement: React.FC<GroupManagementProps> = ({ levelNumber, initialRequest = null, onPrefillHandled }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [supervisorQuery, setSupervisorQuery] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorOption | null>(null);
  const [supervisorOptions, setSupervisorOptions] = useState<SupervisorOption[]>([]);
  const [supervisorSearching, setSupervisorSearching] = useState(false);
  const [supervisorSearchError, setSupervisorSearchError] = useState<string | null>(null);
  const [leaderId, setLeaderId] = useState<string>('');
  const [searchIndex, setSearchIndex] = useState('');
  const [members, setMembers] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupView | null>(null);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState<string>('');
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);

  const canCreate = useMemo(() => {
    if (!groupName.trim()) return false;
    if (members.length !== 5) return false;
    return members.some((m) => String(m.id) === leaderId);
  }, [groupName, members, leaderId]);

  const isEditMode = editingGroup !== null;
  const canSubmit = canCreate;

  const getUsedStudentIndexes = (excludeGroupId?: number | string) => {
    const excludedId = excludeGroupId !== undefined ? String(excludeGroupId) : null;
    const usedIndexes = new Set<string>();

    groups.forEach((group) => {
      if (excludedId && String(group.id) === excludedId) {
        return;
      }

      group.members.forEach((member) => {
        const indexValue = normalizeIndex(member.university_id);
        if (indexValue) {
          usedIndexes.add(indexValue);
        }
      });
    });

    return usedIndexes;
  };

  const isStudentIndexAssignedElsewhere = (indexNumber: string, excludeGroupId?: number | string) => {
    const normalized = normalizeIndex(indexNumber);
    if (!normalized) {
      return false;
    }

    return getUsedStudentIndexes(excludeGroupId).has(normalized);
  };

  const loadGroups = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const endpoints = [
      `http://localhost:5000/api/groups/coordinator/${user?.id}/${levelNumber}`,
      `http://localhost:5000/api/groups/level/${levelNumber}?coordinatorId=${user?.id}`,
      `http://localhost:5000/api/groups?level=${levelNumber}&coordinatorId=${user?.id}`,
      `http://localhost:5000/api/groups/all?level=${levelNumber}&coordinatorId=${user?.id}`,
    ];

    try {
      setLoading(true);

      for (const endpoint of endpoints) {
        if (import.meta.env.DEV) console.log('[GroupManagement] trying endpoint', endpoint);
        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        if (import.meta.env.DEV) console.log('[GroupManagement] response payload', data);
        const list = toArray(data);
        if (list.length === 0) {
          continue;
        }

        setGroups(list.map((g: GroupApiRecord) => normalizeGroup(g)));
        setError(null);
        return;
      }

      throw new Error('Failed to fetch groups: Not Found');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLevelStudents = async () => {
    try {
      setStudentSearchLoading(true);
      const response = await fetch(`http://localhost:5000/api/users/level/${levelNumber}`);
      if (response.ok) {
        const data = await response.json();
        setAllStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch students for level", err);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    fetchAllLevelStudents();
  }, [levelNumber]);

  const resetForm = () => {
    setGroupName('');
    setSupervisorQuery('');
    setSelectedSupervisor(null);
    setSupervisorOptions([]);
    setSupervisorSearchError(null);
    setLeaderId('');
    setSearchIndex('');
    setMembers([]);
    setEditingGroup(null);
    setDepartment('');
  };

  const openEditModal = async (group: GroupView) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSupervisorQuery(group.supervisor === 'Not assigned' ? '' : group.supervisor);
    setSelectedSupervisor(null);
    setSupervisorOptions([]);
    setSupervisorSearchError(null);
    setLeaderId('');
    setSearchIndex('');
    setMembers([]);
    setDepartment(group.department || '');
    setIsModalOpen(true);

    const resolvedMembers: Student[] = [];

    for (const member of group.members) {
      if (typeof member.id === 'number') {
        resolvedMembers.push({
          id: member.id,
          name: member.name,
          university_id: member.university_id || '',
          email: '',
          level: levelNumber,
        });
        continue;
      }

      if (member.university_id) {
        try {
          const student = await fetchStudentByIndex(member.university_id);
          if (student && !resolvedMembers.some((existing) => existing.id === student.id)) {
            resolvedMembers.push(student);
          }
        } catch {
          // Skip unresolved member rows and keep loading other students.
        }
      }
    }

    setMembers(resolvedMembers.slice(0, 5));

    const normalizedLeader = group.leaderName.trim().toLowerCase();
    const leader = resolvedMembers.find((member) => {
      const memberName = member.name.trim().toLowerCase();
      return memberName.includes(normalizedLeader) || normalizedLeader.includes(memberName);
    });

    if (leader) {
      setLeaderId(String(leader.id));
    } else {
      setLeaderId(resolvedMembers.length > 0 ? String(resolvedMembers[0].id) : '');
    }
  };

  const mapSupervisors = (data: unknown): SupervisorOption[] => {
    const payload = data as Record<string, unknown> | null;
    const list = Array.isArray(payload?.data)
      ? payload?.data
      : Array.isArray(payload?.users)
        ? payload?.users
        : Array.isArray(payload?.supervisors)
          ? payload?.supervisors
          : [];

    return (list as Record<string, unknown>[])
      .map((item) => {
        const id = typeof item.id === 'number' ? item.id : Number(item.id);
        const name =
          (item.name as string | undefined) ??
          (item.full_name as string | undefined) ??
          (item.fullName as string | undefined) ??
          '';
        const email = (item.email as string | undefined) ?? '';

        if (!Number.isFinite(id) || !name.trim()) {
          return null;
        }

        return { id, name: name.trim(), email };
      })
      .filter((item): item is SupervisorOption => item !== null);
  };

  const fetchSupervisors = async (query: string): Promise<SupervisorOption[]> => {
    const q = query.trim();
    if (!q) {
      setSupervisorOptions([]);
      setSupervisorSearchError(null);
      return [];
    }

    const customEndpoint = (import.meta.env.VITE_SUPERVISOR_SEARCH_ENDPOINT as string | undefined)?.trim();
    const customEndpointDecoded = customEndpoint ? decodeURIComponent(customEndpoint) : null;
    const resolvedCustomEndpoint = customEndpointDecoded
      ? customEndpointDecoded.includes('{query}')
        ? customEndpointDecoded.replace('{query}', encodeURIComponent(q))
        : `${customEndpointDecoded}${customEndpointDecoded.includes('?') ? '&' : '?'}query=${encodeURIComponent(q)}`
      : null;

    const endpoints = [
      ...(resolvedCustomEndpoint ? [resolvedCustomEndpoint] : []),
      `http://localhost:5000/api/users/supervisors?search=${encodeURIComponent(q)}`,
      `http://localhost:5000/api/users?role=supervisor&search=${encodeURIComponent(q)}`,
      `http://localhost:5000/api/users?role=supervisor&query=${encodeURIComponent(q)}`,
      `http://localhost:5000/api/users/search?role=supervisor&query=${encodeURIComponent(q)}`,
      `http://localhost:5000/api/admin/supervisors?search=${encodeURIComponent(q)}`,
      `http://localhost:5000/api/admin/users?role=supervisor&search=${encodeURIComponent(q)}`,
    ];

    setSupervisorSearching(true);
    setSupervisorSearchError(null);
    try {
      let hadRouteError = false;
      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            if (response.status === 400 || response.status === 404) {
              hadRouteError = true;
            }
            continue;
          }

          const data = await response.json();
          const mapped = mapSupervisors(data);
          if (mapped.length > 0) {
            setSupervisorOptions(mapped);
            setSupervisorSearchError(null);
            return mapped;
          }
        } catch {
          // Try the next endpoint shape.
        }
      }

      setSupervisorOptions([]);
      if (hadRouteError) {
        setSupervisorSearchError(
          'Supervisor list API is not available. Please add a backend endpoint for supervisor search or set VITE_SUPERVISOR_SEARCH_ENDPOINT.'
        );
      }
      return [];
    } finally {
      setSupervisorSearching(false);
    }
  };

  const fetchStudentByIndex = async (indexNumber: string): Promise<Student | null> => {
    const response = await fetch(
      `http://localhost:5000/api/users/search?uniId=${encodeURIComponent(indexNumber)}&level=${levelNumber}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.success || !data?.student) {
      return null;
    }

    return data.student as Student;
  };

  const prefillFromApprovedRequest = async (request: ApprovedGroupRequest) => {
    setEditingGroup(null);
    setIsModalOpen(true);
    setGroupName(request.groupName || '');
    setSearchIndex('');
    setDepartment(request.department || '');

    const supervisorName = request.supervisorName?.trim() || '';
    setSupervisorQuery(supervisorName);
    if (supervisorName) {
      const supervisorCandidates = await fetchSupervisors(supervisorName);
      const normalizedTarget = supervisorName.toLowerCase();
      const exact = supervisorCandidates.find(
        (candidate) => candidate.name.toLowerCase() === normalizedTarget
      );
      if (exact) {
        setSelectedSupervisor(exact);
        setSupervisorQuery(exact.name);
        setSupervisorOptions([]);
      }
    }

    let resolvedMembers: Student[] = [];

    if (Array.isArray(request.resolvedMembers) && request.resolvedMembers.length > 0) {
      resolvedMembers = request.resolvedMembers
        .slice(0, 5)
        .map((member) => ({
          id: member.id,
          name: member.name,
          university_id: member.university_id,
          email: member.email || '',
          level: member.level || levelNumber,
        }));
    } else {
      const extractedIndexes = [...new Set((request.membersList.match(STUDENT_INDEX_REGEX) || []).map((id) => id.toUpperCase()))]
        .slice(0, 5);

      for (const index of extractedIndexes) {
        try {
          const student = await fetchStudentByIndex(index);
          if (student && !resolvedMembers.some((member) => member.id === student.id)) {
            resolvedMembers.push(student);
          }
        } catch {
          // Skip invalid entries and continue parsing the rest.
        }
      }
    }

    setMembers(resolvedMembers);

    const normalizedLeader = (request.groupLeader || '').trim().toLowerCase();
    const leader = resolvedMembers.find((member) => {
      const memberName = member.name.trim().toLowerCase();
      return memberName.includes(normalizedLeader) || normalizedLeader.includes(memberName);
    });

    if (leader) {
      setLeaderId(String(leader.id));
    } else {
      setLeaderId(resolvedMembers.length > 0 ? String(resolvedMembers[0].id) : '');
    }
  };

  useEffect(() => {
    if (!initialRequest) return;

    const run = async () => {
      await prefillFromApprovedRequest(initialRequest);
      onPrefillHandled?.();
    };

    void run();
  }, [initialRequest, onPrefillHandled]);

  useEffect(() => {
    if (!isModalOpen) return;

    const timer = window.setTimeout(() => {
      fetchSupervisors(supervisorQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [supervisorQuery, isModalOpen]);


  const handleRemoveMember = (studentId: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== studentId));
    if (leaderId === String(studentId)) {
      setLeaderId('');
    }
  };

  const handleDeleteGroup = async (group: GroupView) => {
    if (String(group.id).startsWith('temp-')) {
      alert('This group cannot be deleted because it does not have a valid server ID.');
      return;
    }

    const confirmed = window.confirm(`Delete group "${group.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      const endpoints = [
        `http://localhost:5000/api/groups/${group.id}`,
        `http://localhost:5000/api/groups/delete/${group.id}`,
      ];

      let deleted = false;

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, { method: 'DELETE' });
        if (!response.ok) {
          continue;
        }

        deleted = true;
        break;
      }

      if (!deleted) {
        throw new Error('Group delete API endpoint is not available yet.');
      }

      await loadGroups();
      window.dispatchEvent(new CustomEvent(GROUP_STATE_CHANGED_EVENT));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group.';
      alert(message);
    }
  };

  const handleCreateGroup = async () => {
    const trimmedGroupName = groupName.trim();

    if (isEditMode) {
      if (!canCreate) {
        alert('Enter a group name, keep exactly 5 members, and select a group leader.');
        return;
      }

      if (!editingGroup) {
        alert('No group selected for editing.');
        return;
      }

      const leader = members.find((m) => String(m.id) === leaderId);
      if (!leader) {
        alert('Selected leader must be one of the selected members.');
        return;
      }

      const duplicate = groups.some(
        (group) =>
          String(group.id) !== String(editingGroup.id) &&
          group.name.trim().toLowerCase() === trimmedGroupName.toLowerCase()
      );

      if (duplicate) {
        alert('A group with this name already exists for this level.');
        return;
      }

      try {
        setSaving(true);

        const payload = {
          groupName: trimmedGroupName,
          level: levelNumber,
          supervisorName: selectedSupervisor?.name ?? (supervisorQuery.trim() || null),
          supervisorId: selectedSupervisor?.id ?? null,
          leaderId: leader.id,
          memberIds: members.map((m) => m.id),
          createdBy: user?.id,
          department: department || undefined,
        };

        const endpoints = [
          `http://localhost:5000/api/groups/${editingGroup.id}`,
          `http://localhost:5000/api/groups/update/${editingGroup.id}`,
        ];

        let updated = false;

        for (const endpoint of endpoints) {
          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) continue;

          const contentType = response.headers.get('content-type') || '';
          const result = contentType.includes('application/json')
            ? await response.json()
            : { success: true };

          if (result?.success === false) continue;

          updated = true;
          break;
        }

        if (!updated) {
          throw new Error('Group update API endpoint is not available yet.');
        }

        setIsModalOpen(false);
        resetForm();
        await loadGroups();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update group.';
        alert(message);
      } finally {
        setSaving(false);
      }

      return;
    }

    if (!canCreate) {
      alert('Enter a group name, add exactly 5 members, and select a group leader.');
      return;
    }

    const editingGroupId = editingGroup ? (editingGroup as GroupView).id : undefined;
    const duplicateStudent: Student | undefined = members.find((member: Student) =>
      isStudentIndexAssignedElsewhere(member.university_id, editingGroupId)
    );
    if (duplicateStudent) {
      alert(`Student ${duplicateStudent.university_id} already belongs to another group.`);
      return;
    }

    const leader = members.find((m) => String(m.id) === leaderId);
    if (!leader) {
      alert('Selected leader must be one of the selected members.');
      return;
    }

    const duplicate = groups.some(
      (group) => group.name.trim().toLowerCase() === trimmedGroupName.toLowerCase()
    );

    if (duplicate) {
      alert('This group already exists for this level.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        groupName: trimmedGroupName,
        level: levelNumber,
        supervisorName: selectedSupervisor?.name ?? null,
        supervisorId: selectedSupervisor?.id ?? null,
        leaderId: leader.id,
        memberIds: members.map((m) => m.id),
        createdBy: user?.id,
        department: department || undefined,
      };

      const response = await fetch('http://localhost:5000/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : { success: false, error: await response.text() };

      if (!result?.success) {
        if (!response.ok && typeof result?.error === 'string' && result.error.includes('<!DOCTYPE')) {
          throw new Error('Group API endpoint not found. Please restart the backend server to load new routes.');
        }
        throw new Error(result?.error || 'Failed to create group.');
      }

      setIsModalOpen(false);
      resetForm();
      await loadGroups();
      window.dispatchEvent(new CustomEvent(GROUP_STATE_CHANGED_EVENT));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group-management-container">
      <div className="groups-list-card">
        {loading ? (
          <div className="groups-empty-state">
            <h4>Loading groups...</h4>
          </div>
        ) : error ? (
          <div className="groups-empty-state">
            <h4>Could not load groups</h4>
            <p>{error}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="groups-empty-state">
            <h4>No groups for Level {levelNumber}</h4>
            <p>Create the first group to get started.</p>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <article key={group.id} className="group-card">
                <div className="group-card-head">
                  <h3>{group.name}</h3>
                  <span className="group-meta-pill">{group.memberCount} members</span>
                </div>
                <p className="group-meta">Leader: {group.leaderName}</p>
                <p className="group-meta">Supervisor: {group.supervisor}</p>
                <p className="group-meta">Department: {group.department || 'Not set'}</p>
                {group.members.length > 0 && (
                  <ul className="group-members-preview">
                    {group.members.map((member) => (
                      <li key={`${group.id}-${member.id ?? member.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} />
                          <span>{member.name}</span>
                        </span>
                        {typeof member.id === 'number' && (
                          <button
                            type="button"
                            onClick={() => setViewingProfileId(member.id as number)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View Profile
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="group-card-actions">
                  <button type="button" className="group-edit-btn" onClick={() => void openEditModal(group)}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button type="button" className="group-delete-btn" onClick={() => void handleDeleteGroup(group)}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="group-modal-overlay" role="dialog" aria-modal="true" aria-label="Create Group Modal">
          <div className="group-modal">
            <div className="group-modal-header">
              <h2>{isEditMode ? `Edit Level ${levelNumber} Group` : `Create Level ${levelNumber} Group`}</h2>
              <button
                className="icon-close"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="group-modal-body">
              <label>
                Group Name
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Innovators Team"
                />
              </label>

              <label>
                Supervisor (optional)
                <div className="supervisor-picker-wrap">
                  <input
                    type="text"
                    value={supervisorQuery}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSupervisorQuery(next);
                      setSupervisorSearchError(null);
                      if (selectedSupervisor && selectedSupervisor.name !== next) {
                        setSelectedSupervisor(null);
                      }
                    }}
                    placeholder="Search supervisor by name or email"
                  />

                  {supervisorQuery.trim() && (
                    <div className="supervisor-options-box">
                      {supervisorSearching ? (
                        <p>Searching supervisors...</p>
                      ) : supervisorSearchError ? (
                        <p>{supervisorSearchError}</p>
                      ) : supervisorOptions.length === 0 ? (
                        <p>No supervisors found.</p>
                      ) : (
                        <ul>
                          {supervisorOptions.map((supervisor) => (
                            <li key={supervisor.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSupervisor(supervisor);
                                  setSupervisorQuery(supervisor.name);
                                  setSupervisorOptions([]);
                                }}
                              >
                                <span>{supervisor.name}</span>
                                <small>{supervisor.email}</small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {selectedSupervisor && (
                    <p className="supervisor-selected-text">
                      Selected: {selectedSupervisor.name}
                    </p>
                  )}
                </div>
              </label>

              <label>
                Department
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
                >
                  <option value="">-- Not set --</option>
                  <option value="AI">AI - Artificial Intelligence</option>
                  <option value="IT">IT - Information Technology</option>
                  <option value="ITM">ITM - IT Management</option>
                </select>
              </label>

              <label>
                Team Leader
                <select
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  disabled={members.length === 0}
                >
                  <option value="">{members.length === 0 ? 'Add members first' : 'Select team leader'}</option>
                  {members.map((member) => (
                    <option key={member.id} value={String(member.id)}>
                      {member.name} ({member.university_id})
                    </option>
                  ))}
                </select>
              </label>

              <div className="member-search-row">
                <select
                  value={searchIndex}
                  onChange={(e) => setSearchIndex(e.target.value)}
                  disabled={studentSearchLoading || members.length >= 5}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">{studentSearchLoading ? 'Loading students...' : 'Choose a student...'}</option>
                  {allStudents
                    .filter(s => !members.some(m => m.id === s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.university_id})</option>
                    ))
                  }
                </select>
                <button 
                  onClick={async () => {
                    if (!searchIndex) return;
                    const student = allStudents.find(s => String(s.id) === String(searchIndex));
                    if (student) {
                      if (isStudentIndexAssignedElsewhere(student.university_id, editingGroup?.id)) {
                        alert('This student already belongs to another group.');
                        return;
                      }
                      setMembers(prev => [...prev, student]);
                      setSearchIndex('');
                    }
                  }} 
                  disabled={!searchIndex || members.length >= 5}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              <div className="selected-members-box">
                <h4>Selected Members ({members.length}/5)</h4>
                {members.length === 0 ? (
                  <p>No members added yet.</p>
                ) : (
                  <ul>
                    {members.map((member) => (
                      <li key={member.id}>
                        <span>
                          {member.name} ({member.university_id})
                        </span>
                        <button onClick={() => handleRemoveMember(member.id)} aria-label="Remove member">
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="group-modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateGroup} disabled={saving || !canSubmit}>
                {saving ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingProfileId !== null && (
        <MemberProfileModal memberId={viewingProfileId} onClose={() => setViewingProfileId(null)} />
      )}
    </div>
  );
};

export default GroupManagement;
