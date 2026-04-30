# 🧪 COORDINATOR TEST CASES - EduSync

Comprehensive automated test cases for coordinator features using Jest, React Testing Library, and Cypress.

## Table of Contents
1. [Frontend Unit Tests (Jest + RTL)](#frontend-unit-tests)
2. [Backend API Tests (Jest + Supertest)](#backend-api-tests)
3. [E2E Tests (Cypress)](#e2e-tests)

---

## Frontend Unit Tests

### 1. Announcements Component Tests

#### File: `src/components/coordinator/Announcements.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Announcements } from './Announcements';

// Mock the fetch API
global.fetch = jest.fn();

describe('Announcements Component', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== FETCH ANNOUNCEMENTS =====
  
  test('TC-ANN-001: Should fetch and display announcements on mount', async () => {
    const mockAnnouncements = [
      { id: 1, title: 'Proposal Deadline', content: 'Extended to March 20', level: 1 },
      { id: 2, title: 'New Resources', content: 'Check the resources page', level: 1 }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnnouncements })
    });

    render(<Announcements />);

    await waitFor(() => {
      expect(screen.getByText('Proposal Deadline')).toBeInTheDocument();
      expect(screen.getByText('New Resources')).toBeInTheDocument();
    });
  });

  test('TC-ANN-002: Should handle fetch error gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Network error' })
    });

    render(<Announcements />);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  // ===== CREATE ANNOUNCEMENT =====

  test('TC-ANN-003: Should create announcement with valid data', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, announcement_id: 3 })
      });

    render(<Announcements />);

    const titleInput = screen.getByPlaceholderText('Title');
    const contentInput = screen.getByPlaceholderText('Content');
    const submitBtn = screen.getByText('Post Announcement');

    await userEvent.type(titleInput, 'Important Notice');
    await userEvent.type(contentInput, 'Please read carefully');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/announcements',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });
  });

  test('TC-ANN-004: Should validate required fields before submission', async () => {
    render(<Announcements />);

    const submitBtn = screen.getByText('Post Announcement');
    await userEvent.click(submitBtn);

    expect(screen.getByText(/title and content are required/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('TC-ANN-005: Should filter announcements by level', async () => {
    const mockAnnouncements = [
      { id: 1, title: 'Level 1 Announcement', level: 1 },
      { id: 2, title: 'Level 2 Announcement', level: 2 }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnnouncements })
    });

    render(<Announcements />);

    const levelFilter = screen.getByDisplayValue('All Levels');
    await userEvent.selectOptions(levelFilter, '1');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('level=1'),
        expect.any(Object)
      );
    });
  });

  // ===== EDIT ANNOUNCEMENT =====

  test('TC-ANN-006: Should edit announcement with valid data', async () => {
    const mockAnnouncements = [
      { id: 1, title: 'Old Title', content: 'Old content', level: 1 }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnnouncements })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<Announcements />);

    const editBtn = screen.getByText('Edit');
    await userEvent.click(editBtn);

    const titleInput = screen.getByDisplayValue('Old Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const submitBtn = screen.getByText('Update Announcement');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/announcements/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  // ===== DELETE ANNOUNCEMENT =====

  test('TC-ANN-007: Should delete announcement after confirmation', async () => {
    const mockAnnouncements = [
      { id: 1, title: 'To Delete', content: 'Content', level: 1 }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAnnouncements })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    window.confirm = jest.fn(() => true);

    render(<Announcements />);

    const deleteBtn = screen.getByText('Delete');
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/announcements/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  test('TC-ANN-008: Should not delete if user cancels confirmation', async () => {
    const mockAnnouncements = [
      { id: 1, title: 'To Delete', content: 'Content', level: 1 }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockAnnouncements })
    });

    window.confirm = jest.fn(() => false);

    render(<Announcements />);

    const deleteBtn = screen.getByText('Delete');
    await userEvent.click(deleteBtn);

    expect(fetch).not.toHaveBeenCalledWith(
      'http://localhost:5000/api/announcements/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
```

---

### 2. StageManagement Component Tests

#### File: `src/components/coordinator/StageManagement.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StageManagement } from './StageManagement';

global.fetch = jest.fn();

describe('StageManagement Component', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== FETCH STAGES =====

  test('TC-STAGE-001: Should fetch and display stages on mount', async () => {
    const mockStages = [
      {
        stage_id: 1,
        stage_name: 'Proposal',
        description: 'Project proposal submission',
        deadline: '2026-04-15',
        files: []
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockStages })
    });

    render(<StageManagement levelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByText('Proposal')).toBeInTheDocument();
      expect(screen.getByText('Project proposal submission')).toBeInTheDocument();
    });
  });

  test('TC-STAGE-002: Should show empty state when no stages exist', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<StageManagement levelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByText('No stages created yet')).toBeInTheDocument();
    });
  });

  // ===== CREATE STAGE =====

  test('TC-STAGE-003: Should create stage with all fields', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 5 })
      });

    render(<StageManagement levelNumber={1} />);

    const addBtn = screen.getByText('+ Add Stage');
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Stage Name');
    const descInput = screen.getByPlaceholderText('Description');
    const deadlineInput = screen.getByDisplayValue('');

    await userEvent.type(nameInput, 'Final Presentation');
    await userEvent.type(descInput, 'Final project presentation');
    await userEvent.type(deadlineInput, '2026-05-20');

    const saveBtn = screen.getByText('Save Stage');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/projects/create',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Final Presentation')
        })
      );
    });
  });

  test('TC-STAGE-004: Should validate stage name is required', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<StageManagement levelNumber={1} />);

    const addBtn = screen.getByText('+ Add Stage');
    await userEvent.click(addBtn);

    const saveBtn = screen.getByText('Save Stage');
    await userEvent.click(saveBtn);

    expect(screen.getByText(/stage name is required/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      'http://localhost:5000/api/projects/create',
      expect.any(Object)
    );
  });

  // ===== FILE UPLOAD =====

  test('TC-STAGE-005: Should upload files to stage', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 5 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file_url: 'https://cloudinary.com/file.pdf'
        })
      });

    render(<StageManagement levelNumber={1} />);

    const addBtn = screen.getByText('+ Add Stage');
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Stage Name');
    await userEvent.type(nameInput, 'Proposal');

    const fileInput = screen.getByDisplayValue('');
    const file = new File(['dummy content'], 'rubric.pdf', { type: 'application/pdf' });

    await userEvent.upload(fileInput, file);

    const saveBtn = screen.getByText('Save Stage');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/projects/upload-file',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('TC-STAGE-006: Should handle file upload errors', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 5 })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'File too large' })
      });

    render(<StageManagement levelNumber={1} />);

    const addBtn = screen.getByText('+ Add Stage');
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Stage Name');
    await userEvent.type(nameInput, 'Proposal');

    const fileInput = screen.getByDisplayValue('');
    const file = new File(['x'.repeat(100000000)], 'large.pdf');

    await userEvent.upload(fileInput, file);

    const saveBtn = screen.getByText('Save Stage');
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  // ===== DELETE STAGE =====

  test('TC-STAGE-007: Should delete stage', async () => {
    const mockStages = [
      {
        stage_id: 1,
        stage_name: 'Proposal',
        description: 'Proposal submission',
        files: []
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStages })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    window.confirm = jest.fn(() => true);

    render(<StageManagement levelNumber={1} />);

    const deleteBtn = screen.getByText('Delete');
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/projects/delete/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  test('TC-STAGE-008: Should display stage files for download', async () => {
    const mockStages = [
      {
        stage_id: 1,
        stage_name: 'Proposal',
        description: 'Proposal submission',
        files: [
          {
            file_id: 1,
            file_name: 'rubric.pdf',
            file_url: 'https://cloudinary.com/rubric.pdf'
          }
        ]
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockStages })
    });

    render(<StageManagement levelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByText('rubric.pdf')).toBeInTheDocument();
    });
  });
});
```

---

### 3. GradebookTable Component Tests

#### File: `src/components/coordinator/GradebookTable.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradebookTable } from './GradebookTable';

