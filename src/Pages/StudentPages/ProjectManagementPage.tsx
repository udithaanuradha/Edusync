import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import ProjectTimeline from './ProjectTimeline';
import TaskCreation, { ProjectTask } from './TaskCreation';
import './ProjectManagementPage.css'; 

type TabKey = 'timeline' | 'createTasks' | 'myTasks';
type UserRole = 'leader' | 'member';

const tabItems = [
  { key: 'timeline', label: 'Project Timeline' },
  { key: 'createTasks', label: 'Task Creation' },
  { key: 'myTasks', label: 'My Tasks' },
] as const;

const ProjectManagementPage: React.FC = () => {
  const location = useLocation();
  // Read level and groupId passed from StudentLevelInnerPages navigation
  const navState = (location.state as { level?: number; groupId?: number | string } | null) || {};

  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  const [groupMembers, setGroupMembers] = useState<{id: number | string, name: string}[] | null>(null);
  const [milestoneOptions, setMilestoneOptions] = useState<{id: number | string, title: string}[] | null>(null);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [milestoneFilter, setMilestoneFilter] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState<string | number>('');

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
      } else {
        console.warn(`⚠️ [Frontend] No milestones found for Group ${gId}`);
        setMilestoneOptions([]);
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
      setMilestoneOptions(null);
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
            const me = membersData.data.find((m: any) => String(m.id) === String(user.id));

            setUserRole(me && me.is_leader ? 'leader' : 'member');
            if (membersData.data.length > 0) {
              setSelectedAssignee(membersData.data[0].id);
            }
          } else {
            setGroupMembers([]);
          }
        } catch (e) {
          console.error("Failed to load members", e);
          setGroupMembers([]);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Project Timeline ({userRole === 'leader' ? 'Leader View' : 'Member View'})</h3>
              <p>View the timeline of your project stages and milestones.</p>
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
      case 'createTasks':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Task Creation</h3>
              {userRole === 'leader' ? (
                <p>Create, assign, and track tasks for each student in your project group.</p>
              ) : (
                <p className="role-warning">Only Leaders can create tasks. You are currently viewing as a Member.</p>
              )}
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
      case 'myTasks':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>My Tasks</h3>
              <p>Track assigned work and quickly review available, ongoing, and completed items.</p>
            </div>
            <div className="my-tasks-summary">
              <div className="status-card available-card">
                <span className="status-count">{taskSummary.TODO}</span>
                <p>To Do tasks</p>
              </div>
              <div className="status-card ongoing-card">
                <span className="status-count">{taskSummary.IN_PROGRESS}</span>
                <p>In Progress tasks</p>
              </div>
              <div className="status-card finished-card">
                <span className="status-count">{taskSummary.COMPLETED}</span>
                <p>Completed tasks</p>
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
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Task</th>
                      <th>Description</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMyTasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.milestone}</td>
                        <td className="task-title-cell">{task.title}</td>
                        <td className="task-desc-cell">{task.description}</td>
                        <td>{task.assignedTo}</td>
                        <td>
                          <span className={`status-pill ${task.status.toLowerCase()}`}>
                            {task.status === 'TODO' ? 'Pending' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                          </span>
                        </td>
                        <td className="task-action-btns">
                          {task.status === 'TODO' && (
                            <button
                              className="task-start-btn"
                              onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                            >
                              ▶ Start
                            </button>
                          )}
                          {task.status === 'IN_PROGRESS' && (
                            <button
                              className="task-end-btn"
                              onClick={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}
                            >
                              ✓ Done
                            </button>
                          )}
                          {task.status === 'COMPLETED' && (
                            <span className="task-done-badge">✓ Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
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

            <div className="student-inner-pages">
              <div className="student-inner-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab.key}
                    className={`student-inner-tab ${activeTab === tab.key ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="student-inner-content">
                <div className="student-inner-panel">{renderContent()}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectManagementPage;