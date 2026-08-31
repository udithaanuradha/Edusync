 import React, { useState, useMemo, useEffect } from 'react';
import './ProjectTimeline.css';
import GanttChart from './GanttChart';
interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isSaved?: boolean;
}

interface ProjectTimelineProps {
  groupIdProp?: number | null;
  onMilestonesSubmitted?: () => void;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ groupIdProp, onMilestonesSubmitted }) => {
  const [timelineStart, setTimelineStart] = useState('');
  const [timelineEnd, setTimelineEnd] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState(false);

  // New task form state
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');
  const [taskError, setTaskError] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    const loadMilestones = async () => {
      // Reset state first to prevent carryover between different project groups (levels)
      setTimelineStart('');
      setTimelineEnd('');
      setWorkflowName('');
      setTasks([]);
      setSubmitMessage('');
      setTaskError('');
      
      // Also reset new task inputs
      setNewTaskName('');
      setNewTaskStart('');
      setNewTaskEnd('');

      try {
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user.id) return;

        let gId = groupIdProp;
        
        if (!gId) {
          const groupRes = await fetch(`http://localhost:5000/api/groups/my-status/${user.id}`, {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-User-Id': user.id,
              'X-User-Role': user.role,
            }
          });
          const groupData = await groupRes.json();
          if (!groupData || groupData.length === 0) return;
          // Use the same logic as ProjectManagementPage if possible
          const activeGroup = groupData.find((g: any) => Number(g.level) === Number(user.level)) || groupData[0];
          gId = activeGroup.groupId;
        }
        
        if (gId) setGroupId(gId);
        else return;

        const mileRes = await fetch(`http://localhost:5000/api/milestones/group/${gId}`, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-User-Id': user.id,
            'X-User-Role': user.role,
          }
        });
        const mileData = await mileRes.json();
        
        if (mileData.success && mileData.data) {
          const loadedTasks: Task[] = mileData.data.map((m: any) => ({
            id: m.id.toString(),
            name: m.title,
            startDate: m.start_date ? m.start_date.split('T')[0] : '',
            endDate: m.due_date ? m.due_date.split('T')[0] : '',
            isSaved: true
          }));
          setTasks(loadedTasks);
        }

        // Fetch Overview
        const overviewRes = await fetch(`http://localhost:5000/api/milestones/overview/group/${gId}`, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-User-Id': user.id,
            'X-User-Role': user.role,
          }
        });
        const overviewData = await overviewRes.json();
        if (overviewData.success && overviewData.data) {
          if (overviewData.data.start_date) setTimelineStart(overviewData.data.start_date.split('T')[0]);
          if (overviewData.data.end_date) setTimelineEnd(overviewData.data.end_date.split('T')[0]);
          if (overviewData.data.workflow_name) setWorkflowName(overviewData.data.workflow_name);
        }
      } catch (err) {
        console.error("Error loading milestones:", err);
      }
    };
    
    loadMilestones();
  }, [groupIdProp]);

  const durationDays = useMemo(() => {
    if (!timelineStart || !timelineEnd) return 0;
    const start = new Date(timelineStart);
    const end = new Date(timelineEnd);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
  }, [timelineStart, timelineEnd]);

  const addTask = () => {
    setTaskError('');
    if (!newTaskName || !newTaskStart || !newTaskEnd) {
      setTaskError('Please fill in all task fields.');
      return;
    }

    if (!timelineStart || !timelineEnd) {
      setTaskError('Please set project dates first.');
      return;
    }

    const tStart = new Date(newTaskStart);
    const tEnd = new Date(newTaskEnd);
    const pStart = new Date(timelineStart);
    const pEnd = new Date(timelineEnd);

    if (tStart < pStart || tEnd > pEnd) {
      setTaskError('Task dates must be within the project timeline.');
      return;
    }

    if (tStart > tEnd) {
      setTaskError('Task start date cannot be after end date.');
      return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTaskName,
      startDate: newTaskStart,
      endDate: newTaskEnd,
      isSaved: false
    };

    setTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskEnd('');
  };

  const removeTask = async (id: string) => {
    const taskToRemove = tasks.find(t => t.id === id);
    if (taskToRemove?.isSaved) {
      try {
        await fetch(`http://localhost:5000/api/milestones/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } catch (err) {
        console.error("Failed to delete milestone from database", err);
      }
    }
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError(false);

    if (!timelineStart || !timelineEnd || !workflowName) {
      setSubmitError(true);
      setSubmitMessage('Fill all project fields before submitting.');
      return;
    }

    if (tasks.length === 0) {
      setSubmitError(true);
      setSubmitMessage('Add at least one task to the timeline.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userString = localStorage.getItem("user");
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user.id) {
        throw new Error('User not found. Please log in.');
      }

      if (!groupId) {
        throw new Error('Group ID not found. Please ensure you belong to a project group.');
      }
      const token = localStorage.getItem('token');

      // 1. Save Project Overview
      await fetch('http://localhost:5000/api/milestones/overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'X-User-Id': user.id,
          'X-User-Role': user.role,
        },
        body: JSON.stringify({
          group_id: groupId,
          start_date: timelineStart,
          end_date: timelineEnd,
          workflow_name: workflowName
        }),
      });

      // 2. Save New Milestones
      const newTasks = tasks.filter(t => !t.isSaved);
      
      if (newTasks.length === 0 && tasks.length > 0) {
        setSubmitMessage('Timeline is already up to date.');
        setIsSubmitting(false);
        return;
      }

      for (const task of newTasks) {
        const payload = {
          group_id: groupId,
          title: task.name,
          description: `Part of workflow: ${workflowName}`,
          start_date: task.startDate,
          due_date: task.endDate
        };

        const response = await fetch('http://localhost:5000/api/milestones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            'X-User-Id': user.id,
            'X-User-Role': user.role,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to submit milestone: ${task.name}`);
        }
      }

      setSubmitMessage('Timeline submitted successfully to coordinator and supervisor.');
      setSubmitError(false);
      
      // Mark all tasks as saved so they don't submit again
      setTasks(prev => prev.map(t => ({ ...t, isSaved: true })));
      
      // Notify parent to refresh milestones if callback provided
      if (onMilestonesSubmitted) {
        onMilestonesSubmitted();
      }
    } catch (error: any) {
      setSubmitError(true);
      setSubmitMessage(error.message || 'Failed to submit timeline. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTaskDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
  };

  return (
    <div className="student-inner-tab-panel">
      <form className="timeline-form" onSubmit={handleSubmit}>
        <div className="timeline-section">
          <h4 className="section-title">Project Overview</h4>
          <div className="timeline-form-grid">
            <div className="timeline-form-group">
              <label htmlFor="timeline-start">Project Start Date</label>
              <input
                id="timeline-start"
                type="date"
                className="timeline-form-input"
                value={timelineStart}
                onChange={(e) => setTimelineStart(e.target.value)}
                required
              />
            </div>

            <div className="timeline-form-group">
              <label htmlFor="timeline-end">Project End Date</label>
              <input
                id="timeline-end"
                type="date"
                className="timeline-form-input"
                value={timelineEnd}
                onChange={(e) => setTimelineEnd(e.target.value)}
                required
              />
            </div>

            <div className="timeline-form-group timeline-form-full">
              <label htmlFor="workflow-name">Project / Workflow Name</label>
              <input
                id="workflow-name"
                type="text"
                className="timeline-form-input"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g. Final Year Research Project"
                required
              />
            </div>
          </div>

          <div className="timeline-summary">
            <span>Total Project Duration:</span>
            <strong>{durationDays} {durationDays === 1 ? 'day' : 'days'}</strong>
          </div>
        </div>

        <div className="timeline-section">
          <h4 className="section-title">Milestones & Duration</h4>
          <div className="task-entry-form">
            <div className="task-input-row">
              <div className="timeline-form-group">
                <label htmlFor="task-name-input">Milestone Name</label>
                <input
                  id="task-name-input"
                  type="text"
                  className="timeline-form-input"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Milestone name"
                />
              </div>
              <div className="timeline-form-group">
                <label htmlFor="task-start-input">Start Date</label>
                <input
                  id="task-start-input"
                  type="date"
                  className="timeline-form-input"
                  value={newTaskStart}
                  onChange={(e) => setNewTaskStart(e.target.value)}
                />
              </div>
              <div className="timeline-form-group">
                <label htmlFor="task-end-input">End Date</label>
                <input
                  id="task-end-input"
                  type="date"
                  className="timeline-form-input"
                  value={newTaskEnd}
                  onChange={(e) => setNewTaskEnd(e.target.value)}
                />    
              </div>
              <button type="button" className="add-task-btn" onClick={addTask}>
                Add Task
              </button>
            </div>
            {taskError && <p className="task-error-msg">{taskError}</p>}
          </div>

          <div className="tasks-display-list">
            {tasks.length === 0 ? (
              <p className="no-tasks-text">No milestones added yet. Breakdown your project into specific milestones.</p>
            ) : (
              <div className="tasks-table-wrapper">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.name}</td>
                        <td>{task.startDate}</td>
                        <td>{task.endDate}</td>
                        <td>{calculateTaskDuration(task.startDate, task.endDate)} days</td>
                        <td>
                          <button
                            type="button"
                            className="remove-task-btn"
                            onClick={() => removeTask(task.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <GanttChart tasks={tasks} timelineStart={timelineStart} timelineEnd={timelineEnd} />

        {submitMessage && (
          <div className={`timeline-submit-message ${submitError ? 'error' : 'success'}`}>
            {submitMessage}
          </div>
        )}

        <div className="timeline-form-footer">
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Timeline'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectTimeline;