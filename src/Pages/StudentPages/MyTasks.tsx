import React, { useState, useEffect } from 'react';

interface Task {
  id: number;
  name: string;
  status: string;
}

const MyTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Fetch tasks from API or state
    // For now, mock data
    setTasks([
      { id: 1, name: 'Task 1', status: 'Pending' },
      { id: 2, name: 'Task 2', status: 'Completed' },
    ]);
  }, []);

  return (
    <div className="my-tasks">
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.name} - {task.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyTasks;