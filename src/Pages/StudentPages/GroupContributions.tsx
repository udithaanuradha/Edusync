import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
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

/**
 * Read-only comparison view — one horizontal bar per group member, filled
 * by how many tasks they've completed. Bars are scaled against the group's
 * top contributor (not each member's own total), so the fill length is a
 * direct, at-a-glance comparison of who has completed the most.
 */
const GroupContributions: React.FC<GroupContributionsProps> = ({ allGroupTasks, groupMembers, currentUser }) => {
  const rows = useMemo(() => {
    const computed = groupMembers.map((member) => {
      const own = allGroupTasks.filter((t) => String(t.assignedToId) === String(member.id));
      const completed = own.filter((t) => t.status === 'COMPLETED').length;
      return {
        id: member.id,
        name: member.name,
        isYou: Boolean(currentUser) && String(member.id) === String(currentUser?.id),
        total: own.length,
        completed,
      };
    });

    const maxCompleted = Math.max(1, ...computed.map((m) => m.completed));
    return computed
      .map((m) => ({ ...m, barPercent: Math.round((m.completed / maxCompleted) * 100) }))
      .sort((a, b) => b.completed - a.completed);
  }, [allGroupTasks, groupMembers, currentUser]);

  const topContributorId = rows.length > 0 && rows[0].completed > 0 ? rows[0].id : null;

  return (
    <div className="gc-wrapper">
      <div className="gc-section">
        <h4 className="gc-section-title">Completed Tasks by Member</h4>
        <p className="gc-section-desc">
          Each bar is scaled against the group&apos;s top contributor, so you can compare who has completed the
          most at a glance.
        </p>

        {rows.length === 0 ? (
          <p className="gc-empty">No group members found yet.</p>
        ) : (
          <div className="gc-bar-list">
            {rows.map((row) => (
              <div key={row.id} className="gc-bar-row">
                <div className="gc-bar-head">
                  <span className="gc-bar-name">
                    {row.id === topContributorId && <Trophy size={14} className="gc-bar-trophy" />}
                    {row.name}
                    {row.isYou && <span className="gc-bar-you-tag">You</span>}
                  </span>
                  <span className="gc-bar-count">{row.completed}/{row.total} tasks completed</span>
                </div>
                <div
                  className="gc-bar-track"
                  role="progressbar"
                  aria-valuenow={row.barPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.name}: ${row.completed} tasks completed`}
                >
                  <div className="gc-bar-fill" style={{ width: `${row.barPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupContributions;
