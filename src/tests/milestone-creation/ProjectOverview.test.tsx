import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import ProjectOverview from '../../Pages/StudentPages/ProjectOverview';
import { installMockFetch } from '../helpers/mockFetch';

/**
 * Frontend tests — Milestone Creation workflow (ProjectOverview.tsx)
 *
 * memberCount is fixed at 1 throughout ("Individual Project" / a group of
 * one) purely to keep <ScopeDivision> — which has its own unrelated
 * fetches — out of the tree, so each test only has to stub the milestone
 * endpoints it actually cares about.
 */

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const baseProps = {
  groupId: 5,
  currentUser: { id: 1, name: 'Alice' },
  supervisor: null,
  mentor: null,
  onNavigateSupervisorChat: vi.fn(),
  onNavigateMentorChat: vi.fn(),
  memberCount: 1,
};

beforeEach(() => {
  localStorage.clear();
});

describe('ProjectOverview — milestone creation', () => {
  test('creates a new milestone with the entered title and dates', async () => {
    const start = addDays(1);
    const end = addDays(10);
    const { calls } = installMockFetch([
      { when: /\/overview\/group\/5$/, respond: () => ({ body: { success: true, data: null } }) },
      {
        when: /\/group\/5$/,
        respond: () => ({ body: { success: true, data: [] } }),
      },
      {
        when: /\/api\/milestones$/,
        method: 'POST',
        respond: () => ({ status: 201, body: { success: true, data: { id: 77 } } }),
      },
    ]);

    render(<ProjectOverview {...baseProps} userRole="member" onMilestonesChanged={vi.fn()} />);

    const titleInput = await screen.findByLabelText('Milestone / Workflow Name');
    await userEvent.type(titleInput, 'Requirements Gathering');
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: start } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: end } });

    await userEvent.click(screen.getByRole('button', { name: 'Create Milestone' }));

    await waitFor(() => expect(screen.getByText('Milestone created.')).toBeInTheDocument());

    const postCall = calls.find((c) => /\/api\/milestones$/.test(c.url) && c.init?.method === 'POST');
    expect(postCall).toBeTruthy();
    expect(JSON.parse(String(postCall!.init!.body))).toEqual({
      group_id: 5,
      title: 'Requirements Gathering',
      start_date: start,
      due_date: end,
    });
  });

  test('blocks submission when a required field is missing', async () => {
    const { calls } = installMockFetch([
      { when: /\/overview\/group\/5$/, respond: () => ({ body: { success: true, data: null } }) },
      { when: /\/group\/5$/, respond: () => ({ body: { success: true, data: [] } }) },
    ]);

    render(<ProjectOverview {...baseProps} userRole="member" />);

    await screen.findByLabelText('Milestone / Workflow Name');
    await userEvent.click(screen.getByRole('button', { name: 'Create Milestone' }));

    expect(
      await screen.findByText('Please fill in the milestone name, start date, and end date.')
    ).toBeInTheDocument();
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });

  test('rejects an end date earlier than the start date', async () => {
    installMockFetch([
      { when: /\/overview\/group\/5$/, respond: () => ({ body: { success: true, data: null } }) },
      { when: /\/group\/5$/, respond: () => ({ body: { success: true, data: [] } }) },
    ]);

    render(<ProjectOverview {...baseProps} userRole="member" />);

    const titleInput = await screen.findByLabelText('Milestone / Workflow Name');
    await userEvent.type(titleInput, 'Design Phase');
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: addDays(10) } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: addDays(1) } });

    await userEvent.click(screen.getByRole('button', { name: 'Create Milestone' }));

    expect(await screen.findByText('Start date cannot be later than end date.')).toBeInTheDocument();
  });

  test('loads an existing milestone into the form and saves an edit as the leader', async () => {
    const existing = {
      id: 9,
      title: 'Requirements Gathering',
      description: '',
      start_date: addDays(1),
      due_date: addDays(10),
      status: 'PENDING',
    };
    const { calls } = installMockFetch([
      { when: /\/overview\/group\/5$/, respond: () => ({ body: { success: true, data: null } }) },
      { when: /\/group\/5$/, respond: () => ({ body: { success: true, data: [existing] } }) },
      {
        when: /\/api\/milestones\/9$/,
        method: 'PUT',
        respond: () => ({ body: { success: true } }),
      },
    ]);

    render(<ProjectOverview {...baseProps} userRole="leader" />);

    const titleInput = await screen.findByDisplayValue('Requirements Gathering');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Requirements Gathering v2');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(screen.getByText('Milestone updated.')).toBeInTheDocument());

    const putCall = calls.find((c) => /\/api\/milestones\/9$/.test(c.url) && c.init?.method === 'PUT');
    expect(putCall).toBeTruthy();
    expect(JSON.parse(String(putCall!.init!.body))).toMatchObject({ title: 'Requirements Gathering v2' });
  });
});
