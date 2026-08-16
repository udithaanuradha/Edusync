import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./NewConversationModal.css";

type Role =
  | "supervisor"
  | "student"
  | "group_leader"
  | "coordinator"
  | "admin"
  | "mentor";

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
  "group_leader",
  "coordinator",
  "admin",
  "mentor",
];

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const { user: currentUser } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NEW: State to track if the current user is a leader
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false);

  // NEW: Check if the logged-in student is a group leader when the modal opens
  useEffect(() => {
    if (isOpen && currentUser?.role === "student") {
      const checkLeadershipStatus = async () => {
        try {
          const response = await fetch(
            "http://localhost:5000/api/messages/leaders",
          );
          if (response.ok) {
            const leaders = await response.json();
            // If the current user's ID is in the leaders list, set to true!
            const isLeader = leaders.some(
              (leader: User) => leader.id === currentUser.id,
            );
            setIsCurrentUserLeader(isLeader);
          }
        } catch (error) {
          console.error("Failed to verify leadership status", error);
        }
      };

      checkLeadershipStatus();
    }
  }, [isOpen, currentUser]);

  // Fetch users by role
  useEffect(() => {
    if (!selectedRole) return;

    const fetchUsersByRole = async () => {
      try {
        setLoading(true);
        setError("");

        // Route group_leader requests to the special messages backend endpoint
        const endpoint =
          selectedRole === "group_leader"
            ? `http://localhost:5000/api/messages/leaders`
            : `http://localhost:5000/api/users?role=${selectedRole}`;

        const response = await fetch(endpoint);

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
          setError(`Failed to load ${selectedRole.replace("_", " ")}s`);
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

  // Filter roles based on who is currently logged in
  const displayRoles = AVAILABLE_ROLES.filter((role) => {
    // 1. Prevent students from messaging admins
    if (currentUser?.role === "student" && role === "admin") return false;

    // 2. Coordinators should only message Group Leaders, not regular Students
    if (currentUser?.role === "coordinator" && role === "student") return false;

    // 3. Regular Students cannot message Coordinators (only leaders can)
    // We now use our new isCurrentUserLeader state instead of the AuthContext
    if (
      currentUser?.role === "student" &&
      !isCurrentUserLeader &&
      role === "coordinator"
    )
      return false;

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
                {displayRoles.map((role) => (
                  <button
                    key={role}
                    className="role-button"
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="role-icon">
                      {role === "supervisor" && "👨‍🏫"}
                      {role === "student" && "👨‍🎓"}
                      {role === "group_leader" && "⭐"}
                      {role === "coordinator" && "📋"}
                      {role === "admin" && "⚙️"}
                      {role === "mentor" && "💼"}
                    </div>
                    <span className="role-name">
                      {role
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
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
                Select {selectedRole.replace("_", " ")} to message:
              </p>

              {loading ? (
                <div className="loading-spinner">Loading...</div>
              ) : error ? (
                <div className="no-users">{error}</div>
              ) : users.length === 0 ? (
                <div className="no-users">
                  No {selectedRole.replace("_", " ")}s available
                </div>
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
