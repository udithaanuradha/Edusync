import React, { useState, useEffect } from 'react';
import { ArrowRight, Users, User, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import './AssignedGroupTab.css';

export interface GroupMember {
  id: number;
  name: string;
  email?: string;
  universityId?: string;
  university_id?: string;
  phone?: string | null;
  isLeader?: boolean;
  is_leader?: number | boolean;
}

export interface AssignedGroup {
  id: number;
  groupId?: number;
  groupName?: string;
  projectName?: string;
  group_name?: string;
  project_name?: string;
  level?: number;
  leader?: string;
  leaderName?: string;
  leader_name?: string;
  supervisorName?: string;
  supervisor_name?: string;
  supervisor?: {
    id?: number;
    name?: string;
    email?: string;
  } | string;
  mentorName?: string;
  assignedMentor?: string;
  members?: GroupMember[];
  member_names?: string[];
  status?: string;
}

interface AssignedGroupTabProps {
  /** Academic level number (e.g. 2, 3, 4) */
  levelNumber?: number;
  /** Called when mentor clicks "See Tasks" — switches parent tab to 'tasks' */
  onNavigateToTasks: () => void;
}

const AssignedGroupTab: React.FC<AssignedGroupTabProps> = ({ levelNumber = 2, onNavigateToTasks }) => {
  const [groups, setGroups] = useState<AssignedGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedGroup = async () => {
    try {
      setLoading(true);
      setError(null);

      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const mentorId = user?.id || '';
      const token = localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (mentorId) headers['x-user-id'] = String(mentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Query mentor groups for the specific level
      const url = mentorId
        ? `http://localhost:5000/api/mentor/groups?mentorId=${mentorId}&level=${levelNumber}`
        : `http://localhost:5000/api/groups/level/${levelNumber}`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      let list: AssignedGroup[] = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      } else if (data && Array.isArray(data.groups)) {
        list = data.groups;
      }

      setGroups(list);
    } catch (err: any) {
      console.error('Failed to fetch mentor assigned groups:', err);
      setError(err.message || 'Failed to load assigned group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedGroup();
  }, [levelNumber]);

  return (
    <div className="assigned-group-content">
      {/* ── Main white card container ─────────────────────────── */}
      <div className="group-list-box">
        <div className="group-list-box-header">
          <h4 className="list-box-title">Registered Group Details</h4>
          {groups.length > 0 && (
            <span className="group-count-badge">
              <Users size={14} />
              {groups.length} {groups.length === 1 ? 'Group' : 'Groups'} Assigned
            </span>
          )}
        </div>

        {/* ── Table Header Row ────────────────────────────────── */}
        <div className="group-list-header">
          <div className="header-item col-proj">Project Name</div>
          <div className="header-item col-lead">Leader</div>
          <div className="header-item col-mem">Members</div>
        </div>

        {/* ── Loading State ───────────────────────────────────── */}
        {loading ? (
          <div className="group-list-loading">
            <div className="loading-spinner"></div>
            <span>Loading assigned group details...</span>
          </div>
        ) : error ? (
          /* ── Error State ─────────────────────────────────────── */
          <div className="group-list-error">
            <AlertCircle size={20} className="error-icon" />
            <div className="error-text">
              <p className="error-title">Could not load group details</p>
              <p className="error-desc">{error}</p>
            </div>
            <button className="btn-retry" onClick={fetchAssignedGroup}>
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : groups.length > 0 ? (
          /* ── Live Data Rows ──────────────────────────────────── */
          <div className="group-list-rows-container">
            {groups.map((group, groupIdx) => {
              const projectName = group.projectName || group.groupName || group.project_name || group.group_name || `Group ${groupIdx + 1}`;
              const leaderName = group.leader || group.leaderName || group.leader_name || 'Not Assigned';
              const members = group.members || [];

              return (
                <div key={group.id || group.groupId || groupIdx} className="group-list-row group-list-row--populated">
                  {/* Project Name Column */}
                  <div className="data-item col-proj">
                    <div className="project-name-wrapper">
                      <span className="project-name-text">{projectName}</span>
                    </div>
                  </div>

                  {/* Leader Column */}
                  <div className="data-item col-lead">
                    <div className="leader-info-wrapper">
                      <div className="leader-avatar-badge">
                        <User size={13} />
                      </div>
                      <span className="leader-name-text">{leaderName}</span>
                    </div>
                  </div>

                  {/* Members Column */}
                  <div className="data-item col-mem">
                    <div className="member-tags-row">
                      {members.length > 0 ? (
                        members.map((member, mIdx) => {
                          const isLeader = member.isLeader || Boolean(member.is_leader);
                          const uniId = member.universityId || member.university_id;
                          const tooltip = `${member.name}${uniId ? ` (${uniId})` : ''}${member.email ? ` • ${member.email}` : ''}`;

                          return (
                            <div
                              key={member.id || mIdx}
                              className={`member-tag-chip ${isLeader ? 'is-leader' : ''}`}
                              title={tooltip}
                            >
                              {isLeader && <ShieldCheck size={12} className="leader-tag-icon" />}
                              <span className="member-chip-name">{member.name}</span>
                            </div>
                          );
                        })
                      ) : group.member_names && group.member_names.length > 0 ? (
                        group.member_names.map((name, mIdx) => (
                          <div key={mIdx} className="member-tag-chip">
                            <span className="member-chip-name">{name}</span>
                          </div>
                        ))
                      ) : (
                        <span className="no-members-text">No member details available</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Empty / Pending Assignment Rows ─────────────────── */
          <>
            <div className="group-list-row">
              {/* Project Name Column — empty placeholder box */}
              <div className="data-item col-proj">
                <div className="empty-field-box" aria-label="Project name not yet assigned"></div>
              </div>

              {/* Leader Column — empty placeholder box */}
              <div className="data-item col-lead">
                <div className="empty-field-box" aria-label="Leader not yet assigned"></div>
              </div>

              {/* Members Column — four empty tag-style boxes */}
              <div className="data-item col-mem">
                <div className="member-tags-row">
                  <div className="member-tag-box" aria-label="Member slot 1"></div>
                  <div className="member-tag-box" aria-label="Member slot 2"></div>
                  <div className="member-tag-box" aria-label="Member slot 3"></div>
                  <div className="member-tag-box" aria-label="Member slot 4"></div>
                </div>
              </div>
            </div>

            {/* Pending Assignment Notice */}
            <div className="pending-notice">
              <span className="pending-dot"></span>
              <span className="pending-text">
                Group assignment pending — details will appear here once assigned by the coordinator.
              </span>
            </div>
          </>
        )}

        {/* ── See Tasks Button ────────────────────────────────── */}
        <div className="see-tasks-row">
          <button
            className="btn-see-tasks"
            onClick={onNavigateToTasks}
            aria-label="Navigate to Group Tasks tab"
          >
            See Tasks
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      {/* ── End Main Card ─────────────────────────────────────── */}
    </div>
  );
};

export default AssignedGroupTab;