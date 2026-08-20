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
  PlusCircle,
  Trash2,
  Edit3,
  X,
  Send,
  CheckCircle2,
  Megaphone,
  Users
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState('all');

  // Modal / Form state for creating announcements
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [targetAudienceOption, setTargetAudienceOption] = useState<string>('group');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // In-line editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
          if (data.meta.assignedGroups && data.meta.assignedGroups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(String(data.meta.assignedGroups[0].id));
          }
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

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      setFormError('Please enter both a title and a message.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentMentorId) headers['x-user-id'] = String(currentMentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Automatically construct target audience for the mentor's assigned group/level
      let audiencePayload = '';
      let targetGrpId: number | null = null;

      if (meta?.assignedGroups && meta.assignedGroups.length > 0) {
        const grp = meta.assignedGroups[0];
        audiencePayload = `Level ${grp.level} Assigned Students (${grp.groupName})`;
        targetGrpId = grp.id;
      } else if (meta?.assignedLevels && meta.assignedLevels.length > 0) {
        audiencePayload = `Level ${meta.assignedLevels[0]} Assigned Students`;
      } else {
        audiencePayload = 'Assigned Students';
      }

      const response = await fetch('http://localhost:5000/api/mentor/announcements', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim(),
          target_audience: audiencePayload,
          groupId: targetGrpId,
          author_name: currentUser?.name || 'Industry Mentor',
          mentorId: currentMentorId,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.message || 'Failed to post announcement.');
      }

      setSuccessMessage('🎉 Announcement published successfully for your assigned students!');
      setTimeout(() => setSuccessMessage(null), 5000);

      setNewTitle('');
      setNewMessage('');
      setShowCreateModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      setFormError(err.message || 'Network error posting announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (a: Announcement) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditMessage(a.message || a.content || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditMessage('');
  };

  const handleUpdateAnnouncement = async (id: number) => {
    if (!editTitle.trim() || !editMessage.trim()) {
      alert('Title and message cannot be empty');
      return;
    }

    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentMentorId) headers['x-user-id'] = String(currentMentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`http://localhost:5000/api/mentor/announcements/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editTitle.trim(),
          message: editMessage.trim(),
          mentorId: currentMentorId,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to update announcement.');
      }

      setSuccessMessage('Announcement updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setEditingId(null);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to update announcement.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentMentorId) headers['x-user-id'] = String(currentMentorId);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(
        `http://localhost:5000/api/mentor/announcements/${id}?mentorId=${encodeURIComponent(currentMentorId)}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to delete announcement.');
      }

      setSuccessMessage('Announcement removed.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    }
  };

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

  const isAuthorSelf = (a: Announcement) => {
    if (currentMentorId && a.author_id && Number(a.author_id) === Number(currentMentorId)) {
      return true;
    }
    if (currentUser?.name && a.author_name && a.author_name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let mine = 0;
    let level = 0;
    let mentor = 0;
    let general = 0;

    announcements.forEach((item) => {
      const isMine = isAuthorSelf(item);
      const aud = (item.target_audience || '').toLowerCase();

      if (isMine) {
        mine++;
      } else {
        if (aud.includes('level')) level++;
        if (aud.includes('mentor')) mentor++;
        if (aud === 'all' || aud.includes('system')) general++;
      }
    });

    return { mine, level, mentor, general };
  }, [announcements, currentMentorId, currentUser]);

  // Filtered list based on audience filter
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const isMine = isAuthorSelf(item);
      const audience = (item.target_audience || '').toLowerCase();

      // When "Posted by Me" is selected, ONLY show announcements authored by this mentor
      if (selectedAudienceFilter === 'mine') {
        return isMine;
      }

      // When "Level", "Mentors Only", or "General" is selected, EXCLUDE own announcements
      if (selectedAudienceFilter === 'level') {
        return !isMine && audience.includes('level');
      }
      if (selectedAudienceFilter === 'mentor') {
        return !isMine && audience.includes('mentor');
      }
      if (selectedAudienceFilter === 'general') {
        return !isMine && (audience === 'all' || audience.includes('system'));
      }

      // 'all' shows all announcements
      return true;
    });
  }, [announcements, selectedAudienceFilter, currentMentorId, currentUser]);

  return (
    <div className="app-layout mentor-shell">
      <MentorSidebarWrapper />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <section className="mentor-announcements-page">
            {/* Success notification banner */}
            {successMessage && (
              <div className="mentor-success-toast">
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            )}

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
                      Targeted project notices, level guidelines, and announcements for your assigned student groups.
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

              <div className="header-actions-row">
                <button
                  type="button"
                  className="mentor-create-announcement-btn"
                  onClick={() => {
                    setFormError(null);
                    setShowCreateModal(true);
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Post Announcement</span>
                </button>
              </div>
            </div>

            {/* Create Announcement Modal */}
            {showCreateModal && (
              <div className="mentor-modal-overlay">
                <div className="mentor-modal-card">
                  <div className="mentor-modal-header">
                    <div className="modal-title-group">
                      <Megaphone size={20} className="text-blue-600" />
                      <h3>New Announcement for Students</h3>
                    </div>
                    <button
                      className="modal-close-btn"
                      onClick={() => setShowCreateModal(false)}
                      type="button"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateAnnouncement} className="mentor-announcement-form">
                    {formError && (
                      <div className="form-error-banner">
                        <AlertCircle size={16} />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="ann-title">Announcement Title *</label>
                      <input
                        id="ann-title"
                        type="text"
                        placeholder="e.g., Progress Review Meeting & Deliverables Feedback"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Target Audience</label>
                      <div className="form-auto-target-box">
                        <Users size={16} className="auto-target-icon" />
                        <span className="auto-target-text">
                          {meta?.assignedGroups && meta.assignedGroups.length > 0
                            ? `👥 ${meta.assignedGroups[0].groupName} (Level ${meta.assignedGroups[0].level} Assigned Students)`
                            : meta?.assignedLevels && meta.assignedLevels.length > 0
                            ? `Level ${meta.assignedLevels[0]} Assigned Students`
                            : 'Assigned Project Group Students'}
                        </span>
                      </div>
                      <span className="form-helper-text">
                        This notice will automatically be delivered to the student dashboard and announcement widget of your assigned project group.
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="ann-message">Message / Content *</label>
                      <textarea
                        id="ann-message"
                        rows={5}
                        placeholder="Write your announcement details, instructions, or meeting reminders for students..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        required
                      />
                    </div>

                    <div className="modal-actions-footer">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setShowCreateModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-publish"
                        disabled={isSubmitting}
                      >
                        <Send size={15} />
                        <span>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
                  className={`filter-chip ${selectedAudienceFilter === 'mine' ? 'active' : ''}`}
                  onClick={() => setSelectedAudienceFilter('mine')}
                >
                  Posted by Me ({tabCounts.mine})
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
                  const isMine = isAuthorSelf(a);
                  const isBeingEdited = editingId === a.id;

                  return (
                    <article
                      key={a.id}
                      className={`announcement-card ${isMine ? 'is-my-announcement' : ''}`}
                    >
                      {isBeingEdited ? (
                        <div className="announcement-inline-edit-form">
                          <div className="edit-form-header">
                            <Edit3 size={16} />
                            <span>Edit Announcement</span>
                          </div>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                            className="edit-title-input"
                          />
                          <textarea
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            placeholder="Message content"
                            className="edit-message-textarea"
                            rows={4}
                          />
                          <div className="edit-actions-row">
                            <button
                              type="button"
                              className="btn-cancel-edit"
                              onClick={cancelEditing}
                              disabled={isUpdating}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn-save-edit"
                              onClick={() => handleUpdateAnnouncement(a.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                                {isMine && (
                                  <span className="announcement-self-badge">
                                    Author: You
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

                                {isMine && (
                                  <div className="author-card-buttons">
                                    <button
                                      type="button"
                                      className="card-action-btn edit"
                                      onClick={() => startEditing(a)}
                                      title="Edit announcement"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="card-action-btn delete"
                                      onClick={() => handleDeleteAnnouncement(a.id)}
                                      title="Delete announcement"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
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
                                Posted by:{' '}
                                <strong>
                                  {isMine ? 'You (Industry Mentor)' : a.author_name || 'Coordinator / System'}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </>
                      )}
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