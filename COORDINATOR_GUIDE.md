# 🎓 COORDINATOR GUIDE - EduSync

## Table of Contents
1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Feature 1: Announcements](#feature-1-announcements)
4. [Feature 2: Calendar & Panel Scheduling](#feature-2-calendar--panel-scheduling)
5. [Feature 3: Project Stages Creation & Management](#feature-3-project-stages-creation--management)
6. [Feature 4: Marking & Evaluation (Gradebook)](#feature-4-marking--evaluation-gradebook)
7. [Quick Reference](#quick-reference)

---

## Overview

The **Coordinator** is the central administrator who manages project evaluation workflow in EduSync. As a coordinator, you:

- **Post announcements** to inform students about important dates and updates
- **Schedule evaluation panels** on a calendar (meetings where supervisors grade student groups)
- **Assign evaluators** (supervisors) to specific groups and stages
- **View gradebooks** to track marks submitted by supervisors and monitor completion

This guide explains how each feature works from **both the frontend (React) and backend (Node.js/Express)** perspectives.

---

## Architecture Overview

### How the System Works

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + TypeScript)                                   │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Coordinator clicks button                                │   │
│ │ ↓                                                         │   │
│ │ React component collects data from form                  │   │
│ │ ↓                                                         │   │
│ │ Validates input locally (TypeScript validation)          │   │
│ │ ↓                                                         │   │
│ │ Sends HTTP request to backend API                        │   │
│ └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│                    HTTP REQUEST                                  │
│                          ↓                                       │
├─────────────────────────────────────────────────────────────────┤
│ BACKEND (Express.js on port 5000)                               │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Route receives request (e.g., POST /api/announcements)   │   │
│ │ ↓                                                         │   │
│ │ Controller validates business logic:                     │   │
│ │ - Is user a coordinator?                                 │   │
│ │ - Are all required fields present?                       │   │
│ │ - Can this action be performed?                          │   │
│ │ ↓                                                         │   │
│ │ Database query executes                                  │   │
│ │ ↓                                                         │   │
│ │ Returns response (JSON) to frontend                      │   │
│ └──────────────────────────────────────────────────────────┘   │
│                          ↑                                       │
│                    HTTP RESPONSE                                 │
│                          ↑                                       │
│ FRONTEND: Receives response                                      │
│ ↓                                                                │
│ Displays success message or error                               │
│ Updates UI (refresh table, close modal, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technology Stack

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| **Frontend** | React + TypeScript + Vite | 5173 (dev) | User interface |
| **Backend** | Node.js + Express | 5000 | API server |
| **Database** | TiDB Cloud (MySQL) | Cloud | Data persistence |

---

## Feature 1: Announcements

### What It Does

Coordinators post announcements (e.g., "Proposal deadline extended") that are displayed to students and supervisors of a specific academic level. Students see only announcements for their level.

### Component Architecture

```
Frontend Files:
├── src/pages/CoordinatorPages/AnnouncementsPage.tsx
│   └── Main page for creating, editing, deleting announcements
├── src/components/coordinator/Announcements.tsx
│   └── Display list of announcements
└── src/components/shared/AnnouncementWidget.tsx
    └── Widget shown on dashboard (recent announcements)

Backend Files:
├── src/routes/announcementRoutes.js
│   └── Defines endpoints
├── src/controllers/announcementController.js
│   └── Business logic & database queries
└── Database: announcements table
```

### Frontend Implementation

#### AnnouncementsPage.tsx

```typescript
// Located: src/pages/CoordinatorPages/AnnouncementsPage.tsx

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [level, setLevel] = useState(1);

  // Fetch existing announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const response = await fetch('http://localhost:5000/api/announcements', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      setAnnouncements(data.data);
    };
    fetchAnnouncements();
  }, []);

  // Create new announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!title.trim() || !content.trim()) {
      showError('Title and content are required');
      return;
    }

    // Send to backend
    const response = await fetch('http://localhost:5000/api/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title,
        content,
        level,
        created_by: currentUserId
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      showSuccess('Announcement posted!');
      setTitle('');
      setContent('');
      // Refresh announcements list
      fetchAnnouncements();
    } else {
      showError(result.error);
    }
  };

  return (
    <div>
      <h1>Announcements</h1>
      
      {/* Create Form */}
      <form onSubmit={handleCreateAnnouncement}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          <option value={1}>Level 1</option>
          <option value={2}>Level 2</option>
          <option value={3}>Level 3</option>
          <option value={4}>Level 4</option>
        </select>
        <button type="submit">Post Announcement</button>
      </form>

      {/* List of Announcements */}
      <div>
        {announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            <h3>{announcement.title}</h3>
            <p>{announcement.content}</p>
            <small>Level {announcement.level} • Posted by {announcement.created_by}</small>
            <button onClick={() => handleDeleteAnnouncement(announcement.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Backend Implementation

#### announcementRoutes.js

```javascript
// Located: src/routes/announcementRoutes.js

const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { authMiddleware, authorizeRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET - Fetch announcements (can filter by level)
// Example: GET /api/announcements?level=1
router.get('/', getAnnouncements);

// POST - Create new announcement (coordinator only)
router.post('/', authorizeRole('coordinator'), createAnnouncement);

// PUT - Update announcement (coordinator only)
router.put('/:id', authorizeRole('coordinator'), updateAnnouncement);

// DELETE - Delete announcement (coordinator only)
router.delete('/:id', authorizeRole('coordinator'), deleteAnnouncement);

module.exports = router;
```

#### announcementController.js

```javascript
// Located: src/controllers/announcementController.js

const db = require('../config/database');

// Get announcements (with optional filtering)
const getAnnouncements = (req, res) => {
  const { level, search } = req.query;
  
  let query = 'SELECT * FROM announcements WHERE 1=1';
  const params = [];

  // Filter by level if provided
  if (level) {
    query += ' AND level = ?';
    params.push(level);
  }

  // Search in title or content
  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: results });
  });
};

// Create new announcement
const createAnnouncement = (req, res) => {
  const { title, content, level, created_by } = req.body;

  // Validation Layer 2 (Backend)
  if (!title || !content || !level) {
    return res.status(400).json({ 
      error: 'Missing required fields: title, content, level' 
    });
  }

  if (![1, 2, 3, 4].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  // Check user is coordinator
  if (req.user.role !== 'coordinator') {
    return res.status(403).json({ error: 'Only coordinators can create announcements' });
  }

  // Insert into database
  db.query(
    'INSERT INTO announcements (title, content, level, created_by, created_at) VALUES (?, ?, ?, ?, NOW())',
    [title, content, level, created_by || req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
        success: true,
        announcement_id: result.insertId,
        message: 'Announcement created successfully'
      });
    }
  );
};

// Update announcement
const updateAnnouncement = (req, res) => {
  const { id } = req.params;
  const { title, content, level } = req.body;

  // Validate fields
  if (!title || !content || !level) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.query(
    'UPDATE announcements SET title = ?, content = ?, level = ?, updated_at = NOW() WHERE id = ?',
    [title, content, level, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Announcement updated' });
    }
  );
};

// Delete announcement
const deleteAnnouncement = (req, res) => {
  const { id } = req.params;

  db.query(
    'DELETE FROM announcements WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Announcement deleted' });
    }
  );
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
```

#### Database Schema

```sql
CREATE TABLE announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  level INT NOT NULL,                  -- 1, 2, 3, or 4
  created_by INT NOT NULL,             -- Coordinator's user ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX (level),                        -- Index for fast filtering by level
  INDEX (created_at)                    -- Index for sorting
);
```

---

## Feature 2: Calendar & Panel Scheduling

### What It Does

Coordinators manage a monthly calendar to:
- **Schedule evaluation panels** (meetings where supervisors grade student groups)
- **Freeze dates** (block scheduling during exam weeks, etc.)
- **Assign supervisors** to evaluate specific groups (integrated into panel scheduling)

### Component Architecture

```
Frontend Files:
├── src/pages/CalendarPage.tsx
│   └── Main calendar page with drawers for scheduling
├── src/components/shared/CalendarGrid.tsx
│   └── Visual month calendar component
└── Browser localStorage
    └── Stores scheduled panels and frozen dates

