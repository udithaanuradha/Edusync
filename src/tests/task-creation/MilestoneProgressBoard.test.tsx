import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import MilestoneProgressBoard from '../../Pages/StudentPages/MilestoneProgressBoard';
import type { ProjectTask } from '../../Pages/StudentPages/projectTaskTypes';

/**
 * Frontend tests — Task Creation workflow (MilestoneProgressBoard.tsx's
 * "quick add" form). This component is purely props-driven (onAddTask is a
 * callback the parent page owns — see ProjectManagementPage.tsx for the
 * actual POST /api/milestones/tasks call), so no fetch mocking is needed
 * except where the component itself checks Scope Division claims — every
 * test here uses groupId={null}, which makes that check fail open without
 * a network call.
 */

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const milestoneOptions = [
  { id: 'm1', title: 'Requirements Gathering', startDate: addDays(-5), endDate: addDays(30) },
];

const baseProps = {
  tasks: [] as ProjectTask[],
  groupId: null,
  userRole: 'member' as const,
  optimisticStatus: {},
  pendingTaskIds: {},
  taskErrors: {},
  onStatusChange: vi.fn(),
  onDeleteTask: vi.fn().mockResolvedValue({ success: true }),
  currentUser: { id: 1, name: 'Alice' },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

const openQuickAddForm = async () => {
  await userEvent.click(screen.getByRole('button', { name: /add a task for yourself in this milestone/i }));
  return screen.findByPlaceholderText('Task title');
};

describe('MilestoneProgressBoard — task creation (quick add)', () => {
  test('adds a self-assigned task with the entered title and due date', async () => {
    const onAddTask = vi.fn();
    const { container } = render(
      <MilestoneProgressBoard
        {...baseProps}
        allGroupTasks={[]}
        milestoneOptions={milestoneOptions}
        memberCount={1}
        onAddTask={onAddTask}
      />
    );

    const titleInput = await openQuickAddForm();
    await userEvent.type(titleInput, 'Write proposal');
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: addDays(7) } }); // Due date field

    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onAddTask).toHaveBeenCalledTimes(1);
    const [task] = onAddTask.mock.calls[0];
    expect(task).toMatchObject({
      milestoneId: 'm1',
      title: 'Write proposal',
      status: 'TODO',
      assignedToId: 1,
      assignedTo: 'Alice',
      endDate: addDays(7),
    });
  });

  test('blocks submission when the title or due date is missing', async () => {
    const onAddTask = vi.fn();
    render(
      <MilestoneProgressBoard
        {...baseProps}
        allGroupTasks={[]}
        milestoneOptions={milestoneOptions}
        memberCount={1}
        onAddTask={onAddTask}
      />
    );

    await openQuickAddForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByText('Please add a task title and a due date.')).toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  test('rejects a start date later than the due date', async () => {
    const onAddTask = vi.fn();
    const { container } = render(
      <MilestoneProgressBoard
        {...baseProps}
        allGroupTasks={[]}
        milestoneOptions={milestoneOptions}
        memberCount={1}
        onAddTask={onAddTask}
      />
    );

    const titleInput = await openQuickAddForm();
    await userEvent.type(titleInput, 'Write proposal');
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: addDays(5) } }); // Start
    fireEvent.change(dateInputs[1], { target: { value: addDays(2) } }); // Due, before start

    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByText('Start date cannot be later than the due date.')).toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  test("rejects task dates that fall outside the milestone's own range", async () => {
    const onAddTask = vi.fn();
    const { container } = render(
      <MilestoneProgressBoard
        {...baseProps}
        allGroupTasks={[]}
        milestoneOptions={milestoneOptions}
        memberCount={1}
        onAddTask={onAddTask}
      />
    );

    const titleInput = await openQuickAddForm();
    await userEvent.type(titleInput, 'Write proposal');
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: addDays(40) } }); // past the milestone's own endDate (30)

    // The due field's own `max` attribute already keeps a native date-picker
    // pick within the milestone's range, so the browser (jsdom included)
    // blocks a button-click submission before React ever sees it. Dispatch
    // the submit event directly to exercise handleQuickAddSubmit's own
    // (defense-in-depth) range check the same way it would fire for a
    // browser/input that doesn't enforce the native constraint.
    fireEvent.submit(container.querySelector('form')!);

    expect(
      await screen.findByText(/must fall within this milestone's/i)
    ).toBeInTheDocument();
    expect(onAddTask).not.toHaveBeenCalled();
  });

  test('warns when the title matches a teammate\'s task already in this milestone', async () => {
    const teammateTask: ProjectTask = {
      id: 't1',
      milestoneId: 'm1',
      milestone: 'Requirements Gathering',
      title: 'Write proposal',
      description: '',
      assignedToId: 2,
      assignedTo: 'Bob',
      status: 'TODO',
      startDate: addDays(-1),
      endDate: addDays(5),
    };

    render(
      <MilestoneProgressBoard
        {...baseProps}
        allGroupTasks={[teammateTask]}
        milestoneOptions={milestoneOptions}
        memberCount={3}
        onAddTask={vi.fn()}
      />
    );

    const titleInput = await openQuickAddForm();
    await userEvent.type(titleInput, 'Write proposal');

    expect(
      await screen.findByText(/is already assigned to Bob in this milestone/i)
    ).toBeInTheDocument();
  });
});
