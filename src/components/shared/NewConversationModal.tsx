import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
// 1. Import useAuth
import { useAuth } from "../../context/AuthContext";
import "./NewConversationModal.css";

type Role = "supervisor" | "student" | "coordinator" | "admin" | "mentor";

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

const AVAILABLE_ROLES: Role[] = [
  "supervisor",
  "student",
  "coordinator",
  "admin",
  "mentor",
];

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  // 2. Get the current logged-in user
  const { user: currentUser } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch users by role
  useEffect(() => {
    if (!selectedRole) return;

    const fetchUsersByRole = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `http://localhost:5000/api/users?role=${selectedRole}`,
        );

        if (response.ok) {
          const data = await response.json();
          const usersByRole = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          setUsers(usersByRole);
        } else {
          setUsers([]);
          setError(`Failed to load ${selectedRole} users`);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchUsersByRole();
  }, [selectedRole]);

  if (!isOpen) return null;

  // 3. Filter the roles to hide 'admin' if the current user is a 'student'
  const displayRoles = AVAILABLE_ROLES.filter((role) => {
    if (currentUser?.role === "student" && role === "admin") {
      return false;
    }
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Start New Conversation</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {!selectedRole ? (
            <div className="role-selection">
              <p className="selection-title">
                Select a role to start conversation:
              </p>
              <div className="roles-grid">
                {/* 4. Map over displayRoles instead of AVAILABLE_ROLES */}
                {displayRoles.map((role) => (
                  <button
                    key={role}
                    className="role-button"
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="role-icon">
                      {role === "supervisor" && "👨‍🏫"}
                      {role === "student" && "👨‍🎓"}
                      {role === "coordinator" && "📋"}
                      {role === "admin" && "⚙️"}
                      {role === "mentor" && "💼"}
                    </div>
                    <span className="role-name">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="user-selection">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedRole(null);
                  setUsers([]);
                }}
              >
                ← Back to Roles
              </button>

              <p className="selection-title">
                Select {selectedRole} to message:
              </p>

              {loading ? (
                <div className="loading-spinner">Loading users...</div>
              ) : error ? (
                <div className="no-users">{error}</div>
              ) : users.length === 0 ? (
                <div className="no-users">No {selectedRole}s available</div>
              ) : (
                <div className="users-list">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="user-item"
                      onClick={() => onSelectUser(user)}
                    >
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                      <div className="select-icon">
                        <Plus size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