Backend Files:
├── src/routes/calendarRoutes.js
│   └── Panel scheduling and frozen-date endpoints
├── src/controllers/calendarController.js
│   └── Business logic for calendar operations
└── Database: evaluation_panels table



### Frontend Implementation

#### CalendarPage.tsx

```typescript
// Located: src/pages/CalendarPage.tsx

interface ScheduledPanel {
  id: string;
  title: string;                 // e.g., "Proposal"
  level: number;                 // 1-4
  groupId: number;
  groupName: string;
  date: string;                  // "2025-03-15"
  time: string;                  // "10:00"
  duration: string;              // "60"
  evaluators: string[];          // ["Dr. Silva"]
  location: string;
  meetingLink: string;
  notes: string;
  kind: string;
}

const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledPanels, setScheduledPanels] = useState<ScheduledPanel[]>([]);
  const [frozenDates, setFrozenDates] = useState<string[]>([]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'schedule' | 'freeze'>('schedule');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Form state for scheduling
  const [panelTitle, setPanelTitle] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
  const [panelTime, setPanelTime] = useState('10:00');
  const [panelDuration, setPanelDuration] = useState('60');
  const [panelLocation, setPanelLocation] = useState('');
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedPanels = localStorage.getItem('calendar_panels');
    if (savedPanels) {
      setScheduledPanels(JSON.parse(savedPanels));
    }
    
    const savedFrozenDates = localStorage.getItem('frozen_dates');
    if (savedFrozenDates) {
      setFrozenDates(JSON.parse(savedFrozenDates));
    }
  }, []);

  // Handle scheduling panel
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation (Layer 1)
    if (!selectedDate || !selectedLevel || !selectedGroup || !selectedSupervisor) {
      showError('Please fill all required fields');
      return;
    }

    // STEP 1: Save panel to localStorage
    const newPanel: ScheduledPanel = {
      id: `panel-${Date.now()}`,
      title: panelTitle,
      level: selectedLevel,
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      date: selectedDate,
      time: panelTime,
      duration: panelDuration,
      evaluators: [selectedSupervisor.name],
      location: panelLocation,
      meetingLink: '',
      notes: '',
      kind: 'Coordinator scheduled panel'
    };

    // Save to localStorage
    const updatedPanels = [newPanel, ...scheduledPanels];
    localStorage.setItem('calendar_panels', JSON.stringify(updatedPanels));
    setScheduledPanels(updatedPanels);

    // STEP 2: Trigger backend API to create evaluator assignment
    try {
      const stageMapping: Record<string, number> = {
        'proposal': 2,
        'interim': 3,
        'final': 4,
        'code review': 5
      };

      const response = await fetch('http://localhost:5000/api/marks/assign-evaluator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          group_id: selectedGroup.id,
          stage_id: stageMapping[panelTitle.toLowerCase()],
          supervisor_id: selectedSupervisor.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess('Panel scheduled and evaluator assigned!');
        
        // Reset form
        setPanelTitle('');
        setSelectedGroup(null);
        setSelectedSupervisor(null);
        setDrawerOpen(false);
        
      } else {
        showError(`Failed to assign evaluator: ${result.error}`);
      }
    } catch (error) {
      console.error('Error assigning evaluator:', error);
      showError('Error scheduling panel');
    }
  };

  // Handle freezing date
  const handleFreezeDate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      showError('Please select a date');
      return;
    }

    const updatedFrozen = [...frozenDates, selectedDate];
    localStorage.setItem('frozen_dates', JSON.stringify(updatedFrozen));
    setFrozenDates(updatedFrozen);
    
    showSuccess('Date frozen');
    setDrawerOpen(false);
  };

  // Handle clicking on calendar day
  const handleDayClick = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setDrawerMode('schedule');
    setDrawerOpen(true);
  };

  return (
    <div className="calendar-page">
      <Header />
      <Sidebar />
      
      <main>
        <h1>📅 Calendar Management</h1>
        
        {/* Calendar Grid */}
        <CalendarGrid
          currentMonth={currentMonth}
          onDayClick={handleDayClick}
          scheduledPanels={scheduledPanels}
          frozenDates={frozenDates}
          onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        />

        {/* Schedule Drawer */}
        {drawerOpen && drawerMode === 'schedule' && (
          <div className="drawer">
            <div className="drawer-content">
              <h2>Schedule Evaluation Panel</h2>
              <form onSubmit={handleScheduleSubmit}>
                <div>
                  <label>Date: {selectedDate}</label>
                </div>
                <div>
                  <label>Time:</label>
                  <input type="time" value={panelTime} onChange={(e) => setPanelTime(e.target.value)} />
                </div>
                <div>
                  <label>Duration (minutes):</label>
                  <input type="number" value={panelDuration} onChange={(e) => setPanelDuration(e.target.value)} />
                </div>
                <div>
                  <label>Academic Level:</label>
                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(Number(e.target.value))}>
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                    <option value={4}>Level 4</option>
                  </select>
                </div>
                <div>
                  <label>Evaluation Type:</label>
                  <select value={panelTitle} onChange={(e) => setPanelTitle(e.target.value)}>
                    <option value="">Select stage</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Interim">Interim</option>
                    <option value="Final">Final</option>
                    {selectedLevel === 2 && <option value="Code Review">Code Review</option>}
                  </select>
                </div>
                <div>
                  <label>Select Group:</label>
                  <select onChange={(e) => {
                    // In real app, fetch groups from API
                    setSelectedGroup({ id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text });
                  }}>
                    <option value="">-- Select Group --</option>
                    {/* Options would be fetched from backend */}
                  </select>
                </div>
                <div>
                  <label>Assign Evaluator (Supervisor):</label>
                  <select onChange={(e) => {
                    // In real app, fetch supervisors from API
                    setSelectedSupervisor({ id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text });
                  }}>
                    <option value="">-- Select Supervisor --</option>
                    {/* Options would be fetched from backend */}
                  </select>
                </div>
                <div>
                  <label>Location:</label>
                  <input type="text" value={panelLocation} onChange={(e) => setPanelLocation(e.target.value)} />
                </div>
                
                <button type="submit">Save Panel</button>
                <button type="button" onClick={() => setDrawerOpen(false)}>Cancel</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
```

