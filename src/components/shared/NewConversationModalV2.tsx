import React, { useState, useEffect } from "react";
import { X, Search, Loader, Users, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocketV2 } from "../../hooks/useSocketV2";
import { fetchRecipientsV2 } from "../../utils/apiV2";
import { fetchMyGroupConversationsV2 } from "../../utils/groupChatApiV2";
import { UserV2, GroupConversationV2 } from "../../types/chatV2";
import "./NewConversationModalV2.css";

interface NewConversationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserV2) => void;
  onSelectGroupConversation: (conversationId: number) => void;
  initialTab?: string;
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
  onSelectGroupConversation,
  initialTab,
}) => {
  const { user: currentUser } = useAuth();
  const { onlineUserIds } = useSocketV2();

  // Real group conversations (supervisor<->group, mentor<->group) exist for
  // every role tied to a project group, not just supervisors.
  const hasGroupConversations =
    currentUser?.role === "supervisor" ||
    currentUser?.role === "lecturer" ||
    currentUser?.role === "mentor" ||
    currentUser?.role === "student";

  const [selectedRole, setSelectedRole] = useState<string>(
    initialTab || (hasGroupConversations ? "assigned_groups" : "supervisor")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserV2[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversationV2[]>([]);
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
          if (currentUser?.id) {
            const data = await fetchMyGroupConversationsV2(currentUser.id);
            if (isMounted) setGroupConversations(data);
          } else if (isMounted) {
            setGroupConversations([]);
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
      return hasGroupConversations;
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

  const filteredGroups = groupConversations.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.group_name.toLowerCase().includes(q) || `level ${g.level}`.toLowerCase().includes(q);
  });

  const handleGroupSelect = (group: GroupConversationV2) => {
    onSelectGroupConversation(group.conversation_id);
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
                  ? "Search group, level..."
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
                  {selectedRole === "assigned_groups" ? "Loading your groups..." : "Loading contacts..."}
                </p>
              </div>
            ) : error ? (
              <div className="user-v2-state-text">{error}</div>
            ) : selectedRole === "assigned_groups" ? (
              filteredGroups.length === 0 ? (
                <div className="user-v2-state-text">
                  <Users size={32} style={{ opacity: 0.4, marginBottom: "8px" }} />
                  <p>No group chats yet — one appears automatically once a group is assigned to you.</p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div
                    key={group.conversation_id}
                    className="assigned-group-v2-card"
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div className="group-v2-avatar">
                      <Users size={20} />
                    </div>
                    <div className="group-v2-info">
                      <div className="group-v2-header-row">
                        <span className="group-v2-name">{group.group_name}</span>
                        <span className={`group-level-badge level-${group.level}`}>
                          Level {group.level}
                        </span>
                      </div>
                      <div className="group-v2-leader">
                        <span>{group.type === "mentor" ? "Mentor" : "Supervisor"} Group</span>
                        <span className="group-member-count-pill">{group.member_count} members</span>
                        {group.unread_count > 0 && (
                          <span className="unread-badge-v2">{group.unread_count}</span>
                        )}
                      </div>
                      {group.last_message_text && (
                        <div className="group-v2-members-preview">
                          {group.last_message_text}
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
