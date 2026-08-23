import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  Clock, 
  Users, 
  GraduationCap, 
  UserCheck, 
  User, 
  Briefcase, 
  ChevronRight, 
  Sparkles,
  Plus
} from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
  author_id?: number | string;
  created_at: string;
}

interface AdminAnnouncementWidgetProps {
  title?: string;
  maxItems?: number;
}

const AdminAnnouncementWidget: React.FC<AdminAnnouncementWidgetProps> = ({
  title = "Latest Announcements",
  maxItems = 3
}) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/announcements?role=admin');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.announcements) ? data.announcements : (Array.isArray(data) ? data : []);
        setAnnouncements(list);
      } else {
        setAnnouncements([]);
      }
    } catch (err) {
      console.error('Failed to fetch announcements for admin:', err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAudienceBadge = (audience?: string) => {
    const aud = (audience || 'All System Users').trim();

    if (aud === 'All System Users' || aud === 'All') {
      return {
        label: 'All System Users',
        icon: <Users size={11} />,
        bg: '#f1f5f9',
        color: '#334155',
        border: '#cbd5e1'
      };
    }
    if (aud.startsWith('Student') || aud.startsWith('Level')) {
      return {
        label: aud,
        icon: <GraduationCap size={11} />,
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe'
      };
    }
    if (aud.startsWith('Coordinator')) {
      return {
        label: aud,
        icon: <UserCheck size={11} />,
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0'
      };
    }
    if (aud.startsWith('Supervisor')) {
      return {
        label: aud,
        icon: <User size={11} />,
        bg: '#f5f3ff',
        color: '#6d28d9',
        border: '#ddd6fe'
      };
    }
    if (aud.startsWith('Mentor')) {
      return {
        label: aud,
        icon: <Briefcase size={11} />,
        bg: '#fffbeb',
        color: '#b45309',
        border: '#fde68a'
      };
    }
    return {
      label: aud,
      icon: <Megaphone size={11} />,
      bg: '#f8fafc',
      color: '#475569',
      border: '#e2e8f0'
    };
  };

  const displayList = announcements.slice(0, maxItems);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Widget Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#eef2ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1'
          }}>
            <Megaphone size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
              {title}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Broadcasts & system notifications
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard/announcements')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(99, 102, 241, 0.2)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
          >
            <Plus size={14} />
            New Announcement
          </button>

          <button
            onClick={() => navigate('/dashboard/announcements')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'transparent',
              color: '#2563eb',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            View All ({announcements.length}) <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13.5px' }}>
          Loading announcements...
        </div>
      ) : displayList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <Sparkles size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
          <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
            No announcements published yet
          </p>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
            Click "+ New Announcement" above to broadcast messages to students, staff, or mentors.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayList.map((ann) => {
            const badge = getAudienceBadge(ann.target_audience);
            return (
              <div
                key={ann.id}
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}>
                      {badge.icon}
                      {badge.label}
                    </span>

                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                      By {ann.author_name || 'System Admin'}
                    </span>
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    color: '#94a3b8',
                    fontWeight: '500'
                  }}>
                    <Clock size={12} />
                    {formatTimestamp(ann.created_at)}
                  </span>
                </div>

                <h4 style={{
                  margin: '0 0 6px 0',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  color: '#0f172a'
                }}>
                  {ann.title}
                </h4>

                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {ann.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementWidget;
