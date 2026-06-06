import React from 'react';
import { ArrowRight } from 'lucide-react';
import './AssignedGroupTab.css';

/**
 * AssignedGroupTab Component
 *
 * PURPOSE: Displays the assigned group's project details for a mentor.
 *
 * CURRENT STATE: UI-only. No backend connection. No mock data.
 * Shows empty placeholder boxes for: Project Name, Leader, Members.
 *
 * "See Tasks" Button:
 *   Calls onNavigateToTasks() — passed from the parent Level page.
 *   This switches the parent's activeTab state to 'tasks'.
 *
 * FUTURE: When backend is ready, replace the placeholder divs
 * with real data fetched from /api/mentor/assigned-group/:mentorId
 *
 * DO NOT add backend calls here until the assigned_groups table
 * and mentor assignment logic is built in the backend.
 */
interface AssignedGroupTabProps {
  /** Called when mentor clicks "See Tasks" — switches parent tab to 'tasks' */
  onNavigateToTasks: () => void;
}

const AssignedGroupTab: React.FC<AssignedGroupTabProps> = ({ onNavigateToTasks }) => {

  return (
    <div className="assigned-group-content">

      {/* ── Main white card container ─────────────────────────── */}
      <div className="group-list-box">
        <h4 className="list-box-title">Registered Group Details</h4>

        {/* ── Table Header Row ──────────────────────────────────
            Three columns: Project Name | Leader | Members
            These are labels only — no data shown yet
        ──────────────────────────────────────────────────────── */}
        <div className="group-list-header">
          <div className="header-item col-proj">Project Name</div>
          <div className="header-item col-lead">Leader</div>
          <div className="header-item col-mem">Members</div>
        </div>

        {/* ── Single Data Row ───────────────────────────────────
            One row shown as an empty placeholder.
            Each column has an empty box — no text, no mock data.
            Boxes are styled to look like unpopulated input fields.
        ──────────────────────────────────────────────────────── */}
        <div className="group-list-row">

          {/* Project Name Column — empty placeholder box */}
          <div className="data-item col-proj">
            <div className="empty-field-box" aria-label="Project name not yet assigned"></div>
          </div>

          {/* Leader Column — empty placeholder box */}
          <div className="data-item col-lead">
            <div className="empty-field-box" aria-label="Leader not yet assigned"></div>
          </div>

          {/* Members Column — four empty tag-style boxes
              Each box represents a member slot (empty, no names)
          */}
          <div className="data-item col-mem">
            <div className="member-tags-row">
              <div className="member-tag-box" aria-label="Member slot 1"></div>
              <div className="member-tag-box" aria-label="Member slot 2"></div>
              <div className="member-tag-box" aria-label="Member slot 3"></div>
              <div className="member-tag-box" aria-label="Member slot 4"></div>
            </div>
          </div>

        </div>
        {/* ── End Data Row ─────────────────────────────────────── */}

        {/* ── Pending Assignment Notice ─────────────────────────
            Subtle message telling mentor group hasn't been assigned.
            Remove when backend data is connected.
        ──────────────────────────────────────────────────────── */}
        <div className="pending-notice">
          <span className="pending-dot"></span>
          <span className="pending-text">
            Group assignment pending — details will appear here once assigned by the coordinator.
          </span>
        </div>

        {/* ── See Tasks Button ──────────────────────────────────
            Navigates to the Tasks tab via parent callback.
            Always visible so mentor can check the tasks view.
        ──────────────────────────────────────────────────────── */}
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