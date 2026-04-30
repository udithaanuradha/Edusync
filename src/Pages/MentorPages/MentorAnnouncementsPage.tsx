import React, { useEffect, useState } from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import './MentorAnnouncementsPage.css';

/**
 * MentorAnnouncementsPage
 *
 * FIX: Instead of using <AnnouncementWidget useRoleQuery={true}> which calls
 * /api/announcements?role=Mentor (the generic endpoint that does NOT filter
 * Level 1 announcements), this page now fetches directly from
 * /api/mentor/announcements — the dedicated endpoint in mentorController.js
 * that explicitly excludes Level 1-targeted announcements.
 */

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

const MentorAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ FIX: Call the mentor-specific endpoint, NOT /api/announcements?role=Mentor
    fetch('/api/mentor/announcements')
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setAnnouncements(data.announcements);
        } else {
          setError('Failed to load announcements.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <section className="mentor-announcements-page">
            <div className="dashboard-header-section">
              <h2 className="overview-title">Mentor Announcements</h2>
              <p className="overview-subtitle">
                Stay updated with system-wide notifications and announcements
                specifically for Industry Mentors.
              </p>
            </div>

            <div className="mentor-announcements-block">
              {loading && (
                <p className="announcements-status">Loading announcements…</p>
              )}

              {error && (
                <p className="announcements-status announcements-error">
                  {error}
                </p>
              )}

              {!loading && !error && announcements.length === 0 && (
                <p className="announcements-status">
                  No announcements available.
                </p>
              )}

              {!loading &&
                !error &&
                announcements.slice(0, 10).map((a) => (
                  <div key={a.id} className="announcement-card">
                    <div className="announcement-card-header">
                      <h3 className="announcement-card-title">{a.title}</h3>
                      <span className="announcement-card-date">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    <p className="announcement-card-content">{a.content}</p>
                    {a.target_audience && (
                      <span className="announcement-card-badge">
                        {a.target_audience}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default MentorAnnouncementsPage;