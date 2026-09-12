import React, { useMemo, useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProjectTask } from './projectTaskTypes';
import './GroupContributions.css';

type GroupMember = { id: number | string; name: string };
type CurrentUser = { id: number | string; name: string } | null;

type GroupContributionsProps = {
  /** Every task in the group, regardless of assignee. */
  allGroupTasks: ProjectTask[];
  groupMembers: GroupMember[];
  currentUser: CurrentUser;
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

/**
 * Read-only comparison view — one row per group member, showing their own
 * completion percentage and, expanded, their actual tasks (not just a
 * count) — so it's clear not just who's ahead, but what everyone is
 * actually working on. The bar's fill is that same percentage (their own
 * completed/total) — NOT scaled against the top contributor's raw count —
 * so a partially-done member never reads as a full, misleadingly "100%"
 * green bar just because they happen to lead the group.
 */
const GroupContributions: React.FC<GroupContributionsProps> = ({ allGroupTasks, groupMembers, currentUser }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const computed = groupMembers.map((member) => {
      const own = allGroupTasks.filter((t) => String(t.assignedToId) === String(member.id));
      const completed = own.filter((t) => t.status === 'COMPLETED').length;
      const percent = own.length > 0 ? Math.round((completed / own.length) * 100) : 0;
      return {
        id: String(member.id),
        name: member.name,
        isYou: Boolean(currentUser) && String(member.id) === String(currentUser?.id),
        total: own.length,
        completed,
        percent,
        tasks: own,
      };
    });

    return computed.sort((a, b) => b.completed - a.completed);
  }, [allGroupTasks, groupMembers, currentUser]);

  const topContributorId = rows.length > 0 && rows[0].completed > 0 ? rows[0].id : null;

  return (
    <div className="gc-wrapper">
      <div className="gc-section">
        <h4 className="gc-section-title">Completed Tasks by Member</h4>
        <p className="gc-section-desc">
          Each bar shows how much of that member&apos;s own tasks they&apos;ve completed. Click a member to see
          their actual tasks.
        </p>

        {rows.length === 0 ? (
          <p className="gc-empty">No group members found yet.</p>
        ) : (
          <div className="gc-bar-list">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              return (
                <div key={row.id} className="gc-bar-row">
                  <button
                    type="button"
                    className="gc-bar-toggle"
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="gc-bar-head">
                      <span className="gc-bar-name">
                        {row.id === topContributorId && <Trophy size={14} className="gc-bar-trophy" />}
                        {row.name}
                        {row.isYou && <span className="gc-bar-you-tag">You</span>}
                      </span>
                      <span className="gc-bar-stats">
                        <span className="gc-bar-percent">{row.percent}%</span>
                        <span className="gc-bar-count">{row.completed}/{row.total} tasks completed</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                    <div
                      className="gc-bar-track"
                      role="progressbar"
                      aria-valuenow={row.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${row.name}: ${row.percent}% of their own tasks completed`}
                    >
                      <div className="gc-bar-fill" style={{ width: `${row.percent}%` }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="gc-task-list">
                      {row.tasks.length === 0 ? (
                        <p className="gc-task-empty">No tasks assigned yet.</p>
                      ) : (
                        row.tasks.map((task) => (
                          <div key={task.id} className="gc-task-row">
                            <div className="gc-task-info">
                              <span className="gc-task-title">{task.title}</span>
                              <span className="gc-task-milestone">{task.milestone}</span>
                            </div>
                            <span className={`status-pill ${task.status.toLowerCase()}`}>
                              {STATUS_LABEL[task.status] || task.status}
                            </span>
                          </div>
                        ))
                      )}
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

export default GroupContributions;
