import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, LayoutGrid, ListChecks } from 'lucide-react';
import StatCard from '../../components/shared/ui/StatCard';
import type { ProjectTask } from './projectTaskTypes';
import './MyProgress.css';

type CurrentUser = { id: number | string; name: string } | null;

type ClaimedScopeSection = { milestoneId: string; milestoneTitle: string; title: string };

type MyProgressProps = {
  /** The logged-in student's OWN tasks only — this whole tab is a personal
      contribution summary, not a team-wide view (that's covered by the
      Group Contributions tab). */
  tasks: ProjectTask[];
  milestoneOptions: { id: number | string; title: string }[];
  currentUser: CurrentUser;
};

const API_BASE = 'http://localhost:5000/api/milestones';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(user?.id ? { 'X-User-Id': String(user.id) } : {}),
    ...(user?.role ? { 'X-User-Role': String(user.role) } : {}),
  };
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Read-only personal rollup — no actions live here. Complements My Tasks
 * (which groups by milestone with drag-and-drop boards) with a single-page
 * view of the student's own contribution: overall completion, which scope
 * sections they've claimed, per-milestone progress, and a timeline of what
 * they've actually finished.
 */
const MyProgress: React.FC<MyProgressProps> = ({ tasks, milestoneOptions, currentUser }) => {
  const [claimedSections, setClaimedSections] = useState<ClaimedScopeSection[]>([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeError, setScopeError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadClaims = async () => {
      if (!currentUser || milestoneOptions.length === 0) {
        setClaimedSections([]);
        return;
      }
      setLoadingScope(true);
      setScopeError('');
      try {
        const results = await Promise.all(
          milestoneOptions.map(async (m) => {
            try {
              const res = await fetch(`${API_BASE}/${m.id}/scope`, { headers: authHeaders() });
              const data = await res.json();
              if (!data.success) return [];
              return (data.data || [])
                .filter((s: any) => String(s.claimed_by) === String(currentUser.id))
                .map((s: any) => ({
                  milestoneId: String(m.id),
                  milestoneTitle: m.title,
                  title: s.title,
                }));
            } catch {
              return [];
            }
          }),
        );
        if (!cancelled) setClaimedSections(results.flat());
      } catch (e) {
        if (!cancelled) setScopeError('Could not load claimed scope sections.');
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    };

    loadClaims();
    return () => {
      cancelled = true;
    };
  }, [milestoneOptions, currentUser]);

  const overall = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const milestonesTouched = new Set(
      [...tasks.map((t) => String(t.milestoneId)), ...claimedSections.map((s) => s.milestoneId)],
    ).size;
    return { total, completed, percent, milestonesTouched };
  }, [tasks, claimedSections]);

  const byMilestone = useMemo(() => {
    const ownByMilestoneId = new Map<string, ProjectTask[]>();
    tasks.forEach((t) => {
      const key = String(t.milestoneId);
      if (!ownByMilestoneId.has(key)) ownByMilestoneId.set(key, []);
      ownByMilestoneId.get(key)!.push(t);
    });

    return milestoneOptions
      .map((m) => {
        const key = String(m.id);
        const own = ownByMilestoneId.get(key) || [];
        const completed = own.filter((t) => t.status === 'COMPLETED').length;
        const percent = own.length > 0 ? Math.round((completed / own.length) * 100) : 0;
        const claimed = claimedSections.filter((s) => s.milestoneId === key);
        return { id: key, title: m.title, total: own.length, completed, percent, claimed };
      })
      .filter((m) => m.total > 0 || m.claimed.length > 0);
  }, [tasks, milestoneOptions, claimedSections]);

  const completedTimeline = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'COMPLETED')
        .slice()
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        }),
    [tasks],
  );

  return (
    <div className="mp-wrapper">
      <div className="mp-stat-strip">
        <StatCard title="Overall Completion" value={`${overall.percent}%`} icon={<Award size={18} />} tone="primary" />
        <StatCard
          title="Tasks Completed"
          value={`${overall.completed}/${overall.total}`}
          icon={<CheckCircle2 size={18} />}
          tone="success"
        />
        <StatCard
          title="Scope Sections Claimed"
          value={claimedSections.length}
          icon={<LayoutGrid size={18} />}
          tone="warning"
        />
        <StatCard
          title="Milestones Contributed To"
          value={overall.milestonesTouched}
          icon={<ListChecks size={18} />}
          tone="neutral"
        />
      </div>

      <div className="mp-section">
        <h4 className="mp-section-title">Progress by Milestone</h4>
        {scopeError && <p className="mp-error">{scopeError}</p>}
        {loadingScope && byMilestone.length === 0 ? (
          <p className="mp-empty">Loading…</p>
        ) : byMilestone.length === 0 ? (
          <p className="mp-empty">No personal tasks or claimed scope sections yet.</p>
        ) : (
          <div className="mp-milestone-list">
            {byMilestone.map((m) => (
              <div key={m.id} className="mp-milestone-row">
                <div className="mp-milestone-row-head">
                  <span className="mp-milestone-name">{m.title}</span>
                  <span className="mp-milestone-percent">{m.percent}%</span>
                </div>
                <div
                  className="mp-progress-track"
                  role="progressbar"
                  aria-valuenow={m.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="mp-progress-fill" style={{ width: `${m.percent}%` }} />
                </div>
                <div className="mp-milestone-meta">
                  <span>{m.completed}/{m.total} of your tasks completed</span>
                  {m.claimed.length > 0 && (
                    <span className="mp-claimed-tags">
                      {m.claimed.map((c) => (
                        <span key={c.title} className="mp-claimed-tag">✓ {c.title}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mp-section">
        <h4 className="mp-section-title">Completed Tasks Timeline</h4>
        {completedTimeline.length === 0 ? (
          <p className="mp-empty">Nothing completed yet — completed tasks will appear here as you finish them.</p>
        ) : (
          <div className="mp-timeline">
            {completedTimeline.map((t) => (
              <div key={t.id} className="mp-timeline-row">
                <span className="mp-timeline-dot" aria-hidden="true" />
                <div className="mp-timeline-body">
                  <p className="mp-timeline-title">{t.title}</p>
                  <p className="mp-timeline-meta">
                    {t.milestone}
                    {t.completedAt ? ` — completed ${formatDate(t.completedAt)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProgress;
