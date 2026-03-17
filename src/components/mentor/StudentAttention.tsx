// src/components/mentor/StudentAttention.tsx
import React from 'react';
import { TriangleAlert, AlertCircle, Clock } from 'lucide-react';
import './StudentAttention.css';

// ── Inline mock data (replace with API call when backend is ready) ─────────
const projects = [
  {
    id: 'p1',
    title: 'Smart Campus Navigation',
    group: 'Group A',
    members: [
      { name: 'Alice Fernando' },
      { name: 'Bob Silva' },
      { name: 'Chamodi Perera' },
    ],
    tasks: [
      { assignedTo: 'Alice Fernando', status: 'Completed',   progress: 100 },
      { assignedTo: 'Bob Silva',      status: 'In Progress', progress: 40  },
      { assignedTo: 'Chamodi Perera', status: 'Not Started', progress: 0   },
    ],
  },
  {
    id: 'p2',
    title: 'Attendance via Face Recognition',
    group: 'Group C',
    members: [
      { name: 'Nimal Rajapaksa' },
      { name: 'Saman Kumara' },
    ],
    tasks: [
      { assignedTo: 'Nimal Rajapaksa', status: 'Completed',   progress: 100 },
      { assignedTo: 'Saman Kumara',    status: 'Delayed',     progress: 10  },
      { assignedTo: 'Nimal Rajapaksa', status: 'Not Started', progress: 0   },
    ],
  },
  {
    id: 'p3',
    title: 'Library Management System',
    group: 'Group B',
    members: [
      { name: 'Dilini Silva' },
      { name: 'Kasun Perera' },
      { name: 'Tharushi Fernando' },
    ],
    tasks: [
      { assignedTo: 'Kasun Perera',      status: 'Completed',   progress: 100 },
      { assignedTo: 'Tharushi Fernando', status: 'In Progress', progress: 90  },
      { assignedTo: 'Dilini Silva',      status: 'In Progress', progress: 70  },
    ],
  },
];
// ──────────────────────────────────────────────────────────────────────────

interface StudentItem {
  name: string;
  group: string;
  project: string;
  delayedCount: number;
  lowProgressCount: number;
  completedTasks: number;
  totalTasks: number;
}

const StudentAttention: React.FC = () => {
  const students: StudentItem[] = [];

  projects.forEach(project => {
    project.members.forEach(member => {
      const memberTasks  = project.tasks.filter(t => t.assignedTo === member.name);
      const delayedTasks = memberTasks.filter(t => t.status === 'Delayed');
      const lowProgress  = memberTasks.filter(t => t.status !== 'Completed' && t.progress < 30);

      if (delayedTasks.length > 0 || lowProgress.length > 0) {
        students.push({
          name: member.name,
          group: project.group,
          project: project.title,
          delayedCount: delayedTasks.length,
          lowProgressCount: lowProgress.length,
          completedTasks: memberTasks.filter(t => t.status === 'Completed').length,
          totalTasks: memberTasks.length,
        });
      }
    });
  });

  if (students.length === 0) return null;

  return (
    <div className="attention-card">
      <div className="attention-header">
        <TriangleAlert size={20} className="attention-icon" />
        <div>
          <h2 className="section-title">Students Needing Attention</h2>
          <p className="attention-subtitle">
            Students with delayed tasks or low progress — act early.
          </p>
        </div>
      </div>

      <div className="attention-grid">
        {students.map((s, i) => {
          const initials    = s.name.split(' ').map(n => n[0]).join('');
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
    </div>
  );
};

export default StudentAttention;