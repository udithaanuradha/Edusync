import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, ClipboardList, ListChecks } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import ProjectTimeline from './ProjectTimeline';
import TaskCreation, { ProjectTask, TaskStatus } from './TaskCreation';
import TaskKanbanBoard, { TaskCardError } from './TaskKanbanBoard';
import MemberProfileModal from '../../components/shared/MemberProfileModal';
import './ProjectManagementPage.css';

type TabKey = 'timeline' | 'createTasks' | 'myTasks';
type UserRole = 'leader' | 'member';

interface MilestoneFeedbackItem {
  id: number | string;
  title: string;
  status: string;
  feedback_reason: string;
  feedback_seen_at: string | null;
}

type AvatarRole = 'member' | 'supervisor' | 'mentor';

interface AvatarPerson {
  id: number | string;
  name: string;
  role: AvatarRole;
}

// Same initials pattern used by Header.tsx / StudentAttention.tsx / GroupTasksTab.tsx —
// first letters of up to the first two words of the name, uppercased.
const getInitials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

const tabItems = [
  { key: 'timeline', label: 'Project Timeline', icon: Calendar },
  { key: 'createTasks', label: 'Task Creation', icon: ClipboardList },
  { key: 'myTasks', label: 'My Tasks', icon: ListChecks },
] as const;

