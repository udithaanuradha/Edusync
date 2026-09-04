import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Tag,
  Users,
  Clock
} from 'lucide-react';
import './MentorDelayedTasksTab.css';

interface DelayedTask {
  task_id: number;
  task_name: string;
  description?: string;
  milestone_title?: string;
  status: string;
  due_date: string;
  created_at?: string;
  assigned_to_name?: string;
  university_id?: string;
  group_name: string;
  level: number;
  days_overdue?: number;
}

interface MentorDelayedTasksTabProps {
  levelNumber: number;
}

export const MentorDelayedTasksTab: React.FC<MentorDelayedTasksTabProps> = ({ levelNumber }) => {
  const [tasks, setTasks] = useState<DelayedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const mentorId = user?.id || '';
  const token = localStorage.getItem('token');

  const fetchDelaysData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (mentorId) headers['x-user-id'] = String(mentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = `http://localhost:5000/api/mentor/project-delays?mentorId=${encodeURIComponent(mentorId)}&level=${levelNumber}`;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const rawTasks: any[] = Array.isArray(data.data) ? data.data : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const processed: DelayedTask[] = rawTasks.map((t) => {
          let daysOver = t.days_overdue;
          if (daysOver === undefined && t.due_date) {
            const due = new Date(t.due_date);
            due.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - due.getTime();
            daysOver = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
          return {
            ...t,
            days_overdue: daysOver || 1,
          };
        });

        setTasks(processed);
      } else {
        setError(data.message || data.error || 'Failed to load delayed tasks.');
      }
    } catch (err: any) {
      console.error('Fetch delayed tasks error:', err);
      setError(err.message || 'An error occurred while loading delayed tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelaysData();
  }, [levelNumber]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mentor-delays-tab-container">
      {/* Header Card */}
      <div className="mentor-delays-header-card">
        <div className="mentor-delays-header-icon">
          <AlertTriangle size={20} />
        </div>
        <div className="mentor-delays-title-group">
          <h3 className="mentor-delays-title">Level {levelNumber} Delayed Tasks</h3>
          <p className="mentor-delays-subtitle">
            Overdue tasks that missed their scheduled completion due date for your assigned groups.
          </p>
        </div>
        <div className={`mentor-delays-count-badge ${tasks.length === 0 ? 'ontrack' : ''}`}>
          {tasks.length === 0 ? 'All on Track' : `${tasks.length} Overdue`}
        </div>
      </div>

      {/* Loading / Error States */}
      {loading ? (
        <div className="mentor-delays-status-box">
          <div className="mentor-delays-spinner"></div>
          <span>Loading overdue tasks for Level {levelNumber}...</span>
        </div>
      ) : error ? (
        <div className="mentor-delays-status-box mentor-delays-error-box">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button type="button" className="btn-delays-retry" onClick={fetchDelaysData}>
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        /* Empty state when no tasks are overdue */
        <div className="mentor-delays-status-box mentor-delays-ontrack-box">
          <CheckCircle2 size={36} color="#16a34a" />
          <h3>All Tasks On Track</h3>
          <p>There are no overdue tasks for your assigned project groups in Level {levelNumber}.</p>
        </div>
      ) : (
        /* Table of Overdue Tasks */
        <div className="mentor-delays-table-card">
          <table className="mentor-delays-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Group</th>
                <th>Assigned Student</th>
                <th>Due Date</th>
                <th>Delay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const studentName = t.assigned_to_name || 'Unassigned';
                const initials = studentName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={t.task_id}>
                    {/* Task Name & Milestone */}
                    <td>
                      <div className="mentor-task-title-cell">
                        <span className="mentor-task-name-text">{t.task_name}</span>
                        {t.milestone_title && (
                          <span className="mentor-task-milestone-sub">
                            <Tag size={11} />
                            <span>Milestone: {t.milestone_title}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Group */}
                    <td>
                      <span className="mentor-group-tag">
                        <Users size={12} />
                        {t.group_name}
                      </span>
                    </td>

                    {/* Assigned Student */}
                    <td>
                      <div className="mentor-student-cell">
                        <div className="mentor-student-avatar">{initials || '?'}</div>
                        <div className="mentor-student-info">
                          <span className="mentor-student-name">{studentName}</span>
                          {t.university_id && (
                            <span className="mentor-student-id">{t.university_id}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td>
                      <div className="mentor-due-date-cell">
                        <Calendar size={13} color="#94a3b8" />
                        <span>{formatDate(t.due_date)}</span>
                      </div>
                    </td>

                    {/* Delay */}
                    <td>
                      <span className="mentor-delay-badge">
                        <Clock size={11} />
                        {t.days_overdue}d overdue
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className="mentor-status-pill">
                        {String(t.status || 'TODO').replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MentorDelayedTasksTab;