### Backend Implementation

#### marksController.js - Evaluator Assignment

```javascript
// Located: src/controllers/marksController.js

const db = require('../config/database');

/**
 * Assign a supervisor (evaluator) to evaluate a specific group for a specific stage
 * 
 * Request body:
 * {
 *   group_id: number,           // Which group to evaluate
 *   stage_id: number,           // Which stage (Proposal, Interim, etc.)
 *   supervisor_id: number       // Which supervisor is assigned
 * }
 */
const assignEvaluator = (req, res) => {
  const { group_id, stage_id, supervisor_id } = req.body;

  // ===== LAYER 2: BACKEND VALIDATION =====
  
  // Check all required fields present
  if (!group_id || !stage_id || !supervisor_id) {
    return res.status(400).json({
      error: 'Missing required fields: group_id, stage_id, supervisor_id'
    });
  }

  // Verify all are numbers
  if (typeof group_id !== 'number' || typeof stage_id !== 'number' || typeof supervisor_id !== 'number') {
    return res.status(400).json({
      error: 'Invalid data types: all IDs must be numbers'
    });
  }

  // Check if user is coordinator
  if (req.user.role !== 'coordinator') {
    return res.status(403).json({
      error: 'Only coordinators can assign evaluators'
    });
  }

  // Check for duplicate assignment (same group + stage + supervisor)
  db.query(
    `SELECT id FROM evaluator_assignments 
     WHERE group_id = ? AND stage_id = ? AND supervisor_id = ?`,
    [group_id, stage_id, supervisor_id],
    (err, existingAssignments) => {
      if (err) return res.status(500).json({ error: err.message });

      if (existingAssignments && existingAssignments.length > 0) {
        return res.status(409).json({
          error: 'This evaluator is already assigned to this group for this stage'
        });
      }

      // ===== INSERT NEW ASSIGNMENT =====
      db.query(
        `INSERT INTO evaluator_assignments 
         (group_id, supervisor_id, stage_id, assigned_at)
         VALUES (?, ?, ?, NOW())`,
        [group_id, supervisor_id, stage_id],
        (err, result) => {
          if (err) {
            // Database constraints might reject this
            return res.status(500).json({ 
              error: err.message || 'Failed to assign evaluator'
            });
          }

          res.status(201).json({
            success: true,
            assignment_id: result.insertId,
            message: 'Evaluator assigned successfully'
          });
        }
      );
    }
  );
};

module.exports = {
  assignEvaluator,
  // ... other functions
};
```

#### Database Schema

```sql
CREATE TABLE evaluator_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  supervisor_id INT NOT NULL,
  stage_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES project_stages(stage_id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_assignment (group_id, supervisor_id, stage_id),
  INDEX (supervisor_id),
  INDEX (stage_id)
);
```