const ProjectManagementPage: React.FC = () => {
  const location = useLocation();
  // Read level and groupId passed from StudentLevelInnerPages navigation
  const navState = (location.state as { level?: number; groupId?: number | string; groupLeader?: string } | null) || {};

  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const [groupMembers, setGroupMembers] = useState<{id: number | string, name: string}[] | null>(null);
  const [supervisor, setSupervisor] = useState<{id: number | string, name: string} | null>(null);
  const [mentor, setMentor] = useState<{id: number | string, name: string} | null>(null);
  const [milestoneOptions, setMilestoneOptions] = useState<{id: number | string, title: string}[] | null>(null);
  const [milestoneFeedback, setMilestoneFeedback] = useState<MilestoneFeedbackItem[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [milestoneFilter, setMilestoneFilter] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState<string | number>('');
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);

  // ── UI-only state for the "My Tasks" Kanban board ──────────────────────
  // Tracks in-flight drag/click status changes so the board can move a card
  // immediately and roll it back if the underlying request fails, without
  // touching handleUpdateTaskStatus itself.
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, TaskStatus>>({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Record<string, boolean>>({});
  const [taskErrors, setTaskErrors] = useState<Record<string, TaskCardError>>({});
  const projectTasksRef = useRef<ProjectTask[]>(projectTasks);
  const taskErrorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});


  /**
   * Tells the backend the student has now viewed their group's currently
   * unseen supervisor feedback, then lets Header.tsx's polling badge know
   * to refresh immediately instead of waiting for its next poll tick.
   */
  const markGroupFeedbackSeen = async (gId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/milestones/feedback/mark-seen/${gId}`, {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'X-User-Id': currentUser?.id || JSON.parse(localStorage.getItem('user') || '{}').id,
          'X-User-Role': currentUser?.role || JSON.parse(localStorage.getItem('user') || '{}').role,
        },
      });
      window.dispatchEvent(new CustomEvent('supervisor-feedback-seen'));
    } catch (e) {
      console.error("❌ [Frontend] Failed to mark feedback as seen", e);
    }
  };

/**
   * REQUEST #1: GET Milestones for a specific group
   * Triggered: Initial load & when switching to 'createTasks' tab
   */
  const fetchMilestones = async (gId: number) => {
    if (!gId) {
      console.warn("⚠️ [Frontend] fetchMilestones called without Group ID");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-User-Id': currentUser?.id || JSON.parse(localStorage.getItem('user') || '{}').id,
        'X-User-Role': currentUser?.role || JSON.parse(localStorage.getItem('user') || '{}').role,
      };

      console.log(`📡 [Frontend] Fetching Milestones for Group: ${gId}`);
      const res = await fetch(`http://localhost:5000/api/milestones/group/${gId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch milestones");

      const data = await res.json();
      console.log(`✅ [Frontend] Milestones received for Group ${gId}:`, data);

      if (data.success && data.data) {
        const options = data.data.map((m: any) => ({ id: m.id, title: m.title }));
        console.log(`📋 [Frontend] Populating Milestone Options:`, options);
        setMilestoneOptions(options);

        // Supervisor/coordinator feedback (milestones.feedback_reason),
        // surfaced in the "Supervisor Feedback" section on this page.
        const feedbackItems: MilestoneFeedbackItem[] = data.data
          .filter((m: any) => m.feedback_reason)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            feedback_reason: m.feedback_reason,
            feedback_seen_at: m.feedback_seen_at || null,
          }));
        setMilestoneFeedback(feedbackItems);

        // Viewing this page counts as "seeing" any feedback that hasn't
        // been marked seen yet — clears the red badge in Header.tsx.
        if (feedbackItems.some((item) => !item.feedback_seen_at)) {
          markGroupFeedbackSeen(gId);
        }
      } else {
        console.warn(`⚠️ [Frontend] No milestones found for Group ${gId}`);
        setMilestoneOptions([]);
        setMilestoneFeedback([]);
      }
    } catch (e) {
      console.error("❌ [Frontend] Failed to load milestones", e);
      setMilestoneOptions([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Reset states to prevent carryover when switching groups/levels
      setGroupMembers(null);
      setSupervisor(null);
      setMentor(null);
      setMilestoneOptions(null);
      setMilestoneFeedback([]);
      setProjectTasks([]);
      setError(null);
      
      try {
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user.id) {
          setError("User session not found. Please log in again.");
          return;
        }
        setCurrentUser(user);

        const token = localStorage.getItem('token');
        const headers: any = { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
          'X-User-Role': user.role,
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const safeFetch = async (url: string) => {
          console.log(`📡 Fetching: ${url}`);
          const res = await fetch(url, { headers });
          if (!res.ok) {
            const text = await res.text();
            console.error(`❌ Fetch failed for ${url}:`, text);
            throw new Error(`Server returned ${res.status} for ${url.split('/').pop()}. Check console for details.`);
          }
          const data = await res.json();
          console.log(`✅ Response from ${url}:`, data);
          return data;
        };

        // ── Step 1: Resolve the correct groupId ─────────────────────────────
        // Priority: groupId passed via navigation state > match by level > first group
        let gId: number | null = null;
        let resolvedLevel: number | null = null;

        if (navState.groupId) {
          // Came from a specific level's "Start Manage the Project" button
          gId = Number(navState.groupId);
          resolvedLevel = navState.level ? Number(navState.level) : null;
          console.log(`🎯 Using navigation state — Group ID: ${gId}, Level: ${resolvedLevel}`);
        } else {
          // Fallback: fetch all groups and match by user level
          try {
            const groupData = await safeFetch(`http://localhost:5000/api/groups/my-status/${user.id}`);
            if (!groupData || groupData.length === 0) {
              setError("No group found for this user. Please form a group first.");
              setGroupMembers([]);
              setMilestoneOptions([]);
              return;
            }
            const activeGroup =
              groupData.find((g: any) => Number(g.level) === Number(user.level)) ||
              groupData[0];
            gId = activeGroup.groupId;
            resolvedLevel = activeGroup.level ? Number(activeGroup.level) : null;
            console.log(`🎯 Fallback group match — Group ID: ${gId}, Level: ${resolvedLevel}`);
          } catch (e: any) {
            setError(`Failed to find group: ${e.message}`);
            return;
          }
        }

        if (!gId) {
          setError("Could not resolve your project group. Please navigate from your Level page.");
          return;
        }

        setGroupId(gId);
        setCurrentLevel(resolvedLevel);

        // ── Step 2: Members ──────────────────────────────────────────────────
        try {
          const membersData = await safeFetch(`http://localhost:5000/api/groups/${gId}/members`);
          if (membersData.success && membersData.data) {
            setGroupMembers(membersData.data);
            setSupervisor(membersData.supervisor || null);
            setMentor(membersData.mentor || null);
            const me = membersData.data.find((m: any) => String(m.id) === String(user.id));
            const navLeaderName = String(navState.groupLeader || '').trim().toLowerCase();
            const currentUserName = String(user.name || '').trim().toLowerCase();
            const isLeaderFromNavigation = Boolean(navLeaderName) && navLeaderName === currentUserName;
            const isLeaderFromMembership = Number(me?.is_leader) === 1;

            setUserRole(isLeaderFromNavigation || isLeaderFromMembership ? 'leader' : 'member');
            if (membersData.data.length > 0) {
              setSelectedAssignee(membersData.data[0].id);
            }
          } else {
            setGroupMembers([]);
            setSupervisor(null);
            setMentor(null);
          }
        } catch (e) {
          console.error("Failed to load members", e);
          setGroupMembers([]);
          setSupervisor(null);
          setMentor(null);
        }

        // ── Step 3: Milestones for this group ────────────────────────────────
        await fetchMilestones(gId);

        // ── Step 4: Tasks for this group only ────────────────────────────────
        try {
          const tasksData = await safeFetch(`http://localhost:5000/api/milestones/tasks/group/${gId}`);
          if (tasksData.success && tasksData.data) {
            setProjectTasks(tasksData.data.map((t: any) => ({
              id: t.id.toString(),
              milestoneId: t.milestone_id,
              milestone: t.milestone_title,
              title: t.task_name,
              description: t.description || '',
              assignedToId: t.assigned_to,
              assignedTo: t.assigned_to_name || 'Unknown',
              status: t.status,
              startDate: t.created_at ? t.created_at.split('T')[0] : '',
              endDate: t.due_date ? t.due_date.split('T')[0] : '',
            })));
          } else {
            setProjectTasks([]);
          }
        } catch (e) {
          console.error("Failed to load tasks", e);
          setProjectTasks([]);
        }

        console.log(`✅ Loaded project data — Group: ${gId}, Level: ${resolvedLevel}`);

      } catch (err: any) {
        console.error("❌ Critical error in ProjectManagementPage:", err);
        setError(`System error: ${err.message}`);
      }
    };

    fetchData().finally(() => setLoading(false));
  // Re-run if navigation state changes (user navigates from a different level)
  }, [navState.groupId, navState.level]);

  // Sync milestones when switching to Task Creation tab
  useEffect(() => {
    if (activeTab === 'createTasks' && groupId) {
      fetchMilestones(groupId);
    }
  }, [activeTab, groupId]);

  // Keep a live ref of projectTasks so the Kanban board's optimistic-update
  // wrapper can read the freshest server-confirmed status after awaiting
  // handleUpdateTaskStatus, without that value going stale in a closure.
  useEffect(() => {
    projectTasksRef.current = projectTasks;
  }, [projectTasks]);

  // Clear any pending "show error for a few seconds" timers on unmount
  useEffect(() => {
    return () => {
      Object.values(taskErrorTimers.current).forEach(clearTimeout);
    };
  }, []);


  // Student members + the group's assigned supervisor/mentor, combined into
  // one avatar row. Order: members first (existing behavior unchanged),
  // then supervisor, then mentor — each tagged so they render with a
  // distinct border/label instead of a plain member avatar.
  const teamAvatars = useMemo<AvatarPerson[]>(() => {
    const people: AvatarPerson[] = (groupMembers || []).map((member) => ({
      id: member.id,
      name: member.name,
      role: 'member',
    }));
    if (supervisor) people.push({ id: supervisor.id, name: supervisor.name, role: 'supervisor' });
    if (mentor) people.push({ id: mentor.id, name: mentor.name, role: 'mentor' });
    return people;
  }, [groupMembers, supervisor, mentor]);

  const filteredTasks = useMemo(() => {
    let tasks = projectTasks;
    if (milestoneFilter !== 'All') {
      tasks = tasks.filter((task) => task.milestone === milestoneFilter);
    }
    return tasks;
  }, [projectTasks, milestoneFilter]);

  const visibleMyTasks = useMemo(() => {
    if (userRole === 'leader') {
      return projectTasks.filter((task) => String(task.assignedToId) === String(selectedAssignee));
    }
    return projectTasks.filter((task) => currentUser && String(task.assignedToId) === String(currentUser.id));
  }, [projectTasks, selectedAssignee, userRole, currentUser]);

  const taskSummary = useMemo(() => {
    const summary = {
      TODO: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    } as Record<'TODO' | 'IN_PROGRESS' | 'COMPLETED', number>;
    visibleMyTasks.forEach((task) => {
      if (task.status in summary) {
        summary[task.status as keyof typeof summary] += 1;
      }
    });
    return summary;
  }, [visibleMyTasks]);










