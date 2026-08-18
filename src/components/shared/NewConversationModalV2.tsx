import React, { useState, useEffect } from "react";
import { X, Search, Loader } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocketV2 } from "../../hooks/useSocketV2";
import { fetchRecipientsV2 } from "../../utils/apiV2";
import { UserV2 } from "../../types/chatV2";
import "./NewConversationModalV2.css";

interface NewConversationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserV2) => void;
}

const AVAILABLE_ROLES: Array<UserV2["role"]> = [
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
}) => {
  const { user: currentUser } = useAuth();
  const { onlineUserIds } = useSocketV2();

  const [selectedRole, setSelectedRole] = useState<UserV2["role"]>("supervisor");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchRecipientsV2(selectedRole);
        if (isMounted) {
          const filtered = data.filter((u) => u.id !== currentUser?.id);
          setUsers(filtered);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load recipients", err);
          setError("Failed to load recipients");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedRole, currentUser]);

  if (!isOpen) return null;

  const displayRoles = AVAILABLE_ROLES.filter((role) => {
    if (currentUser?.role === "student" && role === "admin") return false;
    if (currentUser?.role === "coordinator" && role === "student") return false;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

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
                className={`role-v2-chip ${selectedRole === role ? "active" : ""}`}
                onClick={() => setSelectedRole(role)}
              >
                {role.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="search-v2-wrapper">
            <Search size={16} className="search-v2-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-v2-input"
            />
          </div>

          <div className="user-v2-list">
            {loading ? (
              <div className="user-v2-state-text">
                <Loader size={24} className="spinner" />
                <p style={{ marginTop: "0.5rem" }}>Loading contacts...</p>
              </div>
            ) : error ? (
              <div className="user-v2-state-text">{error}</div>
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
