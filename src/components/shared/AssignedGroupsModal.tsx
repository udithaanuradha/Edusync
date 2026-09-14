import React, { useEffect, useState } from 'react';
import { X, Users, User, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface GroupMember {
  id: number;
  name: string;
  email?: string;
  universityId?: string;
  university_id?: string;
  isLeader?: boolean;
  is_leader?: number | boolean;
}

interface AssignedGroup {
  id?: number;
  groupId?: number;
  groupName?: string;
  group_name?: string;
  level?: number;
  department?: string;
  supervisor?: string;
  supervisorName?: string;
  mentorName?: string;
  leader?: string;
  members?: GroupMember[];
}

interface AssignedGroupsModalProps {
  role: 'student' | 'mentor';
  userId: number | string;
  onClose: () => void;
}

// Shared "Assigned Group(s)" popup used from both the student dashboard and
// the mentor dashboard. Fetches whichever "assigned group" endpoint fits the
// viewer's role — a student has exactly one, a mentor may have several — and
// renders both response shapes since the two endpoints don't share a schema.
const AssignedGroupsModal: React.FC<AssignedGroupsModalProps> = ({ role, userId, onClose }) => {
  const [groups, setGroups] = useState<AssignedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url =
        role === 'student'
          ? `http://localhost:5000/api/groups/my-status/${userId}`
          : `http://localhost:5000/api/mentor/groups?mentorId=${userId}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);

      const data = await res.json();
      let list: AssignedGroup[] = [];
      if (Array.isArray(data)) list = data;
      else if (data && Array.isArray(data.data)) list = data.data;
      else if (data && Array.isArray(data.groups)) list = data.groups;

      setGroups(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned group(s).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assigned Groups"
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 12, padding: 24, width: 520, maxWidth: '92vw',
          maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} />
            {role === 'student' ? 'My Assigned Group' : 'My Assigned Groups'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading && (
          <p style={{ color: '#64748b', fontSize: 13 }}>Loading assigned group{role === 'mentor' ? 's' : ''}...</p>
        )}

        {!loading && error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchGroups}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#334155' }}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <p style={{ color: '#64748b', fontSize: 13 }}>
            No group has been assigned to you yet. Once a coordinator assigns your group, it will appear here.
          </p>
        )}

        {!loading && !error && groups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group, idx) => {
              const groupName = group.groupName || group.group_name || `Group ${idx + 1}`;
              const supervisorName = group.supervisor || group.supervisorName;
              const members = group.members || [];

              return (
                <div
                  key={group.id || group.groupId || idx}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{groupName}</div>
                      {group.department && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>{group.department}</div>
                      )}
                    </div>
                    {group.level != null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#3730a3', background: '#eef2ff', borderRadius: 999, padding: '2px 10px' }}>
                        Level {group.level}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#334155', marginBottom: members.length ? 10 : 0 }}>
                    {supervisorName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} /> Supervisor: <strong>{supervisorName}</strong>
                      </span>
                    )}
                    {role === 'student' && group.mentorName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} /> Mentor: <strong>{group.mentorName}</strong>
                      </span>
                    )}
                  </div>

                  {members.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {members.map((m, mIdx) => {
                        const isLeader = m.isLeader || Number(m.is_leader) === 1;
                        return (
                          <span
                            key={m.id || mIdx}
                            title={m.email || ''}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                              background: isLeader ? '#fef3c7' : '#f1f5f9',
                              color: isLeader ? '#92400e' : '#334155',
                              borderRadius: 999, padding: '3px 10px',
                            }}
                          >
                            {isLeader ? <ShieldCheck size={12} /> : <User size={12} />}
                            {m.name}
                          </span>
                        );
                      })}
                    </div>
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

export default AssignedGroupsModal;
