import React, { useEffect, useState } from 'react';
import { MessageCircle, GraduationCap, Users as UsersIcon, Pencil, Trash2 } from 'lucide-react';
import './ScopeDivision.css';

export type ScopeSection = {
  id: number | string;
  milestoneId: number | string;
  title: string;
  description: string;
  claimedBy: number | string | null;
  claimedByName: string | null;
};

type CurrentUser = { id: number | string; name: string } | null;
type Person = { id: number | string; name: string } | null;

type ScopeDivisionProps = {
  milestoneId: number | string | null;
  userRole: 'leader' | 'member';
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

const ScopeDivision: React.FC<ScopeDivisionProps> = ({
  milestoneId,
  userRole,
  currentUser,
  supervisor,
  mentor,
  onNavigateSupervisorChat,
  onNavigateMentorChat,
}) => {
  const [sections, setSections] = useState<ScopeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState<string | number | null>(null);
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
    if (!milestoneId) {
      setSections([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${milestoneId}/scope`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const mapped: ScopeSection[] = (data.data || []).map((s: any) => ({
          id: s.id,
          milestoneId: s.milestone_id,
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
  }, [milestoneId]);

  const handleClaim = async (sectionId: number | string) => {
    if (!currentUser) return;
    setClaimingId(sectionId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/scope/${sectionId}/claim`, {
        method: 'PUT',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Could not claim this section — someone may have just taken it.');
      }
      // Reload either way: on success it shows the fresh lock; on conflict it
      // shows who actually won the claim instead of a stale "still open" row.
      await loadSections();
    } catch (e) {
      setError('Server connection error while claiming this section.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleAddSection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!milestoneId) return;
    if (!newTitle.trim()) {
      setAddError('Please enter a section title.');
      return;
    }
    setAddBusy(true);
    setAddError('');
    try {
      const res = await fetch(`${API_BASE}/${milestoneId}/scope`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          milestone_id: milestoneId,
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

  if (!milestoneId) {
    return (
      <div className="timeline-section scope-division-card">
        <h4 className="section-title">Scope Division</h4>
        <p className="no-tasks-text">
          Select or create a milestone above to define and claim its scope sections.
        </p>
      </div>
    );
  }

  // A student can only ever have ONE claimed section per milestone — used
  // below to proactively disable claiming a second one, instead of only
  // catching it after the fact via the backend's 409 response.
  const myClaimedSection = currentUser
    ? sections.find((s) => String(s.claimedBy) === String(currentUser.id))
    : undefined;

  return (
    <div className="timeline-section scope-division-card">
      <h4 className="section-title">Scope Division</h4>
      <p className="scope-division-desc">
        Your supervisor and mentor have broken this milestone into scope sections below. Tick a
        section to claim it — once a section is ticked, it locks to that student and disappears
        as an option for everyone else. You can only claim one section per milestone.
      </p>

      <div className="scope-division-note">
        ⚡ First to tick a section claims it. If two students tap at nearly the same time, only
        the first one to save is kept — the other will see it&apos;s already taken.
      </div>

      {error && <p className="scope-division-error">{error}</p>}

      {loading ? (
        <p className="scope-division-loading">Loading scope sections…</p>
      ) : sections.length === 0 ? (
        <div className="no-tasks-text">No scope sections defined for this milestone yet.</div>
      ) : (
        <div className="scope-section-list">
          {sections.map((section) => {
            const isMine = Boolean(currentUser) && String(section.claimedBy) === String(currentUser?.id);
            const isClaimed = Boolean(section.claimedBy);
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
              <div
                key={section.id}
                className={`scope-section-row ${isClaimed ? 'is-claimed' : ''} ${isMine ? 'is-mine' : ''}`}
              >
                <span className={`scope-section-checkbox ${isClaimed ? 'checked' : ''} ${isMine ? 'mine' : ''}`}>
                  {isClaimed ? '✓' : ''}
                </span>
                <div className="scope-section-body">
                  <p className="scope-section-title">{section.title}</p>
                  {section.description && <p className="scope-section-desc">{section.description}</p>}
                  {isClaimed && (
                    <p className={`scope-section-claimed-by ${isMine ? 'is-mine' : ''}`}>
                      🔒 {isMine ? `Claimed by you — ${currentUser?.name}` : `Claimed by ${section.claimedByName}`}
                    </p>
                  )}
                </div>
                {isClaimed ? (
                  <span className={`scope-section-locked-chip ${isMine ? 'is-mine' : ''}`}>
                    {isMine ? 'Locked to you' : 'Locked'}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="scope-section-claim-btn"
                    disabled={claimingId === section.id || Boolean(myClaimedSection)}
                    onClick={() => handleClaim(section.id)}
                    title={
                      myClaimedSection
                        ? `You've already claimed "${myClaimedSection.title}" in this milestone.`
                        : undefined
                    }
                  >
                    {claimingId === section.id
                      ? 'Claiming…'
                      : myClaimedSection
                      ? "You've claimed one already"
                      : '☐ Tick to claim'}
                  </button>
                )}
                {userRole === 'leader' && (
                  <div className="scope-section-owner-actions">
                    <button
                      type="button"
                      className="scope-section-icon-btn"
                      onClick={() => startEdit(section)}
                      title="Edit this section"
                      aria-label="Edit this section"
                    >
                      <Pencil size={14} />
                    </button>
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

      {userRole === 'leader' &&
        (showAddForm ? (
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
            + Add scope section
          </button>
        ))}

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
