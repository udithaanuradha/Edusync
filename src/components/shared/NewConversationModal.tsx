import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./NewConversationModal.css";

/**
 * TYPE DEFINITIONS
 */
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
  onSelectUser: (user: User) => void; // Callback to return selected user to the ChatWindow[cite: 4]
}

const AVAILABLE_ROLES: Role[] = [
  "supervisor",
  "student",
  "group_leader",
  "coordinator",
  "admin",
  "mentor",
];

/**
 * NewConversationModal
 * Features a two-step selection process: Role -> Individual User[cite: 4].
 */
const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const { user: currentUser } = useAuth();

  // --- State Management ---
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tracks elevated permissions for student users[cite: 4]
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false);

  /**
   * Effect: Leadership Verification
   * Logic: When the modal opens, if the user is a student, check the leader list
   * to determine if they have permission to message coordinators[cite: 4].
   */
  useEffect(() => {
    if (isOpen && currentUser?.role === "student") {
      const checkLeadershipStatus = async () => {
        try {
          const response = await fetch(
            "http://localhost:5000/api/messages/leaders",
          );
          if (response.ok) {
            const leaders = await response.json();
            // Boolean check: is the current user ID in the leader array?[cite: 4]
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

  /**
   * Effect: User Fetching
   * Logic: Triggers whenever a specific role is selected to populate the user list[cite: 4].
   */
  useEffect(() => {
    if (!selectedRole) return;

    const fetchUsersByRole = async () => {
      try {
        setLoading(true);
        setError("");

        // Logic: Redirect group_leader requests to a specific leaders endpoint,
        // otherwise use the standard role query[cite: 4].
        const endpoint =
          selectedRole === "group_leader"
            ? `http://localhost:5000/api/messages/leaders`
            : `http://localhost:5000/api/users?role=${selectedRole}`;

        const response = await fetch(endpoint);

        if (response.ok) {
          const data = await response.json();
          // Normalization Logic: Handles different API structures (direct array vs {data: []})[cite: 4]
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
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchUsersByRole();
  }, [selectedRole]);

  if (!isOpen) return null;

  /**
   * Permission Filtering Logic
   * Logic: Determines which roles appear in the grid based on authentication rules[cite: 4].
   */
  const displayRoles = AVAILABLE_ROLES.filter((role) => {
    // 1. Restriction: Students are prohibited from seeing or messaging Admins[cite: 4].
    if (currentUser?.role === "student" && role === "admin") return false;

    // 2. Restriction: Coordinators can only message Leaders, not general Students[cite: 4].
    if (currentUser?.role === "coordinator" && role === "student") return false;

    // 3. Restriction: Students cannot see Coordinators unless they have Leader status[cite: 4].
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
      {/* Logic: stopPropagation prevents the modal from closing when clicking inside the content[cite: 4] */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <div className="modal-header">
          <h2>Start New Conversation</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {!selectedRole ? (
            /* STEP 1: Role Selection Grid[cite: 4] */
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
            /* STEP 2: Individual User Selection[cite: 4] */
            <div className="user-selection">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedRole(null); // Logic: Reset state to return to Step 1[cite: 4]
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
                      onClick={() => onSelectUser(user)} // Logic: Passes choice back to parent component[cite: 4]
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
