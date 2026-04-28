import React, { useState } from 'react';

const TaskCreation: React.FC = () => {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle task creation logic here
    console.log('Creating task:', { taskName, description });
  };

  return (
    <div className="task-creation">
      <form onSubmit={handleSubmit}>
        <div>
          <label>Task Name:</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Enter task name"
            required
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description"
          />
        </div>
        <button type="submit">Create Task</button>
      </form>
    </div>
  );
};

export default TaskCreation;