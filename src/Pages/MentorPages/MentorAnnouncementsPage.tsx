import React, { useEffect, useState, useMemo } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import {
  RefreshCw,
  AlertCircle,
  Bell,
  User,
  Tag,
  Calendar,
  Layers,
  Building,
  CheckCircle2,
  Megaphone,
  Users,
} from 'lucide-react';
import './MentorAnnouncementsPage.css';

interface Announcement {
  id: number;
  title: string;
  message?: string;
  content?: string;
  target_audience: string;
  author_name?: string;
  author_id?: number | null;
  author_role?: string;
  author_academic_unit?: string;
  author_level?: number;
  created_at: string;
}

interface AssignedGroup {
  id: number;
  groupName: string;
  level: number;
}

interface MetaInfo {
  mentorId: string | number | null;
  assignedLevels: number[];
  assignedDepartments: string[];
  assignedGroups: AssignedGroup[];
  count: number;
}

const MentorAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState('all');

  const savedUser = localStorage.getItem('user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const currentMentorId = currentUser?.id || '';

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentMentorId) headers['x-user-id'] = String(currentMentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = currentMentorId
        ? `http://localhost:5000/api/mentor/announcements?mentorId=${encodeURIComponent(currentMentorId)}`
        : `http://localhost:5000/api/mentor/announcements`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const list = Array.isArray(data.announcements)
          ? data.announcements
          : Array.isArray(data.data)
          ? data.data
          : [];
        setAnnouncements(list);
        if (data.meta) {
          setMeta(data.meta);
        }
      } else {
        setError(data.message || data.error || 'Failed to load announcements.');
      }
    } catch (err) {
      console.error('Fetch mentor announcements error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getAudienceBadgeClass = (audience?: string) => {
    if (!audience) return 'badge-default';
    const lower = audience.toLowerCase();
    if (lower.includes('mentor')) return 'badge-mentors';
    if (lower.includes('level')) return 'badge-level';
    if (lower.includes('system') || lower === 'all') return 'badge-system';
    return 'badge-general';
  };

  // Dynamic counts for tabs
  const tabCounts = useMemo(() => {
    let level = 0;
    let mentor = 0;
    let general = 0;

    announcements.forEach((item) => {
      const aud = (item.target_audience || '').toLowerCase();
      if (aud.includes('level')) level++;
      if (aud.includes('mentor')) mentor++;
      if (aud === 'all' || aud.includes('system')) general++;
    });

    return { level, mentor, general };
  }, [announcements]);

  // Filtered list based on audience filter
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const audience = (item.target_audience || '').toLowerCase();

      if (selectedAudienceFilter === 'level') {
        return audience.includes('level');
      }
      if (selectedAudienceFilter === 'mentor') {
        return audience.includes('mentor');
      }
      if (selectedAudienceFilter === 'general') {
        return audience === 'all' || audience.includes('system');
      }

      // 'all' shows all announcements
      return true;
    });
  }, [announcements, selectedAudienceFilter]);

  return (
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <section className="mentor-announcements-page">
            {/* Header section */}
            <div className="mentor-announcements-header-card">
              <div className="header-info-wrapper">
                <div className="header-title-row">
                  <div className="header-icon-box">
                    <Megaphone className="header-bell-icon" size={24} />
                  </div>
                  <div>
                    <h2 className="overview-title">Mentor Announcements</h2>
                    <p className="overview-subtitle">
                      Targeted notices, academic guidelines, and project announcements for your assigned level.
                    </p>
                  </div>
                </div>

                {meta && (meta.assignedLevels.length > 0 || (meta.assignedGroups && meta.assignedGroups.length > 0)) && (
                  <div className="mentor-scope-badge-container">
                    <span className="scope-label">Assigned Scope:</span>
                    {meta.assignedLevels.length > 0 && (
                      <span className="scope-chip level-chip">
                        <Layers size={13} />
                        Level {meta.assignedLevels.join(', ')}
                      </span>
                    )}
                    {meta.assignedGroups && meta.assignedGroups.map((g) => (
                      <span key={g.id} className="scope-chip group-chip">
                        <Users size={13} />
                        {g.groupName}
                      </span>
                    ))}
                    {meta.assignedDepartments.length > 0 && (
                      <span className="scope-chip dept-chip">
                        <Building size={13} />
                        Dept: {meta.assignedDepartments.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="mentor-announcements-toolbar">
              <div className="mentor-filter-chips">
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('all')}
                >
                  All ({announcements.length})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'level' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('level')}
                >
                  Level ({tabCounts.level})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'mentor' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('mentor')}
                >
                  Mentors Only ({tabCounts.mentor})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'general' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('general')}
                >
                  General ({tabCounts.general})
                </button>
              </div>
            </div>

            {/* Announcement items list */}
            <div className="mentor-announcements-block">
              {loading && (
                <div className="announcements-status-card">
                  <RefreshCw size={24} className="spinning status-icon" />
                  <p>Loading announcements for your assigned level...</p>
                </div>
              )}

              {error && (
                <div className="announcements-status-card error-card">
                  <AlertCircle size={24} className="status-icon" />
                  <p className="announcements-error">{error}</p>
                  <button type="button" className="retry-btn" onClick={fetchAnnouncements}>
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && filteredAnnouncements.length === 0 && (
                <div className="announcements-status-card empty-card">
                  <Bell size={32} className="empty-icon" />
                  <h3>No Announcements Found</h3>
                  <p>
                    {selectedAudienceFilter !== 'all'
                      ? 'No announcements match the selected filter category.'
                      : 'There are no active announcements matching your assigned level and mentor scope.'}
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                filteredAnnouncements.map((a) => {
                  return (
                    <article key={a.id} className="announcement-card">
                      <div className="announcement-card-header">
                        <div className="announcement-card-meta-top">
                          <div className="meta-left-badges">
                            {a.target_audience && (
                              <span
                                className={`announcement-card-badge ${getAudienceBadgeClass(
                                  a.target_audience
                                )}`}
                              >
                                <Tag
                                  size={11}
                                  style={{ marginRight: '4px', verticalAlign: 'middle' }}
                                />
                                {a.target_audience}
                              </span>
                            )}
                          </div>

                          <div className="meta-right-actions">
                            <span className="announcement-card-date">
                              <Calendar
                                size={12}
                                style={{ marginRight: '4px', verticalAlign: 'middle' }}
                              />
                              {formatDate(a.created_at)}
                            </span>
                          </div>
                        </div>
                        <h3 className="announcement-card-title">{a.title}</h3>
                      </div>

                      <p className="announcement-card-content">{a.message || a.content}</p>

                      <div className="announcement-card-footer">
                        <div className="announcement-author-info">
                          <div className="author-avatar">
                            <User size={12} />
                          </div>
                          <span className="author-name">
                            Posted by: <strong>{a.author_name || 'Coordinator / System'}</strong>
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default MentorAnnouncementsPage;