global.fetch = jest.fn();

describe('GradebookTable Component', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockGradebookData = [
    {
      mark_id: 1,
      group_id: 101,
      stage_id: 1,
      group_name: 'Group A',
      stage_name: 'Proposal',
      marks_obtained: 85,
      total_marks: 100,
      percentage: 85,
      supervisor_name: 'Dr. Silva',
      supervisor_email: 'silva@university.edu',
      feedback: 'Good proposal',
      status: 'Marked',
      level: 1,
      created_at: '2026-04-10'
    },
    {
      mark_id: 2,
      group_id: 102,
      stage_id: 1,
      group_name: 'Group B',
      stage_name: 'Proposal',
      marks_obtained: null,
      total_marks: 100,
      percentage: null,
      supervisor_name: 'Dr. Shah',
      supervisor_email: 'shah@university.edu',
      feedback: null,
      status: 'Pending',
      level: 1,
      created_at: '2026-04-10'
    }
  ];

  // ===== FETCH GRADEBOOK =====

  test('TC-GRADE-001: Should fetch and display gradebook on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      expect(screen.getByText('Group A')).toBeInTheDocument();
      expect(screen.getByText('Group B')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  test('TC-GRADE-002: Should display pending assignments with null marks', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      const pendingCells = screen.getAllByText('⏳ Pending');
      expect(pendingCells.length).toBeGreaterThan(0);
      expect(screen.getByText('—')).toBeInTheDocument(); // Null marks shown as —
    });
  });

  // ===== SEARCH FUNCTIONALITY =====

  test('TC-GRADE-003: Should search by group name', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    const searchInput = screen.getByPlaceholderText(/search by group/i);
    await userEvent.type(searchInput, 'Group A');

    await waitFor(() => {
      expect(screen.getByText('Group A')).toBeInTheDocument();
      expect(screen.queryByText('Group B')).not.toBeInTheDocument();
    });
  });

  // ===== FILTER FUNCTIONALITY =====

  test('TC-GRADE-004: Should filter by supervisor', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    const filterSelect = screen.getByDisplayValue('All Supervisors');
    await userEvent.selectOptions(filterSelect, 'Dr. Silva');

    await waitFor(() => {
      expect(screen.getByText('Group A')).toBeInTheDocument();
      expect(screen.queryByText('Group B')).not.toBeInTheDocument();
    });
  });

  // ===== SORTING FUNCTIONALITY =====

  test('TC-GRADE-005: Should sort by marks ascending', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    const marksHeader = screen.getByText('Marks', { selector: 'th' });
    await userEvent.click(marksHeader);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      const groupARow = rows.find(r => r.textContent.includes('Group A'));
      const groupBRow = rows.find(r => r.textContent.includes('Group B'));
      
      // Group B (pending) should appear before Group A (marked)
      expect(groupBRow.compareDocumentPosition(groupARow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  test('TC-GRADE-006: Should calculate percentage correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      expect(screen.getByText('85/100')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  // ===== SUMMARY STATISTICS =====

  test('TC-GRADE-007: Should display correct summary statistics', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGradebookData })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      expect(screen.getByText('Total Assignments: 2')).toBeInTheDocument();
      expect(screen.getByText('Marked: 1')).toBeInTheDocument();
      expect(screen.getByText('Pending: 1')).toBeInTheDocument();
      expect(screen.getByText(/Average: 85\.00%/)).toBeInTheDocument();
    });
  });

  // ===== ERROR HANDLING =====

  test('TC-GRADE-008: Should display error message on fetch failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch gradebook' })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('TC-GRADE-009: Should handle empty gradebook', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    render(<GradebookTable />);

    await waitFor(() => {
      expect(screen.getByText('No gradebook records found')).toBeInTheDocument();
    });
  });
});
```

---

## Backend API Tests

### Backend Announcements API Tests

#### File: `tests/api/announcements.test.js`

```javascript
const request = require('supertest');
const app = require('../../src/index');
const db = require('../../src/config/database');

