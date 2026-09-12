// src/components/mentor/StudentAttention.tsx
import React, { useState, useEffect } from 'react';
import { TriangleAlert, AlertCircle, Clock } from 'lucide-react';
import './StudentAttention.css';

interface StudentItem {
  name: string;
  group: string;
  project: string;
  delayedCount: number;
  lowProgressCount: number;
  completedTasks: number;
  totalTasks: number;
}

const SkeletonCard: React.FC = () => (
  <div className="student-item student-item-skeleton">
    <div className="skeleton-avatar" />
    <div className="student-info">
      <div className="skeleton-line skeleton-name" />
      <div className="skeleton-line skeleton-project" />
      <div className="skeleton-line skeleton-flag" />
      <div className="skeleton-line skeleton-bar" />
    </div>
  </div>
);

const StudentAttention: React.FC = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id || '';
        const url = mentorId 
          ? `http://localhost:5000/api/mentor/students-attention?mentorId=${mentorId}`
          : 'http://localhost:5000/api/mentor/students-attention';
        const response = await fetch(url, {
          headers: mentorId ? { 'x-user-id': String(mentorId) } : {}
        });
        const data = await response.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch students needing attention:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <div className="attention-card">
      <div className="attention-header">
        <TriangleAlert size={20} className="attention-icon" />
        <div>
          <h2 className="section-title">Students Needing Attention</h2>
          <p className="attention-subtitle">
            {loading
              ? 'Loading student data...'
              : students.length === 0
              ? 'No students require attention at the moment.'
              : 'Students with delayed tasks or low progress — act early.'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="attention-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && students.length > 0 && (
        <div className="attention-grid">
          {students.map((s, i) => {
            const initials = (s.name || 'S').split(' ').map(n => n[0]).join('');
            const progressPct = s.totalTasks > 0 ? (s.completedTasks / s.totalTasks) * 100 : 0;

            return (
              <div key={i} className="student-item">
                <div className="student-avatar">{initials}</div>
                <div className="student-info">
                  <div className="student-name-row">
                    <span className="student-name">{s.name}</span>
                    <span className="student-group-badge">{s.group}</span>
                  </div>
                  <p className="student-project">{s.project}</p>
                  <div className="student-flags">
                    {s.delayedCount > 0 && (
                      <span className="flag flag-delayed">
                        <AlertCircle size={11} />
                        {s.delayedCount} delayed task{s.delayedCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {s.lowProgressCount > 0 && (
                      <span className="flag flag-low">
                        <Clock size={11} />
                        {s.lowProgressCount} low progress
                      </span>
                    )}
                  </div>
                  <div className="student-tasks">
                    <span className="tasks-label">{s.completedTasks}/{s.totalTasks} tasks done</span>
                    <div className="mini-track">
                      <div className="mini-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAttention;
