import React, { useState, useEffect } from "react";
import { X, Search, Loader, Users, Shield, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocketV2 } from "../../hooks/useSocketV2";
import { fetchRecipientsV2 } from "../../utils/apiV2";
import { UserV2 } from "../../types/chatV2";
import "./NewConversationModalV2.css";

interface NewConversationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserV2 & { groupMembers?: UserV2[]; isGroupChat?: boolean; groupName?: string; level?: number }) => void;
  initialTab?: string;
}

interface AssignedGroup {
  groupId: number;
  groupName: string;
  level: number;
  supervisorId: number;
  supervisorName: string;
  leader: string;
  memberCount: number;
  members: string;
  leaderId?: number;
}

const AVAILABLE_ROLES: Array<UserV2["role"] | "assigned_groups"> = [
  "assigned_groups",
  "supervisor",
  "student",
  "group_leader",
  "coordinator",
  "mentor",
  "admin",
];

const NewConversationModalV2: React.FC<NewConversationModalV2Props> = ({
  isOpen,
  onClose,
  onSelectUser,
  initialTab,
}) => {
  const { user: currentUser } = useAuth();
  const { onlineUserIds } = useSocketV2();

  const isSupervisorUser =
    currentUser?.role === "supervisor" || currentUser?.role === "lecturer";

  const [selectedRole, setSelectedRole] = useState<string>(
    initialTab || (isSupervisorUser ? "assigned_groups" : "supervisor")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserV2[]>([]);
  const [assignedGroups, setAssignedGroups] = useState<AssignedGroup[]>([]);
  const [allStudents, setAllStudents] = useState<UserV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTab) {
      setSelectedRole(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        if (selectedRole === "assigned_groups") {
          const supervisorId = currentUser?.id;
          const token = localStorage.getItem("token") || localStorage.getItem("jwt");
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const [groupsRes, studentsData] = await Promise.all([
            fetch(`http://localhost:5000/api/groupdetailstosupervisordashboard/supervisor/${supervisorId}`, { headers }),
            fetchRecipientsV2("student", currentUser?.id),
          ]);

          if (isMounted) {
            setAllStudents(studentsData);
            if (groupsRes.ok) {
              const groupsData = await groupsRes.json();
              setAssignedGroups(Array.isArray(groupsData) ? groupsData : []);
            } else {
              setAssignedGroups([]);
            }
          }
        } else {
          const data = await fetchRecipientsV2(selectedRole, currentUser?.id);
          if (isMounted) {
            const filtered = data.filter((u) => u.id !== currentUser?.id);
            setUsers(filtered);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load recipients", err);
          setError("Failed to load data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedRole, currentUser]);

  if (!isOpen) return null;

  const displayRoles = AVAILABLE_ROLES.filter((role) => {
    if (role === "assigned_groups") {
      return isSupervisorUser;
    }
    if (currentUser?.role === "student" && role === "admin") return false;
    if (currentUser?.role === "coordinator" && role === "student") return false;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const filteredGroups = assignedGroups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.groupName.toLowerCase().includes(q) ||
      `level ${g.level}`.toLowerCase().includes(q) ||
      g.leader.toLowerCase().includes(q) ||
      g.members.toLowerCase().includes(q)
    );
  });

  const handleGroupSelect = (group: AssignedGroup) => {
    const memberNames = (group.members || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const matchedMembers = allStudents.filter((s) =>
      memberNames.some((m) => s.name.trim().toLowerCase().includes(m) || m.includes(s.name.trim().toLowerCase()))
    );

    const leaderMatch = allStudents.find(
      (s) => s.name.trim().toLowerCase() === group.leader.trim().toLowerCase()
    ) || matchedMembers[0];

    const targetUser = {
      id: leaderMatch ? leaderMatch.id : (group.groupId || 99999),
      name: group.groupName,
      role: `Level ${group.level} Group` as any,
      email: leaderMatch ? leaderMatch.email : `${group.groupName.toLowerCase().replace(/\s+/g, '')}@student.uom.lk`,
      groupMembers: matchedMembers.length > 0 ? matchedMembers : (leaderMatch ? [leaderMatch] : []),
      isGroupChat: true,
      groupName: group.groupName,
      level: group.level,
    };

    onSelectUser(targetUser);
    onClose();
  };

  return (
    <div className="modal-v2-overlay" onClick={onClose}>
      <div className="modal-v2-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-v2-header">
          <h2>New Conversation</h2>
          <button className="modal-v2-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-v2-body">
          <div className="role-v2-selector">
            {displayRoles.map((role) => (
              <button
                key={role}
                className={`role-v2-chip ${selectedRole === role ? "active" : ""} ${role === "assigned_groups" ? "assigned-groups-chip" : ""}`}
                onClick={() => setSelectedRole(role)}
              >
                {role === "assigned_groups" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Users size={13} /> Assigned Groups
                  </span>
                ) : (
                  role.replace("_", " ")
                )}
              </button>
            ))}
          </div>

          <div className="search-v2-wrapper">
            <Search size={16} className="search-v2-icon" />
            <input
              type="text"
              placeholder={
                selectedRole === "assigned_groups"
                  ? "Search assigned group, level, leader, member..."
                  : "Search by name or email..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-v2-input"
            />
          </div>

          <div className="user-v2-list">
            {loading ? (
              <div className="user-v2-state-text">
                <Loader size={24} className="spinner" />
                <p style={{ marginTop: "0.5rem" }}>
                  {selectedRole === "assigned_groups" ? "Loading assigned groups..." : "Loading contacts..."}
                </p>
              </div>
            ) : error ? (
              <div className="user-v2-state-text">{error}</div>
            ) : selectedRole === "assigned_groups" ? (
              filteredGroups.length === 0 ? (
                <div className="user-v2-state-text">
                  <Users size={32} style={{ opacity: 0.4, marginBottom: "8px" }} />
                  <p>No assigned groups found for this supervisor</p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    key={group.groupId}
                    className="assigned-group-v2-card"
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div className="group-v2-avatar">
                      <Users size={20} />
                    </div>
                    <div className="group-v2-info">
                      <div className="group-v2-header-row">
                        <span className="group-v2-name">{group.groupName}</span>
                        <span className={`group-level-badge level-${group.level}`}>
                          Level {group.level}
                        </span>
                      </div>
                      <div className="group-v2-leader">
                        <Shield size={12} className="leader-shield-icon" />
                        <span>Leader: <strong>{group.leader}</strong></span>
                        <span className="group-member-count-pill">{group.memberCount} members</span>
                      </div>
                      {group.members && (
                        <div className="group-v2-members-preview" title={group.members}>
                          {group.members}
                        </div>
                      )}
                    </div>
                    <div className="group-v2-action-btn" title="Message Group">
                      <MessageSquare size={16} />
                    </div>
                  </div>
                ))
              )
            ) : filteredUsers.length === 0 ? (
              <div className="user-v2-state-text">No contacts found</div>
            ) : (
              filteredUsers.map((user) => {
                const isOnline = onlineUserIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="user-v2-card"
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                  >
                    <div className="user-v2-avatar">
                      {user.name.charAt(0).toUpperCase()}
                      {isOnline && <span className="online-dot-v2" />}
                    </div>
                    <div className="user-v2-info">
                      <div className="user-v2-name">{user.name}</div>
                      <div className="user-v2-role">
                        {user.role.replace("_", " ")} {isOnline && "• Online"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModalV2;
