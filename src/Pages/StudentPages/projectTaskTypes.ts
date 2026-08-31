// Shared task types for the Student "Project Management" page — split out of
// TaskCreation.tsx (now removed) so TaskKanbanBoard.tsx and
// MilestoneProgressBoard.tsx don't depend on a leader-assign-to-anyone form
// that no longer exists. Every task is still assigned (assignedToId stays
// required) — it's just always assigned to its own creator now.

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export type ProjectTask = {
  id: string;
  milestoneId: number | string;
  milestone: string;
  title: string;
  description: string;
  assignedToId: number | string;
  assignedTo: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  /** When this task's status last became COMPLETED (null/undefined otherwise
      or if it was later moved off COMPLETED). Backs My Progress's timeline. */
  completedAt?: string | null;
};
