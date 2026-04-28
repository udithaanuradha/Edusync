import React from "react";
import { NavLink } from "react-router-dom";
import { ClipboardCheck, CalendarDays, MessageSquare } from "lucide-react";
import "./SupervisorSidebar.css";

interface SupervisorSidebarProps {
  compact?: boolean;
}

const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({
  compact = false,
}) => {
  return (
    <aside className={`supervisor-sidebar ${compact ? "compact" : ""}`}>
      {!compact && (
        <div className="supervisor-brand">
          <div className="brand-icon">E</div>
          <span className="brand-text">EduSync</span>
        </div>
      )}

      <nav className="supervisor-nav">
        <NavLink
          to="/supervisor/approval"
          className={({ isActive }) =>
            `supervisor-nav-item ${isActive ? "active" : ""}`
          }
        >
          <ClipboardCheck size={18} />
          <span>Approval</span>
        </NavLink>

        <NavLink
          to="/supervisor/schedule-meeting"
          className={({ isActive }) =>
            `supervisor-nav-item ${isActive ? "active" : ""}`
          }
        >
          <CalendarDays size={18} />
          <span>Schedule Meeting</span>
        </NavLink>

        <NavLink
          to="/supervisor/communication"
          className={({ isActive }) =>
            `supervisor-nav-item ${isActive ? "active" : ""}`
          }
        >
          <MessageSquare size={18} />
          <span>Communication</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default SupervisorSidebar;