---

## Feature 3: Project Stages Creation & Management

### What It Does

Coordinators create and manage project stages (phases) for each academic level. Each stage includes:
- **Stage name** (e.g., "Proposal", "Interim Evaluation", "Final Presentation")
- **Description** of what students must accomplish
- **Deadline** for submission/completion
- **Supporting documents** (PDFs, guidelines, rubrics) that students can download

Students and supervisors can then view these stages and their associated documents, providing a clear timeline and requirements for the project.

### Component Architecture

```
Frontend Files:
├── src/pages/CoordinatorPages/CoordinatorLevelPage.tsx
│   └── Tab interface with "Project Stages" tab
├── src/components/coordinator/StageManagement.tsx
│   └── Create, edit, delete stages with file uploads
├── src/components/student/CoordinatorStageUpdates.tsx
│   └── Student view of stages (read-only with download)
├── src/components/mentor/MentorStageManagement.tsx
│   └── Mentor view of stages (read-only with download)
└── src/components/supervisor/CoordinatorInstructionsView.tsx
    └── Supervisor view of stages (read-only)

Backend Files:
├── src/routes/projectRoutes.js
│   └── Endpoints for stage CRUD and file uploads
├── src/controllers/projectController.js
│   └── Business logic for stage management
└── Database: project_stages, stage_files tables
    └── Cloudinary integration for file storage
```

### Frontend Implementation

#### StageManagement.tsx (Coordinator Create/Edit Interface)

