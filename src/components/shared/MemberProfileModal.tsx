import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface MemberProfile {
  id: number;
  name: string;
  email: string;
  university_id: string | null;
  department: string | null;
  level: number | null;
  role: string;
  phone: string | null;
}

interface MemberProfileModalProps {
  memberId: number | string;
  onClose: () => void;
}

// Shared "View Profile" modal used by both the coordinator's group member
// list (GroupManagement.tsx) and the student's team member list
// (ProjectManagementPage.tsx). Fetches GET /api/users/:id/profile, which
// only succeeds if the viewer shares a group with the target member (or is
// viewing their own profile) — the backend enforces this, not the UI.
const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ memberId, onClose }) => {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userString = localStorage.getItem('user');
    const requester = userString ? JSON.parse(userString) : null;

    if (!requester?.id) {
      setError('User session not found. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    fetch(`http://localhost:5000/api/users/${memberId}/profile?requesterId=${requester.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load profile.');
        }
        setProfile(data.data);
      })
      .catch((err) => setError(err.message || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [memberId]);

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member Profile"
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 10, padding: 24, width: 360, maxWidth: '90vw', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Member Profile</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {loading && <p style={{ color: '#64748b', fontSize: 13 }}>Loading profile...</p>}
        {!loading && error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

        {!loading && !error && profile && (
          <div>
            <h4 style={{ margin: '0 0 4px 0' }}>{profile.name}</h4>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 12, textTransform: 'capitalize' }}>{profile.role}</p>
            {row('Email', profile.email)}
            {row('University ID', profile.university_id)}
            {row('Department', profile.department)}
            {row('Level', profile.level)}
            {row('Phone', profile.phone)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfileModal;
