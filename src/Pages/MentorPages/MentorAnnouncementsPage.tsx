import React, { useEffect, useState, useMemo } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import { Search, RefreshCw, AlertCircle, Bell, User, Tag, Calendar, Layers, Building } from 'lucide-react';
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

interface MetaInfo {
  mentorId: string | number | null;
  assignedLevels: number[];
  assignedDepartments: string[];
  count: number;
}

const MentorAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState('all');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const mentorId = user?.id || '';
      const token = localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (mentorId) headers['x-user-id'] = String(mentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = mentorId
        ? `http://localhost:5000/api/mentor/announcements?mentorId=${encodeURIComponent(mentorId)}`
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getAudienceBadgeClass = (audience: string) => {
    const aud = (audience || '').toLowerCase();
    if (aud.includes('level 2') || aud.includes('level2')) return 'badge-level2';
    if (aud.includes('level 3') || aud.includes('level3')) return 'badge-level3';
    if (aud.includes('level 4') || aud.includes('level4')) return 'badge-level4';
    if (aud.includes('mentor')) return 'badge-mentor';
    return 'badge-general';
  };

  // Filtered list based on search and audience filter
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const text = (item.message || item.content || '').toLowerCase();
      const author = (item.author_name || '').toLowerCase();
      const audience = (item.target_audience || '').toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        title.includes(searchQuery.toLowerCase()) ||
        text.includes(searchQuery.toLowerCase()) ||
        author.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedAudienceFilter === 'all') return true;
      if (selectedAudienceFilter === 'mentor') return audience.includes('mentor');
      if (selectedAudienceFilter === 'level') return audience.includes('level');
      if (selectedAudienceFilter === 'general') return audience === 'all' || audience.includes('system');

      return true;
    });
  }, [announcements, searchQuery, selectedAudienceFilter]);

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
                    <Bell className="header-bell-icon" size={24} />
                  </div>
                  <div>
                    <h2 className="overview-title">Mentor Announcements</h2>
                    <p className="overview-subtitle">
                      Relevant project notices, level updates, and academic notifications for your assigned groups.
                    </p>
                  </div>
                </div>

                {meta && (meta.assignedLevels.length > 0 || meta.assignedDepartments.length > 0) && (
                  <div className="mentor-scope-badge-container">
                    <span className="scope-label">Filtered Scope:</span>
                    {meta.assignedLevels.length > 0 && (
                      <span className="scope-chip level-chip">
                        <Layers size={13} />
                        Level {meta.assignedLevels.join(', ')}
                      </span>
                    )}
                    {meta.assignedDepartments.length > 0 && (
                      <span className="scope-chip dept-chip">
                        <Building size={13} />
                        Dept: {meta.assignedDepartments.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="mentor-refresh-btn"
                onClick={fetchAnnouncements}
                disabled={loading}
                title="Refresh announcements"
              >
                <RefreshCw size={15} className={loading ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filter and search bar */}
            <div className="mentor-announcements-toolbar">
              <div className="mentor-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search announcements by title, content, or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

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
                  Level Updates
                </button>
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'mentor' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('mentor')}
                >
                  Mentors Only
                </button>
                <button
                  type="button"
                  className={`filter-chip ${selectedAudienceFilter === 'general' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('general')}
                >
                  General
                </button>
              </div>
            </div>

            {/* Announcement items list */}
            <div className="mentor-announcements-block">
              {loading && (
                <div className="announcements-status-card">
                  <RefreshCw size={24} className="spinning status-icon" />
                  <p>Loading announcements...</p>
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
                    {searchQuery || selectedAudienceFilter !== 'all'
                      ? 'No announcements match your search or filter criteria.'
                      : 'There are no active announcements for your assigned level and department.'}
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                filteredAnnouncements.map((a) => (
                  <article key={a.id} className="announcement-card">
                    <div className="announcement-card-header">
                      <div className="announcement-card-meta-top">
                        {a.target_audience && (
                          <span className={`announcement-card-badge ${getAudienceBadgeClass(a.target_audience)}`}>
                            <Tag size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            {a.target_audience}
                          </span>
                        )}
                        <span className="announcement-card-date">
                          <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {formatDate(a.created_at)}
                        </span>
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
                ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default MentorAnnouncementsPage;