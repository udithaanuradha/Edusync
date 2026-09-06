import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { ShieldCheck, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './StudentAnnouncementsPage.css';

interface AnnouncementItem {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
  author_id: number | null;
  author_role?: string | null;
  author_designation?: string | null;
  created_at: string;
}

interface SupervisorTab {
  supervisorId: number;
  supervisorName: string;
}

const API_BASE = 'http://localhost:5000/api';

const norm = (value?: string | null) => (value || '').trim().toLowerCase();

const isAdminAuthor = (item: AnnouncementItem) => norm(item.author_role) === 'admin';

const isCoordinatorAuthor = (item: AnnouncementItem) => {
  const role = norm(item.author_role);
  const designation = norm(item.author_designation);
  return role === 'coordinator' || (role === 'lecturer' && designation === 'coordinator');
};

const isSupervisorAuthor = (item: AnnouncementItem) => {
  const role = norm(item.author_role);
  const designation = norm(item.author_designation);
  return role === 'supervisor' || (role === 'lecturer' && (designation === 'supervisor' || !designation));
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
};

const StudentAnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const userAny = user as any;

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [supervisorTabs, setSupervisorTabs] = useState<SupervisorTab[]>([]);
  const [activeSupervisorId, setActiveSupervisorId] = useState<number | null>(null);

  // Row 1 / Row 2 data source: the existing "Rule of Relevance" endpoint,
  // unchanged — just now carrying author_role/author_designation too.
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        setError('');
        const levelParam = userAny?.level ? `&level=${encodeURIComponent(String(userAny.level))}` : '';
        const res = await fetch(`${API_BASE}/announcements?role=student${levelParam}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.announcements) ? data.announcements : [];
        setAnnouncements(list);
      } catch (err) {
        console.error('[StudentAnnouncementsPage] Failed to load announcements', err);
        setError('Could not load announcements. Please refresh and try again.');
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, [userAny?.level]);

  // Row 3 tabs: this student's own approved supervisor(s), resolved the same
  // way GroupRequest.tsx already does (read-only — no change to that page).
  useEffect(() => {
    const loadAssignedSupervisors = async () => {
      if (!userAny?.id) return;
      try {
        // includeCreated=true: this student's request may already have been
        // converted into a real, live group by now (the normal steady state
        // once group formation is finished) — the default response would
        // hide it entirely, so this flag keeps it visible just for reading
        // which supervisor(s) were approved. See getStudentRequestStatus.
        const res = await fetch(`${API_BASE}/groups/my-requests/${userAny.id}?includeCreated=true`);
        if (!res.ok) return;
        const data = await res.json();
        const requests = Array.isArray(data) ? data : [data];
        const latest = requests.find(
          (r: any) => Number(r.project_level || r.level) === Number(userAny.level)
        );
        const responses = Array.isArray(latest?.supervisor_responses) ? latest.supervisor_responses : [];
        const approved: SupervisorTab[] = responses
          .filter((r: any) => r.status === 'approved')
          .map((r: any) => ({
            supervisorId: Number(r.supervisor_id),
            supervisorName: r.supervisor_name || `Supervisor ${r.supervisor_id}`,
          }));

        setSupervisorTabs(approved);
        setActiveSupervisorId((current) => current ?? (approved.length > 0 ? approved[0].supervisorId : null));
      } catch (err) {
        console.error('[StudentAnnouncementsPage] Failed to load assigned supervisors', err);
      }
    };

    loadAssignedSupervisors();
  }, [userAny?.id, userAny?.level]);

  const adminAnnouncements = useMemo(() => announcements.filter(isAdminAuthor), [announcements]);

  const coordinatorAnnouncements = useMemo(
    () => announcements.filter(isCoordinatorAuthor),
    [announcements]
  );

  const activeSupervisorAnnouncements = useMemo(() => {
    if (!activeSupervisorId) return [];
    return announcements.filter(
      (item) => isSupervisorAuthor(item) && Number(item.author_id) === activeSupervisorId
    );
  }, [announcements, activeSupervisorId]);

  const renderList = (items: AnnouncementItem[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="student-ann-empty">{emptyText}</p>;
    }

    return (
      <ul className="student-ann-list">
        {items.map((item) => (
          <li key={item.id} className="student-ann-item">
            <div className="student-ann-item-top">
              <h4 className="student-ann-item-title">{item.title}</h4>
              <span className="student-ann-item-date">{formatTime(item.created_at)}</span>
            </div>
            <p className="student-ann-item-message">{item.message}</p>
            <div className="student-ann-item-footer">
              <span className="student-ann-item-author">By {item.author_name}</span>
              <span className="student-ann-item-audience">{item.target_audience}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header pageTitle="Announcements" />
        <main className="content-container">
          <div className="student-ann-page">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Announcements</h2>
              <p className="overview-subtitle">
                Everything published by the admin, your coordinator, and your assigned supervisors — all in one place.
              </p>
            </div>

            {loading && <p className="student-ann-loading">Loading announcements...</p>}
            {!loading && error && <p className="student-ann-error">{error}</p>}

            {!loading && !error && (
              <div className="student-ann-rows">
                {/* ROW 1 — Admin */}
                <section className="student-ann-row">
                  <div className="student-ann-row-header">
                    <ShieldCheck size={18} className="student-ann-row-icon admin" />
                    <h3>Admin Announcements</h3>
                  </div>
                  {renderList(adminAnnouncements, 'No announcements from the admin yet.')}
                </section>

                {/* ROW 2 — Coordinator, scoped to this student's level via the
                    existing role/level query */}
                <section className="student-ann-row">
                  <div className="student-ann-row-header">
                    <GraduationCap size={18} className="student-ann-row-icon coordinator" />
                    <h3>Coordinator Announcements{userAny?.level ? ` — Level ${userAny.level}` : ''}</h3>
                  </div>
                  {renderList(coordinatorAnnouncements, 'No announcements from your coordinator yet.')}
                </section>

                {/* ROW 3 — Assigned supervisors, one tab per approved supervisor */}
                <section className="student-ann-row">
                  <div className="student-ann-row-header">
                    <Users size={18} className="student-ann-row-icon supervisor" />
                    <h3>Your Supervisors' Announcements</h3>
                  </div>

                  {supervisorTabs.length === 0 ? (
                    <p className="student-ann-empty">
                      You don't have an approved supervisor yet, so there's nothing to show here.
                    </p>
                  ) : (
                    <>
                      <div className="student-ann-tabs">
                        {supervisorTabs.map((tab) => (
                          <button
                            key={tab.supervisorId}
                            type="button"
                            className={`student-ann-tab ${activeSupervisorId === tab.supervisorId ? 'active' : ''}`}
                            onClick={() => setActiveSupervisorId(tab.supervisorId)}
                          >
                            {tab.supervisorName}
                          </button>
                        ))}
                      </div>
                      {renderList(activeSupervisorAnnouncements, 'No announcements from this supervisor yet.')}
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentAnnouncementsPage;
