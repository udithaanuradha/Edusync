 import React, { useMemo, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [userRole, setUserRole] = useState<UserRole>('member'); // Default to member

  const groupMembers = ['Kamal Udara', 'Nadeesha Perera', 'Tharindu Silva'];
  const milestoneOptions = ['Research', 'Planning', 'Development', 'Testing', 'Deployment'];

  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([
    {
      id: 'task-1',
      milestone: 'Research',
      title: 'Draft research plan',
      description: 'Create the initial research plan and milestone breakdown.',
      assignedTo: 'Kamal Udara',
      status: 'Ongoing',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    },
  ]);

  const [milestoneFilter, setMilestoneFilter] = useState('All');
  const [selectedAssignee, setSelectedAssignee] = useState(groupMembers[0]);

  const filteredTasks = useMemo(() => {
    let tasks = projectTasks;
    if (milestoneFilter !== 'All') {
      tasks = tasks.filter((task) => task.milestone === milestoneFilter);
    }
    return tasks;
  }, [projectTasks, milestoneFilter]);

  const visibleMyTasks = useMemo(() => {
    if (userRole === 'leader') {
      return projectTasks.filter((task) => task.assignedTo === selectedAssignee);
    }
    return projectTasks.filter((task) => task.assignedTo === 'Kamal Udara');
  }, [projectTasks, selectedAssignee, userRole]);

  const taskSummary = useMemo(() => {
    const summary = {
      Available: 0,
      Ongoing: 0,
      Finished: 0,
    } as Record<'Available' | 'Ongoing' | 'Finished', number>;
    visibleMyTasks.forEach((task) => {
      summary[task.status] += 1;
    });
    return summary;
  }, [visibleMyTasks]);

  const handleSaveTask = (task: ProjectTask) => {
    setProjectTasks((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === task.id);
      if (existingIndex >= 0) {
        return prev.map((item) => (item.id === task.id ? task : item));
      }
      return [...prev, task];
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setProjectTasks((prev) => prev.filter((task) => task.id !== taskId));
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
            <ProjectTimeline />
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
            {userRole === 'leader' ? (
              <TaskCreation
                tasks={projectTasks}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
                groupMembers={groupMembers}
                milestoneOptions={milestoneOptions}
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
                <span className="status-count">{taskSummary.Available}</span>
                <p>Available tasks</p>
              </div>
              <div className="status-card ongoing-card">
                <span className="status-count">{taskSummary.Ongoing}</span>
                <p>Ongoing tasks</p>
              </div>
              <div className="status-card finished-card">
                <span className="status-count">{taskSummary.Finished}</span>
                <p>Finished tasks</p>
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
                  {groupMembers.map((member) => (
                    <option key={member} value={member}>{member}</option>
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
                      <th>Assigned To</th>
                      <th>Status</th>
                      <th>Dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMyTasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.milestone}</td>
                        <td>{task.title}</td>
                        <td>{task.assignedTo}</td>
                        <td>
                          <span className={`status-pill ${task.status.toLowerCase()}`}>
                            {task.status}
                          </span>
                        </td>
                        <td>{task.startDate} → {task.endDate}</td>
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
                <h2 className="overview-title">Project Management</h2>
                <p className="overview-subtitle">Manage your project milestones and tasks.</p>
              </div>

              {/* NEW ROLE SELECTOR BUTTONS */}
              <div className="role-selector-container">
                <button 
                  className={`role-btn ${userRole === 'leader' ? 'active-leader' : ''}`}
                  onClick={() => setUserRole('leader')}
                >
                  Leader
                </button>
                <button 
                  className={`role-btn ${userRole === 'member' ? 'active-member' : ''}`}
                  onClick={() => setUserRole('member')}
                >
                  Member
                </button>
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