import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import GroupRequest from '../../components/student/GroupRequest';
import { installMockFetch } from '../helpers/mockFetch';

/**
 * Frontend tests — Group Formation workflow (GroupRequest.tsx)
 *
 * The component talks to five endpoints (supervisors, available members,
 * my-status, my-requests, and the request/final-submit actions). Every test
 * stubs `fetch` with installMockFetch rather than hitting a real backend.
 */

const setLoggedInUser = (user: { id: number; name: string }) => {
  localStorage.setItem('token', 'fake-token');
  localStorage.setItem('user', JSON.stringify(user));
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('alert', vi.fn());
});

const waitForSupervisorsLoaded = async () => {
  await waitFor(() =>
    expect(screen.queryAllByPlaceholderText('Loading supervisors...')).toHaveLength(0)
  );
};

describe('GroupRequest — group formation (student side)', () => {
  test('sends a request to the chosen supervisor with the selected member and group name', async () => {
    setLoggedInUser({ id: 1, name: 'Alice' });
    const { calls } = installMockFetch([
      { when: /\/api\/groups\/supervisors$/, respond: () => ({ body: [{ id: 7, name: 'Dr. Perera' }] }) },
      { when: /\/api\/groups\/available-members\//, respond: () => ({ body: [{ id: 2, name: 'Bob', university_id: '2020123' }] }) },
      { when: /\/api\/groups\/my-status\//, respond: () => ({ body: [] }) },
      { when: /\/api\/groups\/my-requests\//, respond: () => ({ body: [] }) },
      {
        when: /\/api\/groups\/request$/,
        method: 'POST',
        respond: () => ({ status: 201, body: { message: 'Request Sent', groupId: 501, request_id: 501 } }),
      },
    ]);

    const user = userEvent.setup();
    render(<GroupRequest levelNumber={3} />);
    await waitForSupervisorsLoaded();

    await user.type(screen.getByPlaceholderText('e.g. CYGEN'), 'CYGEN');

    await user.type(screen.getByPlaceholderText('Search students by name...'), 'Bob');
    await user.click(await screen.findByText('Bob - 2020123'));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Bob (2020123)')).toBeInTheDocument();

    const [supervisorSlot1Input] = screen.getAllByPlaceholderText('Search supervisors by name...');
    await user.type(supervisorSlot1Input, 'Perera');
    await user.click(await screen.findByText('Dr. Perera'));

    const [requestSlot1Button] = screen.getAllByRole('button', { name: 'Request' });
    await user.click(requestSlot1Button);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /waiting for approval/i })).toBeInTheDocument()
    );

    const requestCall = calls.find((c) => /\/api\/groups\/request$/.test(c.url));
    expect(requestCall).toBeTruthy();
    const sentBody = JSON.parse(String(requestCall!.init!.body));
    expect(sentBody).toMatchObject({
      group_name: 'CYGEN',
      supervisor_ids: [7],
      member_ids: [2],
      student_id: 1,
      project_level: 3,
    });
    expect(sentBody.members_list).toContain('Bob (2020123)');
  });

  test('blocks submission and warns when the group name is missing', async () => {
    setLoggedInUser({ id: 1, name: 'Alice' });
    const { calls } = installMockFetch([
      { when: /\/api\/groups\/supervisors$/, respond: () => ({ body: [{ id: 7, name: 'Dr. Perera' }] }) },
      { when: /\/api\/groups\/available-members\//, respond: () => ({ body: [] }) },
      { when: /\/api\/groups\/my-status\//, respond: () => ({ body: [] }) },
      { when: /\/api\/groups\/my-requests\//, respond: () => ({ body: [] }) },
    ]);

    const user = userEvent.setup();
    render(<GroupRequest levelNumber={3} />);
    await waitForSupervisorsLoaded();

    const [supervisorSlot1Input] = screen.getAllByPlaceholderText('Search supervisors by name...');
    await user.type(supervisorSlot1Input, 'Perera');
    await user.click(await screen.findByText('Dr. Perera'));

    const [requestSlot1Button] = screen.getAllByRole('button', { name: 'Request' });
    await user.click(requestSlot1Button);

    expect(window.alert).toHaveBeenCalledWith('Please fill in the Group Name first.');
    expect(calls.some((c) => /\/api\/groups\/request$/.test(c.url))).toBe(false);
  });

  test('shows a locked notice instead of the form when already in a live group', async () => {
    setLoggedInUser({ id: 1, name: 'Alice' });
    installMockFetch([
      { when: /\/api\/groups\/supervisors$/, respond: () => ({ body: [] }) },
      { when: /\/api\/groups\/available-members\//, respond: () => ({ body: [] }) },
      {
        when: /\/api\/groups\/my-status\//,
        respond: () => ({ body: [{ groupId: 10, groupName: 'CYGEN', level: 3 }] }),
      },
      { when: /\/api\/groups\/my-requests\//, respond: () => ({ body: [] }) },
    ]);

    render(<GroupRequest levelNumber={3} />);

    expect(await screen.findByText(/You're already part of Group: CYGEN/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. CYGEN')).not.toBeInTheDocument();
  });

  test('restores an in-flight request: approved supervisor is locked, other slot still open', async () => {
    setLoggedInUser({ id: 1, name: 'Alice' });
    installMockFetch([
      { when: /\/api\/groups\/supervisors$/, respond: () => ({ body: [{ id: 7, name: 'Dr. Perera' }, { id: 8, name: 'Dr. Silva' }] }) },
      { when: /\/api\/groups\/available-members\//, respond: () => ({ body: [] }) },
      { when: /\/api\/groups\/my-status\//, respond: () => ({ body: [] }) },
      {
        when: /\/api\/groups\/my-requests\//,
        respond: () => ({
          body: [
            {
              request_id: 55,
              status: 'pending',
              project_level: 3,
              group_name: 'CYGEN',
              members_list: 'Leader: Alice, Members: ',
              request_message: 'Project: EduSync. ',
              is_final_submitted: false,
              supervisor_responses: [{ supervisor_id: 7, status: 'approved', rejection_reason: '' }],
            },
          ],
        }),
      },
    ]);

    render(<GroupRequest levelNumber={3} />);

    expect(await screen.findByDisplayValue('CYGEN')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /approved/i })).toBeInTheDocument();
    // The second slot has no saved response yet, so it's still open for the student to use.
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
  });
});
