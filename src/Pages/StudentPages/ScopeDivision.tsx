import React, { useEffect, useState } from 'react';
import { MessageCircle, GraduationCap, Users as UsersIcon, Pencil, Trash2 } from 'lucide-react';
import './ScopeDivision.css';

export type ScopeSection = {
  id: number | string;
  groupId: number | string;
  title: string;
  description: string;
  /** Who created (and exclusively owns) this section — still called
      claimedBy/claimed_by at the data layer, but there's no separate
      "claim" step any more: creating a section sets this immediately. */
  claimedBy: number | string | null;
  claimedByName: string | null;
};

type CurrentUser = { id: number | string; name: string } | null;
type Person = { id: number | string; name: string } | null;

type ScopeDivisionProps = {
  /** Scope Division is project-wide — one set of sections per group,
      independent of whichever milestone is currently selected above it on
      Project Overview (see ProjectOverview.tsx). */
  groupId: number | null;
  currentUser: CurrentUser;
  supervisor: Person;
  mentor: Person;
  onNavigateSupervisorChat: () => void;
  onNavigateMentorChat: () => void;
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

/**
 * Any group member creates their own scope section directly — no leader
 * pre-defines a list for others to claim any more. Creating a section is
 * the only step: it's owned by whoever created it from that moment,
 * capped at one section per student. Editing/deleting is owner-only, with
 * no leader override — the group's leader has no special power here
 * beyond creating and managing their own section like everyone else.
 */
const ScopeDivision: React.FC<ScopeDivisionProps> = ({
  groupId,
  currentUser,
  supervisor,
  mentor,
  onNavigateSupervisorChat,
  onNavigateMentorChat,
}) => {
  const [sections, setSections] = useState<ScopeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addError, setAddError] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Which section is currently being edited inline (at most one at a time).
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadSections = async () => {
    if (!groupId) {
      setSections([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/group/${groupId}/scope`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const mapped: ScopeSection[] = (data.data || []).map((s: any) => ({
          id: s.id,
          groupId: s.group_id,
          title: s.title,
          description: s.description || '',
          claimedBy: s.claimed_by,
          claimedByName: s.claimed_by_name,
        }));
        setSections(mapped);
      } else {
        setError(data.error || 'Failed to load scope sections.');
      }
    } catch (e) {
      setError('Server connection error while loading scope sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleAddSection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupId) return;
    if (!newTitle.trim()) {
      setAddError('Please enter a section title.');
      return;
    }
    setAddBusy(true);
    setAddError('');
    try {
      const res = await fetch(`${API_BASE}/group/${groupId}/scope`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewDescription('');
        setShowAddForm(false);
        await loadSections();
      } else {
        setAddError(data.error || 'Failed to add section.');
      }
    } catch (e) {
      setAddError('Server connection error while adding this section.');
    } finally {
      setAddBusy(false);
    }
  };

  const startEdit = (section: ScopeSection) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditDescription(section.description);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleEditSection = async (event: React.FormEvent, sectionId: number | string) => {
    event.preventDefault();
    if (!editTitle.trim()) {
      setEditError('Please enter a section title.');
      return;
    }
    setEditBusy(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE}/scope/${sectionId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await loadSections();
      } else {
        setEditError(data.error || 'Failed to update section.');
      }
    } catch (e) {
      setEditError('Server connection error while updating this section.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteSection = async (sectionId: number | string) => {
    setDeletingId(sectionId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/scope/${sectionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to delete this section.');
      }
      await loadSections();
    } catch (e) {
      setError('Server connection error while deleting this section.');
    } finally {
      setDeletingId(null);
    }
  };

  // A student can only ever own ONE section for the whole project — used
  // below to hide/disable "+ Add scope section" once they already have
  // one, instead of only catching it after the fact via the backend's 409.
  const mySection = currentUser
    ? sections.find((s) => String(s.claimedBy) === String(currentUser.id))
    : undefined;

  return (
    <div className="timeline-section scope-division-card">
      <h4 className="section-title">Scope Division</h4>
      <p className="scope-division-desc">
        Create your own section describing the part of this project you&apos;re responsible for — every
        member sees everyone else&apos;s section too. You can create one section for the whole project,
        and only you can edit or delete it.
      </p>

      {error && <p className="scope-division-error">{error}</p>}

      {loading ? (
        <p className="scope-division-loading">Loading scope sections…</p>
      ) : sections.length === 0 ? (
        <div className="no-tasks-text">No scope sections defined for this project yet.</div>
      ) : (
        <div className="scope-section-list">
          {sections.map((section) => {
            const isMine = Boolean(currentUser) && String(section.claimedBy) === String(currentUser?.id);
            // Left over from before every section always got an owner at
            // creation — nobody can be "the owner" of one of these, so
            // anyone may clear it out (matches the backend's same
            // allowance in deleteScopeSection) rather than it being stuck
            // forever under the owner-only rule.
            const isOrphaned = section.claimedBy == null;
            const isEditing = editingId === section.id;

            if (isEditing) {
              return (
                <form
                  key={section.id}
                  className="scope-edit-form"
                  onSubmit={(e) => handleEditSection(e, section.id)}
                >
                  <input
                    type="text"
                    placeholder="Section title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    placeholder="Short description (optional)"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  {editError && <p className="scope-division-error">{editError}</p>}
                  <div className="scope-add-form-actions">
                    <button type="submit" className="add-task-btn" disabled={editBusy}>
                      {editBusy ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" className="secondary-btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={section.id} className={`scope-section-row is-claimed ${isMine ? 'is-mine' : ''}`}>
                <span className={`scope-section-checkbox checked ${isMine ? 'mine' : ''}`}>✓</span>
                <div className="scope-section-body">
                  <p className="scope-section-title">{section.title}</p>
                  {section.description && <p className="scope-section-desc">{section.description}</p>}
                  <p className={`scope-section-claimed-by ${isMine ? 'is-mine' : ''}`}>
                    {isMine
                      ? `Created by you — ${currentUser?.name}`
                      : isOrphaned
                      ? 'No owner on record — safe to remove'
                      : `Created by ${section.claimedByName}`}
                  </p>
                </div>
                <span className={`scope-section-locked-chip ${isMine ? 'is-mine' : ''}`}>
                  {isMine ? 'Yours' : isOrphaned ? 'Unowned' : 'Owned'}
                </span>
                {(isMine || isOrphaned) && (
                  <div className="scope-section-owner-actions">
                    {isMine && (
                      <button
                        type="button"
                        className="scope-section-icon-btn"
                        onClick={() => startEdit(section)}
                        title="Edit this section"
                        aria-label="Edit this section"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="scope-section-icon-btn danger"
                      onClick={() => handleDeleteSection(section.id)}
                      disabled={deletingId === section.id}
                      title="Delete this section"
                      aria-label="Delete this section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mySection ? (
        !showAddForm && editingId !== mySection.id && (
          <p className="scope-division-note">
            You&apos;ve already created &quot;{mySection.title}&quot; — edit it above to make changes.
          </p>
        )
      ) : showAddForm ? (
        <form className="scope-add-form" onSubmit={handleAddSection}>
          <input
            type="text"
            placeholder="Section title (e.g. Backend reporting API)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Short description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          {addError && <p className="scope-division-error">{addError}</p>}
          <div className="scope-add-form-actions">
            <button type="submit" className="add-task-btn" disabled={addBusy}>
              {addBusy ? 'Adding…' : 'Add Section'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="scope-add-section-btn" onClick={() => setShowAddForm(true)}>
          + Add your scope section
        </button>
      )}

      {(supervisor || mentor) && (
        <div className="scope-division-people-row">
          {supervisor && (
            <div className="scope-person-card">
              <span className="scope-person-icon"><GraduationCap size={16} /></span>
              <div className="scope-person-text">
                <span className="scope-person-role">Supervisor</span>
                <strong className="scope-person-name">{supervisor.name}</strong>
              </div>
              <button
                type="button"
                className="scope-person-chat-btn"
                onClick={onNavigateSupervisorChat}
                title={`Message ${supervisor.name}`}
              >
                <MessageCircle size={16} />
              </button>
            </div>
          )}
          {mentor && (
            <div className="scope-person-card">
              <span className="scope-person-icon"><UsersIcon size={16} /></span>
              <div className="scope-person-text">
                <span className="scope-person-role">Mentor</span>
                <strong className="scope-person-name">{mentor.name}</strong>
              </div>
              <button
                type="button"
                className="scope-person-chat-btn"
                onClick={onNavigateMentorChat}
                title={`Message ${mentor.name}`}
              >
                <MessageCircle size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScopeDivision;
