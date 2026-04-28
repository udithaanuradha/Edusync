import React, { useMemo, useState } from 'react';
import './TaskCreation.css';

export type TaskStatus = 'Available' | 'Ongoing' | 'Finished';

export type ProjectTask = {
  id: string;
  milestone: string;
  title: string;
  description: string;
  assignedTo: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
};

type TaskCreationProps = {
  tasks: ProjectTask[];
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (taskId: string) => void;
  groupMembers: string[];
  milestoneOptions: string[];
};

const TaskCreation: React.FC<TaskCreationProps> = ({
  tasks,
  onSaveTask,
  onDeleteTask,
  groupMembers,
  milestoneOptions,
}) => {
  const [taskForm, setTaskForm] = useState({
    milestone: milestoneOptions[0],
    title: '',
    description: '',
    assignedTo: groupMembers[0],
    status: 'Available' as TaskStatus,
    startDate: '',
    endDate: '',
  });
  const [taskError, setTaskError] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const recentTasks = useMemo(() => [...tasks].reverse(), [tasks]);

  const resetForm = () => {
    setTaskForm({
      milestone: milestoneOptions[0],
      title: '',
      description: '',
      assignedTo: groupMembers[0],
      status: 'Available',
      startDate: '',
      endDate: '',
    });
    setTaskError('');
    setEditingTaskId(null);
  };

  const handleFormChange = (field: keyof typeof taskForm, value: string) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTaskError('');

    if (!taskForm.title || !taskForm.description || !taskForm.startDate || !taskForm.endDate) {
      setTaskError('Please complete all fields before saving the task.');
      return;
    }

    if (new Date(taskForm.startDate) > new Date(taskForm.endDate)) {
      setTaskError('Start date cannot be later than end date.');
      return;
    }

    const nextTask: ProjectTask = {
      id: editingTaskId ?? Math.random().toString(36).substring(2, 9),
      ...taskForm,
    };

    onSaveTask(nextTask);
    resetForm();
  };

  const handleEdit = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setTaskForm({
      milestone: task.milestone,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      status: task.status,
      startDate: task.startDate,
      endDate: task.endDate,
    });
  };

  return (
    <div className="task-creation-wrapper">
      <div className="task-creation-card">
        <div className="task-creation-header">
          <div>
            <h4>{editingTaskId ? 'Edit Task' : 'Create Task for Student'}</h4>
            <p>Assign milestones, pick a student, and track the status of each work item.</p>
          </div>
          <span className="task-count">{tasks.length} created</span>
        </div>

        <form className="task-creation-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="milestone-select">Milestone</label>
            <select
              id="milestone-select"
              value={taskForm.milestone}
              onChange={(e) => handleFormChange('milestone', e.target.value)}
            >
              {milestoneOptions.map((milestone) => (
                <option key={milestone} value={milestone}>
                  {milestone}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="task-title">Task Title</label>
            <input
              id="task-title"
              type="text"
              value={taskForm.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              placeholder="e.g. Create draft report"
            />
          </div>

          <div className="form-row">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={taskForm.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Describe the work clearly"
            />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="assign-to-select">Assign To</label>
              <select
                id="assign-to-select"
                value={taskForm.assignedTo}
                onChange={(e) => handleFormChange('assignedTo', e.target.value)}
              >
                {groupMembers.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="status-select">Status</label>
              <select
                id="status-select"
                value={taskForm.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
              >
                <option value="Available">Available</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Finished">Finished</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="task-start-date">Start Date</label>
              <input
                id="task-start-date"
                type="date"
                value={taskForm.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="task-end-date">End Date</label>
              <input
                id="task-end-date"
                type="date"
                value={taskForm.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {taskError && <p className="task-error-message">{taskError}</p>}

          <div className="task-creation-actions">
            <button type="submit" className="primary-btn">
              {editingTaskId ? 'Update Task' : 'Add Task'}
            </button>
            {editingTaskId && (
              <button type="button" className="secondary-btn" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="task-creation-list-card">
        <div className="task-creation-list-header">
          <div>
            <h4>Task Preview</h4>
            <p>All tasks assigned for the selected milestones and students.</p>
          </div>
          <span className="task-count">{tasks.length}</span>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state-card">
            <p>No tasks created yet. Use the form above to add a new task.</p>
          </div>
        ) : (
          <div className="task-table-wrapper">
            <table className="task-creation-table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Task</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.milestone}</td>
                    <td>{task.title}</td>
                    <td>{task.assignedTo}</td>
                    <td>
                      <span className={`status-pill ${task.status.toLowerCase()}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.startDate} ? {task.endDate}</td>
                    <td className="task-action-cell">
                      <button type="button" className="secondary-btn" onClick={() => handleEdit(task)}>
                        Edit
                      </button>
                      <button type="button" className="danger-btn" onClick={() => onDeleteTask(task.id)}>
                        Delete
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
  );
};

export default TaskCreation;
