import React, { useMemo, useState } from 'react';
import './TaskCreation.css';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export type ProjectTask = {
  id: string;
  milestoneId: number | string;
  milestone: string;
  title: string;
  description: string;
  assignedToId: number | string;
  assignedTo: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
};

type TaskCreationProps = {
  tasks: ProjectTask[];
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (taskId: string) => void;
  groupMembers: { id: number | string; name: string }[];
  milestoneOptions: { id: number | string; title: string }[];
};

const TaskCreation: React.FC<TaskCreationProps> = ({
  tasks,
  onSaveTask,
  onDeleteTask,
  groupMembers,
  milestoneOptions,
}) => {
  const [taskForm, setTaskForm] = useState({
    milestoneId: milestoneOptions[0]?.id || '',
    title: '',
    description: '',
    assignedToId: groupMembers[0]?.id || '',
    status: 'TODO' as TaskStatus,
    startDate: '',
    endDate: '',
  });
  const [taskError, setTaskError] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  React.useEffect(() => {
    console.log("🔄 [TaskCreation] Props Updated:", { milestoneOptionsCount: milestoneOptions.length, groupMembersCount: groupMembers.length });
    
    if (milestoneOptions.length > 0) {
      // If no milestone is selected OR the current selection is invalid, pick the first one
      const currentValid = milestoneOptions.some(m => String(m.id) === String(taskForm.milestoneId));
      if (!taskForm.milestoneId || !currentValid) {
        console.log("🎯 [TaskCreation] Setting initial milestone:", milestoneOptions[0].title);
        setTaskForm(prev => ({ ...prev, milestoneId: milestoneOptions[0].id }));
      }
    } else {
      if (taskForm.milestoneId !== '') {
        setTaskForm(prev => ({ ...prev, milestoneId: '' }));
      }
    }

    if (groupMembers.length > 0) {
      const currentValid = groupMembers.some(m => String(m.id) === String(taskForm.assignedToId));
      if (!taskForm.assignedToId || !currentValid) {
        setTaskForm(prev => ({ ...prev, assignedToId: groupMembers[0].id }));
      }
    }
  }, [milestoneOptions, groupMembers]);

  const recentTasks = useMemo(() => [...tasks].reverse(), [tasks]);

  const resetForm = () => {
    setTaskForm({
      milestoneId: milestoneOptions[0]?.id || '',
      title: '',
      description: '',
      assignedToId: groupMembers[0]?.id || '',
      status: 'TODO',
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

    if (!taskForm.title || !taskForm.description || !taskForm.startDate || !taskForm.endDate || !taskForm.milestoneId) {
      setTaskError('Please complete all fields, including the milestone, before saving the task.');
      return;
    }

    if (new Date(taskForm.startDate) > new Date(taskForm.endDate)) {
      setTaskError('Start date cannot be later than end date.');
      return;
    }

    const selectedMilestone = milestoneOptions.find(m => String(m.id) === String(taskForm.milestoneId));
    const selectedMember = groupMembers.find(m => String(m.id) === String(taskForm.assignedToId));

    const nextTask: ProjectTask = {
      id: editingTaskId ?? Math.random().toString(36).substring(2, 9),
      ...taskForm,
      milestoneId: taskForm.milestoneId,
      milestone: selectedMilestone ? selectedMilestone.title : '',
      assignedToId: taskForm.assignedToId,
      assignedTo: selectedMember ? selectedMember.name : '',
      status: taskForm.status as TaskStatus,
    };

    onSaveTask(nextTask);
    resetForm();
  };

  const handleEdit = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setTaskForm({
      milestoneId: task.milestoneId,
      title: task.title,
      description: task.description,
      assignedToId: task.assignedToId,
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
          <span className="task-count">{tasks.length} created | {groupMembers.length} members</span>
        </div>

        <form className="task-creation-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="milestone-select">Milestone</label>
            <select
              id="milestone-select"
              value={taskForm.milestoneId}
              onChange={(e) => handleFormChange('milestoneId', e.target.value)}
            >
              {milestoneOptions.length === 0 ? (
                <option value="">No milestones found</option>
              ) : (
                milestoneOptions.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))
              )}
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
                value={taskForm.assignedToId}
                onChange={(e) => handleFormChange('assignedToId', e.target.value)}
              >
                {groupMembers.length === 0 ? (
                  <option value="">No members found</option>
                ) : (
                  groupMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="status-select">Status</label>
              <select
                id="status-select"
                value={taskForm.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
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
                  <th>Description</th>
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
                    <td className="task-title-cell">{task.title}</td>
                    <td className="task-desc-cell">{task.description}</td>
                    <td>{task.assignedTo}</td>
                    <td>
                      <span className={`status-pill ${task.status.toLowerCase()}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.startDate} → {task.endDate}</td>
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