describe('Announcements API', () => {
  
  const coordinatorToken = 'valid_coordinator_token';
  const studentToken = 'valid_student_token';

  // ===== CREATE ANNOUNCEMENT =====

  describe('POST /api/announcements', () => {
    
    test('TC-API-ANN-001: Should create announcement with valid data', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Proposal Deadline Extended',
          content: 'The proposal deadline has been extended to March 20.',
          level: 1,
          created_by: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        announcement_id: expect.any(Number),
        message: 'Announcement created successfully'
      });
    });

    test('TC-API-ANN-002: Should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Missing Content'
          // Missing: content, level
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('TC-API-ANN-003: Should return 403 if user is not coordinator', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Announcement',
          content: 'Content',
          level: 1
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only coordinators');
    });

    test('TC-API-ANN-004: Should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .send({
          title: 'Announcement',
          content: 'Content',
          level: 1
        });

      expect(response.status).toBe(401);
    });

    test('TC-API-ANN-005: Should reject invalid level', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Announcement',
          content: 'Content',
          level: 99 // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid level');
    });
  });

  // ===== GET ANNOUNCEMENTS =====

  describe('GET /api/announcements', () => {
    
    test('TC-API-ANN-006: Should fetch announcements without authentication', async () => {
      const response = await request(app)
        .get('/api/announcements');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array)
      });
    });

    test('TC-API-ANN-007: Should filter announcements by level', async () => {
      const response = await request(app)
        .get('/api/announcements?level=1');

      expect(response.status).toBe(200);
      
      const announcements = response.body.data;
      if (announcements.length > 0) {
        announcements.forEach(ann => {
          expect(ann.level).toBe(1);
        });
      }
    });

    test('TC-API-ANN-008: Should search announcements by title', async () => {
      const response = await request(app)
        .get('/api/announcements?search=deadline');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('TC-API-ANN-009: Should handle invalid level query parameter', async () => {
      const response = await request(app)
        .get('/api/announcements?level=invalid');

      // Should either ignore invalid level or return error
      expect([200, 400]).toContain(response.status);
    });
  });

  // ===== UPDATE ANNOUNCEMENT =====

  describe('PUT /api/announcements/:id', () => {
    
    test('TC-API-ANN-010: Should update announcement with valid data', async () => {
      const response = await request(app)
        .put('/api/announcements/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
          level: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('TC-API-ANN-011: Should return 400 if required fields missing on update', async () => {
      const response = await request(app)
        .put('/api/announcements/1')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Updated Title'
          // Missing: content, level
        });

      expect(response.status).toBe(400);
    });

    test('TC-API-ANN-012: Should return 403 if user is not coordinator', async () => {
      const response = await request(app)
        .put('/api/announcements/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Updated',
          content: 'Updated',
          level: 1
        });

      expect(response.status).toBe(403);
    });
  });

  // ===== DELETE ANNOUNCEMENT =====

  describe('DELETE /api/announcements/:id', () => {
    
    test('TC-API-ANN-013: Should delete announcement successfully', async () => {
      const response = await request(app)
        .delete('/api/announcements/1')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('TC-API-ANN-014: Should return 403 if user is not coordinator', async () => {
      const response = await request(app)
        .delete('/api/announcements/1')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    test('TC-API-ANN-015: Should handle deletion of non-existent announcement', async () => {
      const response = await request(app)
        .delete('/api/announcements/99999')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      // Should return 404 or success (depending on implementation)
      expect([200, 404]).toContain(response.status);
    });
  });
});
```

---

### Backend Calendar API Tests

#### File: `tests/api/calendar.test.js`

```javascript
const request = require('supertest');
const app = require('../../src/index');

describe('Calendar API', () => {
  
  const coordinatorToken = 'valid_coordinator_token';
  const supervisorToken = 'valid_supervisor_token';

  // ===== SCHEDULE PANEL =====

  describe('POST /api/calendar/schedule-panel', () => {
    
    test('TC-API-CAL-001: Should schedule evaluation panel with valid data', async () => {
      const response = await request(app)
        .post('/api/calendar/schedule-panel')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          group_id: 101,
          stage_id: 1,
          supervisor_id: 5,
          date: '2026-05-15',
          time: '10:00',
          duration: 60,
          location: 'Room 201',
          notes: 'Bring project files'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('panel_id');
    });

    test('TC-API-CAL-002: Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/calendar/schedule-panel')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          group_id: 101
          // Missing: stage_id, supervisor_id, date
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('TC-API-CAL-003: Should reject non-coordinator users', async () => {
      const response = await request(app)
        .post('/api/calendar/schedule-panel')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          group_id: 101,
          stage_id: 1,
          supervisor_id: 5,
          date: '2026-05-15',
          time: '10:00',
          duration: 60
        });

      expect(response.status).toBe(403);
    });

    test('TC-API-CAL-004: Should prevent duplicate panel scheduling', async () => {
      // First scheduling should succeed
      await request(app)
        .post('/api/calendar/schedule-panel')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          group_id: 101,
          stage_id: 1,
          supervisor_id: 5,
          date: '2026-05-15',
          time: '10:00',
          duration: 60
        });

      // Duplicate scheduling should fail
      const response = await request(app)
        .post('/api/calendar/schedule-panel')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          group_id: 101,
          stage_id: 1,
          supervisor_id: 5,
          date: '2026-05-15',
          time: '10:00',
          duration: 60
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already scheduled');
    });
  });

  // ===== FREEZE DATES =====

  describe('POST /api/calendar/freeze-date', () => {
    
    test('TC-API-CAL-005: Should freeze a date successfully', async () => {
      const response = await request(app)
        .post('/api/calendar/freeze-date')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          date: '2026-06-01',
          reason: 'Exam week'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('TC-API-CAL-006: Should prevent duplicate frozen dates', async () => {
      await request(app)
        .post('/api/calendar/freeze-date')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          date: '2026-06-01',
          reason: 'Exam week'
        });

      const response = await request(app)
        .post('/api/calendar/freeze-date')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          date: '2026-06-01',
          reason: 'Holiday'
        });

      expect(response.status).toBe(409);
    });
  });

  // ===== GET SCHEDULED PANELS =====

  describe('GET /api/calendar/panels', () => {
    
    test('TC-API-CAL-007: Should fetch all scheduled panels', async () => {
      const response = await request(app)
        .get('/api/calendar/panels')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('TC-API-CAL-008: Should filter panels by level', async () => {
      const response = await request(app)
        .get('/api/calendar/panels?level=1')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach(panel => {
          expect(panel.level).toBe(1);
        });
      }
    });

    test('TC-API-CAL-009: Should filter panels by date range', async () => {
      const response = await request(app)
        .get('/api/calendar/panels?startDate=2026-05-01&endDate=2026-05-31')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ===== GET FROZEN DATES =====

  describe('GET /api/calendar/frozen-dates', () => {
    
    test('TC-API-CAL-010: Should fetch frozen dates', async () => {
      const response = await request(app)
        .get('/api/calendar/frozen-dates')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

---

## E2E Tests (Cypress)

### Cypress Test Suite

#### File: `cypress/e2e/coordinator-announcements.cy.js`

```javascript
describe('Coordinator - Announcements Feature E2E', () => {
  
  beforeEach(() => {
    // Login as coordinator
    cy.visit('http://localhost:5173/login');
    cy.get('input[type="email"]').type('coordinator@university.edu');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Navigate to announcements
    cy.visit('http://localhost:5173/coordinator/announcements');
  });

  // ===== CREATE ANNOUNCEMENT =====

  test('TC-E2E-ANN-001: User can create announcement with all fields', () => {
    cy.get('button:contains("Post Announcement")').should('exist');
    
    cy.get('input[placeholder="Title"]').type('Project Deadline Extended');
    cy.get('textarea[placeholder="Content"]').type('The final project deadline has been extended by one week due to technical issues.');
    cy.get('select[name="level"]').select('1');
    
    cy.get('button:contains("Post Announcement")').click();
    
    cy.contains('Announcement posted!').should('be.visible');
    cy.contains('Project Deadline Extended').should('be.visible');
  });

  test('TC-E2E-ANN-002: User sees validation error for empty title', () => {
    cy.get('textarea[placeholder="Content"]').type('Some content');
    cy.get('button:contains("Post Announcement")').click();
    
    cy.contains(/title.*required/i).should('be.visible');
  });

  test('TC-E2E-ANN-003: User can filter announcements by level', () => {
    // Create announcements for different levels
    cy.get('input[placeholder="Title"]').type('Level 1 Announcement');
    cy.get('textarea[placeholder="Content"]').type('Content for level 1');
    cy.get('select[name="level"]').select('1');
    cy.get('button:contains("Post Announcement")').click();
    cy.wait(500);

    cy.get('input[placeholder="Title"]').type('Level 2 Announcement');
    cy.get('textarea[placeholder="Content"]').type('Content for level 2');
    cy.get('select[name="level"]').select('2');
    cy.get('button:contains("Post Announcement")').click();
    cy.wait(500);

    // Filter by level 1
    cy.get('select[name="filterLevel"]').select('1');
    cy.contains('Level 1 Announcement').should('be.visible');
    cy.contains('Level 2 Announcement').should('not.exist');
  });

  // ===== EDIT ANNOUNCEMENT =====

  test('TC-E2E-ANN-004: User can edit existing announcement', () => {
    cy.get('input[placeholder="Title"]').type('Original Title');
    cy.get('textarea[placeholder="Content"]').type('Original content');
    cy.get('button:contains("Post Announcement")').click();
    cy.wait(500);

    cy.get('button:contains("Edit"):first').click();
    cy.get('input[placeholder="Title"]').clear().type('Updated Title');
    cy.get('button:contains("Update")').click();

    cy.contains('Updated successfully').should('be.visible');
    cy.contains('Updated Title').should('be.visible');
  });

  // ===== DELETE ANNOUNCEMENT =====

  test('TC-E2E-ANN-005: User can delete announcement', () => {
    cy.get('input[placeholder="Title"]').type('To Delete');
    cy.get('textarea[placeholder="Content"]').type('Will be deleted');
    cy.get('button:contains("Post Announcement")').click();
    cy.wait(500);

    cy.get('button:contains("Delete"):first').click();
    cy.on('window:confirm', () => true);

    cy.contains('Announcement deleted').should('be.visible');
    cy.contains('To Delete').should('not.exist');
  });
});
```

#### File: `cypress/e2e/coordinator-stages.cy.js`

```javascript
describe('Coordinator - Project Stages Feature E2E', () => {
  
  beforeEach(() => {
    cy.login('coordinator@university.edu', 'password123');
    cy.visit('http://localhost:5173/coordinator/stages');
  });

  // ===== CREATE STAGE =====

  test('TC-E2E-STAGE-001: User can create stage with name and description', () => {
    cy.get('button:contains("Add Stage")').click();
    
    cy.get('input[placeholder="Stage Name"]').type('Final Presentation');
    cy.get('textarea[placeholder="Description"]').type('Students present their projects to evaluation panel');
    cy.get('input[type="date"]').type('2026-05-20');
    
    cy.get('button:contains("Save Stage")').click();
    
    cy.contains('Stage created successfully').should('be.visible');
    cy.contains('Final Presentation').should('be.visible');
  });

  // ===== FILE UPLOAD =====

  test('TC-E2E-STAGE-002: User can upload files to stage', () => {
    cy.get('button:contains("Add Stage")').click();
    
    cy.get('input[placeholder="Stage Name"]').type('Proposal');
    cy.get('textarea[placeholder="Description"]').type('Project proposal');
    
    // Upload file via drag-drop
    cy.get('.drag-drop-zone').selectFile('cypress/fixtures/rubric.pdf', {
      action: 'drag-drop'
    });
    
    cy.get('button:contains("Save Stage")').click();
    
    cy.contains('Files uploaded successfully').should('be.visible');
    cy.contains('rubric.pdf').should('be.visible');
  });

  // ===== DOWNLOAD FILES =====

  test('TC-E2E-STAGE-003: User can download stage files', () => {
    cy.contains('Proposal').should('be.visible');
    cy.contains('rubric.pdf').parent().find('button').click();
    
    // Verify download started (file appears in downloads folder)
    cy.readFile('cypress/downloads/rubric.pdf').should('exist');
  });

  // ===== DELETE STAGE =====

  test('TC-E2E-STAGE-004: User can delete stage and all files', () => {
    cy.contains('Proposal').parent().find('button:contains("Delete")').click();
    cy.on('window:confirm', () => true);
    
    cy.contains('Stage deleted successfully').should('be.visible');
    cy.contains('Proposal').should('not.exist');
  });

  // ===== PERSISTENCE =====

  test('TC-E2E-STAGE-005: Stages persist after page refresh', () => {
    cy.get('button:contains("Add Stage")').click();
    cy.get('input[placeholder="Stage Name"]').type('Interim Evaluation');
    cy.get('textarea[placeholder="Description"]').type('Mid-project evaluation');
    cy.get('button:contains("Save Stage")').click();
    
    cy.wait(500);
    cy.reload();
    
    cy.contains('Interim Evaluation').should('be.visible');
  });
});
```

#### File: `cypress/e2e/coordinator-calendar.cy.js`

```javascript
describe('Coordinator - Calendar Feature E2E', () => {
  
  beforeEach(() => {
    cy.login('coordinator@university.edu', 'password123');
    cy.visit('http://localhost:5173/calendar');
  });

  // ===== SCHEDULE PANEL =====

  test('TC-E2E-CAL-001: User can schedule evaluation panel', () => {
    // Click on a date in calendar
    cy.get('button[data-date="2026-05-15"]').click();
    
    // Fill in form
    cy.get('input[placeholder="Location"]').type('Room 201');
    cy.get('select[name="evaluationType"]').select('Proposal');
    cy.get('select[name="group"]').select('Group A');
    cy.get('select[name="supervisor"]').select('Dr. Silva');
    
    cy.get('button:contains("Save Panel")').click();
    
    cy.contains('Panel scheduled successfully').should('be.visible');
    cy.contains('Group A').should('be.visible');
  });

  // ===== FREEZE DATE =====

  test('TC-E2E-CAL-002: User can freeze a date', () => {
    cy.get('button:contains("Freeze Date")').click();
    cy.get('input[type="date"]').type('2026-06-01');
    cy.get('input[placeholder="Reason"]').type('Exam week');
    
    cy.get('button:contains("Freeze")').click();
    
    cy.contains('Date frozen successfully').should('be.visible');
  });

  // ===== PERSISTENCE =====

  test('TC-E2E-CAL-003: Scheduled panels persist after refresh', () => {
    cy.get('button[data-date="2026-05-15"]').click();
    cy.get('select[name="evaluationType"]').select('Proposal');
    cy.get('select[name="group"]').select('Group B');
    cy.get('select[name="supervisor"]').select('Dr. Shah');
    cy.get('button:contains("Save Panel")').click();
    
    cy.wait(500);
    cy.reload();
    
    cy.contains('Group B').should('be.visible');
  });
});
```

#### File: `cypress/e2e/coordinator-gradebook.cy.js`

```javascript
describe('Coordinator - Gradebook Feature E2E', () => {
  
  beforeEach(() => {
    cy.login('coordinator@university.edu', 'password123');
    cy.visit('http://localhost:5173/coordinator/gradebook');
  });

  // ===== VIEW GRADEBOOK =====

  test('TC-E2E-GRADE-001: Gradebook displays all marks correctly', () => {
    cy.contains('Group A').should('be.visible');
    cy.contains('85%').should('be.visible');
    cy.contains('✓ Marked').should('be.visible');
    cy.contains('⏳ Pending').should('be.visible');
  });

  // ===== SEARCH =====

  test('TC-E2E-GRADE-002: User can search by group name', () => {
    cy.get('input[placeholder="Search by group name"]').type('Group A');
    
    cy.contains('Group A').should('be.visible');
    cy.contains('Group B').should('not.exist');
  });

  // ===== FILTER =====

  test('TC-E2E-GRADE-003: User can filter by supervisor', () => {
    cy.get('select[name="supervisor"]').select('Dr. Silva');
    
    cy.contains('Dr. Silva').should('be.visible');
    // Other supervisors should be filtered out
  });

  // ===== SORT =====

  test('TC-E2E-GRADE-004: User can sort by percentage', () => {
    cy.contains('th', '%').click();
    
    // Verify table is sorted (pending items with no percentage appear first)
    cy.get('tbody tr').first().should('contain', '—'); // or percentage value
  });

  // ===== SUMMARY STATS =====

  test('TC-E2E-GRADE-005: Summary statistics display correctly', () => {
    cy.contains(/Total Assignments: \d+/).should('be.visible');
    cy.contains(/Marked: \d+/).should('be.visible');
    cy.contains(/Pending: \d+/).should('be.visible');
    cy.contains(/Average: \d+\.\d+%/).should('be.visible');
  });
});
```

---

## Running the Tests

### Frontend Tests
```bash
# Install dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest ts-jest

# Run all tests
npm test

# Run specific test file
npm test -- Announcements.test.tsx

# Run with coverage
npm test -- --coverage
```

### Backend Tests
```bash
# Install dependencies
npm install --save-dev jest supertest

# Run backend tests
npm test -- tests/api/

# Run with coverage
npm test -- --coverage tests/api/
```

### E2E Tests
```bash
# Install Cypress
npm install --save-dev cypress

# Run Cypress tests
npx cypress run

# Open Cypress UI
npx cypress open
```

---

## Test Coverage Goals

| Feature | Target Coverage | Current |
|---------|-----------------|---------|
| Announcements | 90% | - |
| Stages | 85% | - |
| Calendar | 80% | - |
| Gradebook | 90% | - |
| **Overall** | **85%** | - |

---

## Common Test Issues & Solutions

### Issue: Tests fail with "Cannot find module"

**Solution:**
```bash
npm install  # Reinstall dependencies
npm test -- --clearCache  # Clear Jest cache
```

### Issue: Cypress tests timeout

**Solution:** Increase timeout in `cypress.config.js`:
```javascript
module.exports = {
  e2e: {
    setupNodeEvents(on, config) {},
    defaultCommandTimeout: 10000,
    requestTimeout: 10000
  }
};
```

### Issue: Mock fetch not working in tests

**Solution:** Ensure fetch is mocked before rendering component:
```typescript
global.fetch = jest.fn();

// Set up mock before render
(fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: [] })
});

render(<YourComponent />);
```

---

**Last Updated:** April 30, 2026  
**Maintained by:** Coordinator Development Team