```typescript
// Located: src/components/coordinator/StageManagement.tsx

interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  level?: string;
  files?: Array<{
    file_id?: number;
    file_name: string;
    file_url: string;
    uploaded_by?: number;
    uploaded_at?: string;
  }>;
}

const StageManagement: React.FC<StageManagementProps> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
  });

  // Fetch existing stages on mount
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setStages(data.data);
        }
      } catch (err) {
        console.error('Error fetching stages:', err);
      }
    };

    fetchStages();
  }, [levelNumber]);

  // Create new stage with file uploads
  const handleAddStage = async () => {
    if (!formData.name) {
      alert('Stage name is required');
      return;
    }

    try {
      // Step 1: Create the stage in backend
      const createResponse = await fetch('http://localhost:5000/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: levelNumber,
          stage_name: formData.name,
          description: formData.description,
          deadline: formData.deadline || null,
          created_by: userId,              // From useAuth().user?.id
          user_role: userRole,             // From useAuth().user?.role
        }),
      });

      const createResult = await createResponse.json();
      if (!createResult.success) {
        throw new Error(createResult.message);
      }

      const stageId = createResult.id;  // Real stage_id from database

      // Step 2: Upload files (if any) with the real stage_id
      const filesData: any[] = [];
      
      for (const fileObj of uploadedFiles) {
        const fileFormData = new FormData();
        fileFormData.append('file', fileObj.file);
        fileFormData.append('stage_id', stageId.toString());
        fileFormData.append('uploaded_by', userId.toString());

        const uploadResponse = await fetch('http://localhost:5000/api/projects/upload-file', {
          method: 'POST',
          body: fileFormData,  // FormData, don't set Content-Type
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          filesData.push({
            file_name: fileObj.file.name,
            file_url: uploadResult.file_url,  // Cloudinary URL
          });
        }
      }

      // Step 3: Add to local state
      const newStage: Stage = {
        stage_id: stageId.toString(),
        stage_name: formData.name,
        description: formData.description,
        deadline: formData.deadline || undefined,
        level: levelNumber.toString(),
        files: filesData,
      };

      setStages([...stages, newStage]);
      
      // Reset form
      setFormData({ name: '', description: '', deadline: '' });
      setUploadedFiles([]);
      setShowModal(false);

    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete stage
  const handleDeleteStage = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/projects/delete/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setStages(stages.filter(s => s.stage_id !== id));
      }
    } catch (err) {
      alert(`Error deleting stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="stage-management-container">
      {/* Add Stage Button */}
      <button onClick={() => setShowModal(true)} className="btn-add-stage">
        + Add Stage
      </button>

      {/* Timeline Display */}
      {stages.length === 0 ? (
        <div className="empty-state">No stages created yet</div>
      ) : (
        <div className="timeline-list">
          {stages.map((stage, index) => (
            <div key={stage.stage_id} className="timeline-item">
              <div className="timeline-marker">
                <span>{index + 1}</span>
              </div>
              <div className="timeline-content">
                <h4>{stage.stage_name}</h4>
                <p>{stage.description}</p>
                {stage.deadline && <p>Deadline: {new Date(stage.deadline).toLocaleDateString()}</p>}
                {stage.files?.map(f => (
                  <a key={f.file_id} href={f.file_url} target="_blank">
                    📄 {f.file_name}
                  </a>
                ))}
                <button onClick={() => handleDeleteStage(stage.stage_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <h2>Create New Stage</h2>
            <input
              type="text"
              placeholder="Stage Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
            />
            
            {/* File Upload */}
            <div className="drag-drop-zone" onDrop={handleDrop}>
              <p>Drag and drop PDFs here or click to browse</p>
              <input type="file" multiple onChange={(e) => handleFilesSelected(e.target.files)} />
            </div>

            <button onClick={handleAddStage}>Save Stage</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### CoordinatorStageUpdates.tsx (Student View - Read Only)

```typescript
// Located: src/components/student/CoordinatorStageUpdates.tsx

const StudentStageView: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    const fetchStages = async () => {
      const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
      const data = await response.json();
      if (data.success) setStages(data.data);
    };
    fetchStages();
  }, [levelNumber]);

  return (
    <div className="stage-management-container">
      <div className="timeline-list">
        {stages.map((stage, index) => (
          <div key={stage.stage_id} className="timeline-item">
            <h4>{stage.stage_name}</h4>
            <p>{stage.description}</p>
            {stage.deadline && (
              <span className="deadline-badge">
                📅 {new Date(stage.deadline).toLocaleDateString()}
              </span>
            )}
            
            {/* Download Files */}
            {stage.files?.length > 0 && (
              <div className="files-section">
                <p>Coordinator Attachments:</p>
                {stage.files.map(f => (
                  <button 
                    key={f.file_id}
                    onClick={() => handleDownload(f.file_url, f.file_name)}
                    className="btn-download"
                  >
                    ⬇️ {f.file_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Backend Implementation

#### projectRoutes.js

```javascript
// Located: src/routes/projectRoutes.js

const express = require('express');
const router = express.Router();
const {
  createStage,
  getStagesByLevel,
  updateStage,
  deleteStage,
  uploadFile,
} = require('../controllers/projectController');
const { authMiddleware, authorizeRole } = require('../middleware/authMiddleware');

// GET - Fetch all stages for a level (all users can view)
router.get('/level/:levelNumber', getStagesByLevel);

// POST - Create new stage (coordinator only)
router.post('/create', authMiddleware, authorizeRole('coordinator'), createStage);

// POST - Upload file to stage (coordinator only)
router.post('/upload-file', authMiddleware, organizeRole('coordinator'), uploadFile);

// PUT - Update stage (coordinator only)
router.put('/:id', authMiddleware, authorizeRole('coordinator'), updateStage);

// DELETE - Delete stage (coordinator only)
router.delete('/delete/:id', authMiddleware, authorizeRole('coordinator'), deleteStage);

module.exports = router;
```

#### projectController.js

```javascript
// Located: src/controllers/projectController.js

const db = require('../config/database');
const cloudinary = require('cloudinary').v2;

/**
 * Create a new project stage
 * 
 * Request body:
 * {
 *   level: number,
 *   stage_name: string,
 *   description: string,
 *   deadline: string (date),
 *   created_by: number (user ID),
 *   user_role: string
 * }
 */
const createStage = (req, res) => {
  const { level, stage_name, description, deadline, created_by, user_role } = req.body;

  // Validation
  if (!level || !stage_name) {
    return res.status(400).json({
      error: 'Missing required fields: level, stage_name'
    });
  }

  if (![1, 2, 3, 4].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  // Check user is coordinator
  if (req.user.role !== 'coordinator') {
    return res.status(403).json({
      error: 'Only coordinators can create stages'
    });
  }

  // Insert into database
  db.query(
    `INSERT INTO project_stages (level, stage_name, description, deadline, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [level, stage_name, description, deadline || null, created_by || req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.status(201).json({
        success: true,
        id: result.insertId,
        message: 'Stage created successfully'
      });
    }
  );
};

/**
 * Get all stages for a specific level
 * 
 * Query params: ?levelNumber=1
 */
const getStagesByLevel = (req, res) => {
  const { levelNumber } = req.params;

  if (!levelNumber || ![1, 2, 3, 4].includes(Number(levelNumber))) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  // Get stages and their files
  const query = `
    SELECT 
      ps.stage_id,
      ps.level,
      ps.stage_name,
      ps.description,
      ps.deadline,
      ps.created_by,
      ps.created_at,
      
      -- Files (LEFT JOIN so stages without files still appear)
      sf.file_id,
      sf.file_name,
      sf.file_url,
      sf.uploaded_by,
      sf.uploaded_at
    
    FROM project_stages ps
    LEFT JOIN stage_files sf ON ps.stage_id = sf.stage_id
    
    WHERE ps.level = ?
    ORDER BY ps.created_at ASC, sf.uploaded_at DESC
  `;

  db.query(query, [levelNumber], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Transform results: group files by stage
    const stagesMap = new Map();
    
    results.forEach(row => {
      if (!stagesMap.has(row.stage_id)) {
        stagesMap.set(row.stage_id, {
          stage_id: row.stage_id,
          level: row.level,
          stage_name: row.stage_name,
          description: row.description,
          deadline: row.deadline,
          created_by: row.created_by,
          created_at: row.created_at,
          files: []
        });
      }
      
      if (row.file_id) {
        stagesMap.get(row.stage_id).files.push({
          file_id: row.file_id,
          file_name: row.file_name,
          file_url: row.file_url,
          uploaded_by: row.uploaded_by,
          uploaded_at: row.uploaded_at
        });
      }
    });

    const stages = Array.from(stagesMap.values());
    
    res.json({
      success: true,
      data: stages
    });
  });
};

/**
 * Upload file to stage (via Cloudinary)
 * 
 * FormData:
 * - file: File object
 * - stage_id: number
 * - uploaded_by: number (user ID)
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { stage_id, uploaded_by } = req.body;

    if (!stage_id) {
      return res.status(400).json({ error: 'stage_id is required' });
    }

    const file = req.files.file;

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: `edusync/stages/${stage_id}`,
      resource_type: 'auto'
    });

    // Store file reference in database
    db.query(
      `INSERT INTO stage_files (stage_id, file_name, file_url, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [stage_id, file.name, cloudinaryResult.secure_url, uploaded_by || req.user.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({
          success: true,
          file_id: result.insertId,
          file_url: cloudinaryResult.secure_url,
          message: 'File uploaded successfully'
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete stage and all associated files
 */
const deleteStage = (req, res) => {
  const { id } = req.params;

  // Get files to delete from Cloudinary
  db.query(
    'SELECT file_url FROM stage_files WHERE stage_id = ?',
    [id],
    async (err, files) => {
      if (err) return res.status(500).json({ error: err.message });

      try {
        // Delete from Cloudinary
        for (const file of files) {
          // Extract public_id from URL and delete
          const publicId = file.file_url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`edusync/stages/${id}/${publicId}`);
        }

        // Delete from database
        db.query('DELETE FROM stage_files WHERE stage_id = ?', [id]);
        db.query('DELETE FROM project_stages WHERE stage_id = ?', [id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            success: true,
            message: 'Stage deleted successfully'
          });
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
};

module.exports = {
  createStage,
  getStagesByLevel,
  uploadFile,
  deleteStage,
};
```

#### Database Schema

```sql
-- Project Stages table
CREATE TABLE project_stages (
  stage_id INT PRIMARY KEY AUTO_INCREMENT,
  level INT NOT NULL,                    -- 1, 2, 3, or 4
  stage_name VARCHAR(255) NOT NULL,      -- e.g., "Proposal", "Interim"
  description TEXT,
  deadline DATE,
  created_by INT NOT NULL,               -- Coordinator who created it
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX (level),
  INDEX (created_at)
);

-- Stage Files table (files uploaded to stages)
CREATE TABLE stage_files (
  file_id INT PRIMARY KEY AUTO_INCREMENT,
  stage_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,                -- Cloudinary URL
  uploaded_by INT,                       -- User who uploaded it
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (stage_id) REFERENCES project_stages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX (stage_id),
  INDEX (uploaded_at)
);
```

#### Key Implementation Details

**File Upload Flow:**
1. Coordinator selects files in the modal (drag-drop or click)
2. When "Save Stage" is clicked:
   - First, POST to `/api/projects/create` to create the stage (gets stage_id)
   - Then, for each file, POST to `/api/projects/upload-file` with FormData
   - Files are uploaded to Cloudinary, secure URL returned
   - File references stored in `stage_files` table
3. Students/supervisors download files directly from Cloudinary URLs

**Fetching Stages:**
- GET `/api/projects/level/{levelNumber}` uses LEFT JOIN to include stages even without files
- Results grouped on backend to nest files within stages
- All users (students, supervisors, coordinators) can view stages for their level

**Deletion:**
- DELETE `/api/projects/delete/{id}` deletes stage AND all associated files
- Files removed from Cloudinary first, then database
- Cascade delete ensures consistency

---

## Feature 4: Marking & Evaluation (Gradebook)

### What It Does

Coordinators view a comprehensive gradebook showing:
- All assigned evaluations (which supervisor evaluates which group for which stage)
- Marks submitted by supervisors
- Completion status (Marked vs. Pending)
- Calculated percentages

### Component Architecture

```
Frontend Files:
├── src/components/coordinator/GradebookTable.tsx
│   └── Display marks in searchable, sortable table
├── src/components/supervisor/AssignedEvaluations.tsx
│   └── Supervisor's personal list of groups to evaluate
└── src/pages/CoordinatorPages/CoordinatorLevelPage.tsx
    └── Tab interface including Marking & Evaluation tab

Backend Files:
├── src/routes/marksRoutes.js
│   └── Endpoints for fetching gradebook data
├── src/controllers/marksController.js
│   └── Complex SQL queries with JOINs
└── Database: evaluator_assignments, marks, project_groups tables
```

### Frontend Implementation

#### GradebookTable.tsx

```typescript
// Located: src/components/coordinator/GradebookTable.tsx

interface GradebookRecord {
  mark_id: number;
  group_id: number;
  stage_id: number;
  group_name: string;
  level: number;
  stage_name: string;
  marks_obtained: number | null;
  total_marks: number;
  percentage: number | null;
  supervisor_name: string;
  supervisor_email: string;
  feedback: string | null;
  status: 'Marked' | 'Pending';
  created_at: string;
}

const GradebookTable: React.FC = () => {
  const [data, setData] = useState<GradebookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Fetch gradebook data from backend
  useEffect(() => {
    const fetchGradebook = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/marks/gradebook', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch gradebook');
        }

        const result = await response.json();
        setData(result.data || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchGradebook();
  }, []);

  // Filter data based on search and supervisor filter
  const filteredData = data.filter(row => {
    const matchesSearch = row.group_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupervisor = !filterSupervisor || row.supervisor_name === filterSupervisor;
    return matchesSearch && matchesSupervisor;
  });

  // Sort filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    const key = sortConfig.key as keyof GradebookRecord;
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column header click to sort
  const handleSort = (key: keyof GradebookRecord) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="gradebook-table">
      <h2>Gradebook - All Marks</h2>

      {/* Search and Filter */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search by group name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterSupervisor}
          onChange={(e) => setFilterSupervisor(e.target.value)}
        >
          <option value="">All Supervisors</option>
          {[...new Set(data.map(d => d.supervisor_name))].map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('group_name')}>
              Group {sortConfig.key === 'group_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('stage_name')}>
              Stage {sortConfig.key === 'stage_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('marks_obtained')}>
              Marks {sortConfig.key === 'marks_obtained' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('percentage')}>
              % {sortConfig.key === 'percentage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('supervisor_name')}>
              Supervisor {sortConfig.key === 'supervisor_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('status')}>
              Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((record) => (
            <tr key={record.mark_id || `${record.group_id}-${record.stage_id}`}>
              <td>{record.group_name}</td>
              <td>{record.stage_name}</td>
              <td>{record.marks_obtained !== null ? `${record.marks_obtained}/${record.total_marks}` : '—'}</td>
              <td className={record.percentage ? `grade-${Math.floor(record.percentage / 10)}` : ''}>
                {record.percentage !== null ? `${record.percentage}%` : '—'}
              </td>
              <td>{record.supervisor_name}</td>
              <td className={`status-${record.status.toLowerCase()}`}>
                {record.status === 'Marked' ? '✓' : '⏳'} {record.status}
              </td>
              <td>{record.feedback || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedData.length === 0 && (
        <div className="no-data">No gradebook records found</div>
      )}

      {/* Summary Statistics */}
      <div className="gradebook-stats">
        <div>Total Assignments: {data.length}</div>
        <div>Marked: {data.filter(d => d.status === 'Marked').length}</div>
        <div>Pending: {data.filter(d => d.status === 'Pending').length}</div>
        <div>Average: {(data
          .filter(d => d.marks_obtained !== null)
          .reduce((sum, d) => sum + (d.percentage || 0), 0) / 
          data.filter(d => d.marks_obtained !== null).length
        ).toFixed(2)}%</div>
      </div>
    </div>
  );
};
```

### Backend Implementation

#### marksController.js - Get Gradebook

```javascript
// Located: src/controllers/marksController.js

/**
 * Get complete gradebook with all marks and evaluator assignments
 * 
 * This query JOINs four tables to provide comprehensive mark data
 */
const getCoordinatorGradebook = (req, res) => {
  const query = `
    SELECT 
      -- Group Information
      g.id as group_id,
      g.group_name,
      g.level,
      
      -- Stage Information
      s.stage_id,
      s.stage_name,
      s.deadline,
      
      -- Marks Information (may be NULL if not yet submitted)
      m.id as mark_id,
      m.marks_obtained,
      COALESCE(m.total_marks, 100) as total_marks,
      
      -- Calculate percentage
      CASE 
        WHEN m.marks_obtained IS NOT NULL 
        THEN ROUND((m.marks_obtained / COALESCE(m.total_marks, 100)) * 100, 2)
        ELSE NULL 
      END as percentage,
      
      m.feedback,
      
      -- Supervisor Information
      u.id as supervisor_id,
      u.name as supervisor_name,
      u.email as supervisor_email,
      
      -- Status (Marked or Pending)
      CASE 
        WHEN m.marks_obtained IS NOT NULL THEN 'Marked'
        ELSE 'Pending'
      END as status,
      
      -- Timestamps
      m.created_at,
      m.updated_at
    
    FROM evaluator_assignments ea
    
    -- Join with project groups to get group details
    LEFT JOIN project_groups g ON ea.group_id = g.id
    
    -- Join with project stages to get stage names and deadlines
    LEFT JOIN project_stages s ON ea.stage_id = s.stage_id
    
    -- Join with users to get supervisor details
    LEFT JOIN users u ON ea.supervisor_id = u.id
    
    -- Join with marks to get submitted grades (LEFT JOIN = includes pending)
    LEFT JOIN marks m ON (
      m.group_id = ea.group_id 
      AND m.stage_id = ea.stage_id 
      AND m.evaluator_id = ea.supervisor_id
    )
    
    ORDER BY g.level ASC, ea.assigned_at DESC, g.group_name ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Gradebook query error:', err);
      return res.status(500).json({ 
        error: 'Failed to fetch gradebook',
        details: err.message 
      });
    }

    res.json({
      success: true,
      data: results || []
    });
  });
};

/**
 * Get evaluator assignments for a specific supervisor
 * Used by supervisors to see their list of groups to evaluate
 */
const getEvaluatorAssignments = (req, res) => {
  const supervisorId = req.query.supervisor_id;

  if (!supervisorId) {
    return res.status(400).json({ 
      error: 'supervisor_id query parameter required' 
    });
  }

  const query = `
    SELECT 
      ea.id as assignment_id,
      g.id as group_id,
      g.group_name,
      g.level,
      s.stage_id,
      s.stage_name,
      s.deadline,
      ea.assigned_at,
      
      CASE 
        WHEN m.marks_obtained IS NOT NULL THEN 'Marked'
        ELSE 'Pending'
      END as marks_status,
      
      m.marks_obtained,
      m.percentage,
      m.feedback
    
    FROM evaluator_assignments ea
    LEFT JOIN project_groups g ON ea.group_id = g.id
    LEFT JOIN project_stages s ON ea.stage_id = s.stage_id
    LEFT JOIN marks m ON (
      m.group_id = ea.group_id 
      AND m.stage_id = ea.stage_id 
      AND m.evaluator_id = ea.supervisor_id
    )
    
    WHERE ea.supervisor_id = ?
    ORDER BY ea.assigned_at DESC
  `;

  db.query(query, [supervisorId], (err, results) => {
    if (err) {
      console.error('Assignment query error:', err);
      return res.status(500).json({ 
        error: 'Failed to fetch assignments',
        details: err.message 
      });
    }

    res.json({
      success: true,
      data: results || []
    });
  });
};

module.exports = {
  getCoordinatorGradebook,
  getEvaluatorAssignments,
  // ... other functions
};
```

#### Understanding the SQL JOIN

The gradebook query is the most complex because it combines data from 4 tables:

```
evaluator_assignments (assignments)
  ├─ Link supervisor to group+stage
  └─ START HERE

LEFT JOIN project_groups (group details)
  ├─ Get group name, level, etc.
  └─ ALL rows from assignments included

LEFT JOIN project_stages (stage details)
  ├─ Get stage name, deadline
  └─ ALL rows from assignments included

LEFT JOIN marks (actual grades)
  ├─ Get marks if submitted
  └─ LEFT JOIN = if no mark submitted, row still appears with NULL values
```

**Why LEFT JOIN?**
- If a supervisor hasn't submitted marks yet, we STILL want to show the assignment as "Pending"
- If we used INNER JOIN, pending assignments would be hidden
- LEFT JOIN ensures we see all assignments with pending ones showing NULL values

---

## Quick Reference

### Key Routes (Backend)

| HTTP | Route | Purpose | Role |
|------|-------|---------|------|
| POST | /api/announcements | Create announcement | Coordinator |
| GET | /api/announcements | Fetch announcements (filter by level) | All |
| PUT | /api/announcements/:id | Update announcement | Coordinator |
| DELETE | /api/announcements/:id | Delete announcement | Coordinator |
| POST | /api/marks/assign-evaluator | Assign supervisor to group+stage | Coordinator |
| GET | /api/marks/gradebook | Get all marks with assignments | Coordinator |
| GET | /api/marks/assignments | Get supervisor's assigned groups | Supervisor |
| GET | /api/projects/level/:levelNumber | Get all stages for a level | All |
| POST | /api/projects/create | Create new stage | Coordinator |
| POST | /api/projects/upload-file | Upload file to stage | Coordinator |
| DELETE | /api/projects/delete/:id | Delete stage (all files) | Coordinator |

### Database Tables (Coordinator Related)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| announcements | Broadcast messages | id, title, content, level, created_by, created_at |
| evaluator_assignments | Supervisor→Group assignments | id, group_id, supervisor_id, stage_id, assigned_at |
| marks | Submitted grades | id, group_id, stage_id, marks_obtained, evaluator_id, feedback |
| project_groups | Student project groups | id, group_name, level, supervisor_id |
| project_stages | Project phases/stages | stage_id, level, stage_name, description, deadline, created_by, created_at |
| stage_files | Files attached to stages | file_id, stage_id, file_name, file_url, uploaded_by, uploaded_at |

### Frontend Components (Coordinator Related)

| Component | File | Purpose |
|-----------|------|---------|
| AnnouncementsPage | src/pages/CoordinatorPages/AnnouncementsPage.tsx | Create/manage announcements |
| CalendarPage | src/pages/CalendarPage.tsx | Schedule panels & freeze dates |
| StageManagement | src/components/coordinator/StageManagement.tsx | Create/edit/delete stages with file uploads |
| GradebookTable | src/components/coordinator/GradebookTable.tsx | View marks & track completion |
| AssignedEvaluations | src/components/supervisor/AssignedEvaluations.tsx | Supervisor's personal list |
| CoordinatorStageUpdates | src/components/student/CoordinatorStageUpdates.tsx | Student view of stages (read-only) |
| MentorStageManagement | src/components/mentor/MentorStageManagement.tsx | Mentor view of stages (read-only) |
| CoordinatorLevelPage | src/pages/CoordinatorPages/CoordinatorLevelPage.tsx | Tab interface (stages, groups, marking) |

---

## Testing the Coordinator Features

### Manual Testing Checklist

- [ ] **Announcements**
  - [ ] Create announcement with all fields
  - [ ] Verify level filtering works
  - [ ] Edit announcement
  - [ ] Delete announcement
  - [ ] Non-coordinators cannot create announcements

- [ ] **Calendar**
  - [ ] Schedule panel with all fields
  - [ ] Verify evaluator assignment is created in DB
  - [ ] Freeze a date
  - [ ] Panels persist after page refresh
  - [ ] Frozen dates persist after page refresh

- [ ] **Project Stages**
  - [ ] Create stage with name, description, deadline
  - [ ] Upload files to stage (drag-drop and click)
  - [ ] Verify files stored in Cloudinary
  - [ ] View stage details (as student, mentor, supervisor)
  - [ ] Download stage files (all users)
  - [ ] Edit stage details
  - [ ] Delete stage (deletes all associated files)
  - [ ] Stages persist after page refresh
  - [ ] Non-coordinators cannot create/edit/delete stages

- [ ] **Gradebook**
  - [ ] All assignments appear in table
  - [ ] Pending assignments show with NULL marks
  - [ ] Submitted marks show correctly
  - [ ] Percentages calculate correctly
  - [ ] Search by group name works
  - [ ] Sort by any column works
  - [ ] Filter by supervisor works

---

## Troubleshooting Common Issues

### Issue: Backend returns 403 Forbidden when creating announcement

**Cause:** User is not a coordinator role

**Solution:** 
1. Check `authMiddleware` is validating token correctly
2. Verify user record in database has `role = 'coordinator'`
3. Check token is not expired

### Issue: Files fail to upload to stage

**Cause:** Cloudinary configuration missing or file size too large

**Solution:**
1. Verify Cloudinary API keys in `.env` file
2. Check file size is under Cloudinary limit (100MB default)
3. Check browser console for specific error message
4. Verify FormData is being sent correctly (no Content-Type header)

### Issue: Stage shows but files don't appear

**Cause:** LEFT JOIN in query includes stages without files; files deleted from Cloudinary

**Solution:**
1. Check `stage_files` table has records for the stage_id
2. Verify file_url is valid by visiting URL in browser
3. Check Cloudinary dashboard to see if files exist there
4. Re-upload files if they were deleted from Cloudinary

### Issue: File download returns 404 or CORS error

**Cause:** Cloudinary URL expired or CORS not configured

**Solution:**
1. Check Cloudinary secure_url is being stored (not old file_url)
2. Verify Cloudinary CORS settings allow your domain
3. Use `secure_url` when uploading to Cloudinary, not temporary URL

### Issue: Gradebook shows no data

**Cause:** No evaluator assignments have been created

**Solution:**
1. Create at least one evaluator assignment via Calendar panel scheduling
2. Verify assignment was created: Check `evaluator_assignments` table
3. Verify marks table exists and has data

### Issue: Calendar panels don't persist after refresh

**Cause:** localStorage key mismatch

**Solution:**
1. Check browser console: `localStorage.getItem('calendar_panels')`
2. Verify key is exactly 'calendar_panels'
3. Clear localStorage and reschedule panels

---

**For more details, see [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) and the study guide in the root directory.**