/**
   * REQUEST #5: POST Create a new task
   * Triggered: Leader clicks "Save" in TaskCreation component
   */
  const handleSaveTask = async (task: ProjectTask) => {
    try {
      const token = localStorage.getItem('token');
      const isExisting = projectTasks.some((t) => t.id === task.id);

      if (!isExisting) {
        // Create new task in DB
        const res = await fetch('http://localhost:5000/api/milestones/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            milestone_id: task.milestoneId,
            assigned_to: task.assignedToId,
            task_name: task.title,
            description: task.description,
            due_date: task.endDate
          })
        });
        
        const data = await res.json();
        if (data.success) {
          setProjectTasks(prev => [...prev, { ...task, id: data.data.id.toString(), status: 'TODO' }]);
        }
      } else {
        // We do not have full task edit API yet, but we have status update
        // Optional: Update status if needed or just update local state
        setProjectTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
      }
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };




  /**
   * REQUEST #7: DELETE a task
   * Triggered: Leader clicks Delete icon
   */

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/milestones/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjectTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };




  /**
   * REQUEST #6: PUT Update status (Start/Done)
   * Triggered: User clicks ▶ Start or ✓ Done
   */
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/milestones/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setProjectTasks((prev) =>
          prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t)
        );
      }
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };




//login pages as member and leader to test the different views and functionalities. Ensure that the backend is running and accessible at http://localhost:5000, and that the API endpoints are correctly implemented to handle the requests made by this frontend component.

  // Waits for one full render/commit cycle so a state update made inside an
  // awaited async call (e.g. handleUpdateTaskStatus's setProjectTasks) has
  // definitely been flushed before we read it back via projectTasksRef.
  const waitForNextPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  /**
   * Kanban board wrapper — both drag-and-drop and the card's Start/Done
   * buttons call this. It moves the card optimistically, then calls the
   * EXISTING handleUpdateTaskStatus (unmodified, same call the old table's
   * buttons always used) and reconciles against the real result: on success
   * the optimistic override is simply dropped (real data already matches),
   * on failure the card reverts to its previous column and shows a visible,
   * dismissable error instead of failing silently.
   */
  const handleBoardStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const current = projectTasksRef.current.find((t) => t.id === taskId);
    if (!current || current.status === newStatus || pendingTaskIds[taskId]) return;

    if (taskErrorTimers.current[taskId]) {
      clearTimeout(taskErrorTimers.current[taskId]);
      delete taskErrorTimers.current[taskId];
    }
    setTaskErrors((prev) => {
      if (!(taskId in prev)) return prev;
      const next = { ...prev };
      delete next[taskId];
      return next;
    });

    setOptimisticStatus((prev) => ({ ...prev, [taskId]: newStatus }));
    setPendingTaskIds((prev) => ({ ...prev, [taskId]: true }));

    await handleUpdateTaskStatus(taskId, newStatus);
    await waitForNextPaint();

    const confirmed = projectTasksRef.current.find((t) => t.id === taskId);

    setPendingTaskIds((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setOptimisticStatus((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });

    if (!confirmed || confirmed.status !== newStatus) {
      setTaskErrors((prev) => ({
        ...prev,
        [taskId]: { message: "Couldn't update status. Please try again.", targetStatus: newStatus },
      }));
      taskErrorTimers.current[taskId] = setTimeout(() => {
        setTaskErrors((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        delete taskErrorTimers.current[taskId];
      }, 5000);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <div className="student-inner-tab-panel" key="timeline">
            <div className="student-inner-tab-heading">
              <div className="student-inner-tab-heading-icon"><Calendar size={20} /></div>
              <div className="student-inner-tab-heading-text">
                <h3>
                  Project Timeline
                  <span className="student-inner-tab-heading-tag">
                    {userRole === 'leader' ? 'Leader View' : 'Member View'}
                  </span>
                </h3>
                <p>View the timeline of your project stages and milestones.</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-container">Loading project data...</div>
            ) : error ? (
              <div className="error-container">
                <p><strong>Error:</strong> {error}</p>
                <button 
                  onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                  className="secondary-btn"
                  style={{ marginTop: '15px', border: '1px solid #cbd5e1' }}
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <ProjectTimeline 
                groupIdProp={groupId} 
                onMilestonesSubmitted={() => groupId && fetchMilestones(groupId)} 
              />
            )}
          </div>
        );


    //create tasks as a leader and see what are in my tasks 
      case 'createTasks':
        return (
          <div className="student-inner-tab-panel" key="createTasks">
            <div className="student-inner-tab-heading">
              <div className="student-inner-tab-heading-icon"><ClipboardList size={20} /></div>
              <div className="student-inner-tab-heading-text">
                <h3>Task Creation</h3>
                {userRole === 'leader' ? (
                  <p>Create, assign, and track tasks for each student in your project group.</p>
                ) : (
                  <p className="role-warning">Only Leaders can create tasks. You are currently viewing as a Member.</p>
                )}
              </div>
            </div>
            {loading ? (
              <div className="loading-container">Loading project data...</div>
            ) : error ? (
              <div className="error-container">
                <p><strong>Error:</strong> {error}</p>
                <p style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
                  This usually means the backend at <code>http://localhost:5000</code> is unreachable or returning HTML instead of JSON. 
                  Please ensure your backend is running and check the browser console (F12) for more details.
                </p>
                <button 
                  onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                  className="secondary-btn"
                  style={{ marginTop: '15px', border: '1px solid #cbd5e1' }}
                >
                  Retry Loading
                </button>
              </div>
            ) : userRole === 'leader' ? (
             
             
              <TaskCreation
                tasks={projectTasks}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
                groupMembers={groupMembers || []}
                milestoneOptions={milestoneOptions || []}
              />
            ) : (
              <div className="member-task-note">
                <p>
                  Task creation is restricted to the project leader. Once tasks are assigned, you can see them under My Tasks.
                </p>
              </div>
            )}
          </div>
        );
      
      
      // my task as a member and a leader 
        case 'myTasks':
          return (
          <div className="student-inner-tab-panel" key="myTasks">
            <div className="student-inner-tab-heading">
              <div className="student-inner-tab-heading-icon"><ListChecks size={20} /></div>
              <div className="student-inner-tab-heading-text">
                <h3>My Tasks</h3>
                <p>Track assigned work and quickly review available, ongoing, and completed items.</p>
              </div>
            </div>
            {userRole === 'leader' && (
              <div className="member-filter-row">
                <label htmlFor="assignee-filter-select">Show tasks for</label>
                <select
                  id="assignee-filter-select"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                >
                  {(groupMembers || []).map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            )}

    
            <div className="my-tasks-table-card">
              {visibleMyTasks.length === 0 ? (
                <div className="empty-state-card">
                  <p>No assigned tasks yet. Once a leader creates tasks, they will appear here.</p>
                </div>
              ) : (
                <TaskKanbanBoard
                  tasks={visibleMyTasks}
                  userRole={userRole}
                  optimisticStatus={optimisticStatus}
                  pendingTaskIds={pendingTaskIds}
                  taskErrors={taskErrors}
                  onStatusChange={handleBoardStatusChange}
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container project-mgmt-content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section project-mgmt-header-row">
              <div>
                <h2 className="overview-title">
                Project Management{currentLevel ? ` — Level ${currentLevel}` : ''}
              </h2>
                <p className="overview-subtitle">Manage your project milestones and tasks.</p>
              </div>

              {/* ROLE BADGE — determined from database, not manually switchable */}
              <div className={`role-badge ${userRole === 'leader' ? 'role-badge-leader' : 'role-badge-member'}`}>
                {userRole === 'leader' ? '👑 Leader' : '👤 Member'}
              </div>
            </div>

            {/* Team avatar row — students, supervisor, and mentor. Shared across
                every sub-tab (Project Timeline, Task Creation, My Tasks) since
                it lives here, outside renderContent(). */}
            {teamAvatars.length > 0 && (
              <div className="team-avatar-row">
                {teamAvatars.map((person) => (
                  <button
                    key={`${person.role}-${person.id}`}
                    type="button"
                    className="team-avatar-item"
                    onClick={() => setViewingProfileId(Number(person.id))}
                    title={`View ${person.name}'s profile`}
                  >
                    <span className={`team-avatar-circle role-${person.role}`}>
                      {getInitials(person.name)}
                    </span>
                    {person.role !== 'member' && (
                      <span className={`team-avatar-tag role-${person.role}`}>
                        {person.role === 'supervisor' ? 'Supervisor' : 'Mentor'}
                      </span>
                    )}
                    <span className="team-avatar-name">{person.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Supervisor feedback — milestones.feedback_reason, surfaced
                consistently across every sub-tab. */}
            {milestoneFeedback.length > 0 && (
              <div className="feedback-section">
                <h4 className="feedback-section-title">📣 Supervisor Feedback</h4>
                {milestoneFeedback.map((item) => (
                  <div key={item.id} className="feedback-card">
                    <div className="feedback-card-header">
                      <span className="feedback-milestone-title">{item.title}</span>
                      <span className={`status-pill ${item.status?.toLowerCase()}`}>{item.status}</span>
                    </div>
                    <p className="feedback-text">{item.feedback_reason}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="student-inner-pages pm-inner-workspace">
              <div className="student-inner-tabs">
                {tabItems.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      className={`student-inner-tab ${activeTab === tab.key ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <TabIcon size={16} className="student-inner-tab-icon" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="student-inner-content">
                <div className="student-inner-panel">{renderContent()}</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {viewingProfileId !== null && (
        <MemberProfileModal memberId={viewingProfileId} onClose={() => setViewingProfileId(null)} showGroup />
      )}
    </div>
  );
};

export default ProjectManagementPage;