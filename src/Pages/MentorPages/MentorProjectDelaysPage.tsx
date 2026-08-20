import React, { useState, useEffect } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Tag,
} from 'lucide-react';
import './MentorProjectDelaysPage.css';

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

const MentorProjectDelaysPage: React.FC = () => {
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

      const url = mentorId
        ? `http://localhost:5000/api/mentor/project-delays?mentorId=${encodeURIComponent(mentorId)}`
        : `http://localhost:5000/api/mentor/project-delays`;

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
        setError(data.message || data.error || 'Failed to load project delays');
      }
    } catch (err: any) {
      console.error('Fetch project delays error:', err);
      setError(err.message || 'An error occurred while loading project delays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelaysData();
  }, []);

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
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container simple-delays-container">
          {/* Header */}
          <div className="simple-delays-header">
            <div className="simple-header-icon">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="simple-page-title">Project Delays</h2>
              <p className="simple-page-subtitle">
                Overdue tasks that missed their scheduled completion due date.
              </p>
            </div>
            <div className="simple-count-badge">
              <span>{tasks.length} Overdue</span>
            </div>
          </div>

          {/* Loading / Error States */}
          {loading ? (
            <div className="simple-status-box">
              <div className="simple-spinner"></div>
              <span>Loading overdue tasks...</span>
            </div>
          ) : error ? (
            <div className="simple-status-box simple-error-box">
              <AlertCircle size={24} className="text-red-500" />
              <p>{error}</p>
              <button type="button" className="btn-simple-retry" onClick={fetchDelaysData}>
                Retry
              </button>
            </div>
          ) : tasks.length === 0 ? (
            /* Empty state when no tasks are overdue */
            <div className="simple-status-box simple-ontrack-box">
              <CheckCircle2 size={36} className="text-green-600" />
              <h3>All Tasks On Track</h3>
              <p>There are no overdue tasks for your assigned project groups.</p>
            </div>
          ) : (
            /* Simple Table / List of Overdue Tasks */
            <div className="simple-table-card">
              <table className="simple-delays-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Assigned Student</th>
                    <th>Due Date</th>
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
                          <div className="task-title-cell">
                            <span className="task-name-text">{t.task_name}</span>
                            {t.milestone_title && (
                              <span className="task-milestone-sub">
                                <Tag size={11} className="milestone-icon" />
                                <span>Milestone: {t.milestone_title}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Student */}
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-circle">{initials || '?'}</div>
                            <div className="student-info-col">
                              <span className="student-name-text">{studentName}</span>
                              {t.university_id && (
                                <span className="student-id-text">{t.university_id}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td>
                          <div className="due-date-cell">
                            <Calendar size={13} className="text-gray-400" />
                            <span>{formatDate(t.due_date)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className="status-pill">
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
        </main>
      </div>
    </div>
  );
};

export default MentorProjectDelaysPage;
