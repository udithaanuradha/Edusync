 import React, { useState,useMemo  } from 'react';
 import './ProjectTimeline.css'; 
interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const ProjectTimeline: React.FC = () => {
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
    };

    setTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskEnd('');
  };

  const removeTask = (id: string) => {
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
      const response = await fetch('/api/project-timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: timelineStart,
          endDate: timelineEnd,
          workflowName,
          durationDays,
          tasks,
          submittedTo: ['coordinator', 'supervisor'],
          status: 'submitted'
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setSubmitMessage('Timeline submitted successfully to coordinator and supervisor.');
      setSubmitError(false);
    } catch (error) {
      setSubmitError(true);
      setSubmitMessage('Failed to submit timeline. Please try again.');
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