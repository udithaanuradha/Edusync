import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { 
  Megaphone, 
  Users, 
  GraduationCap, 
  UserCheck, 
  User, 
  Briefcase, 
  Trash2, 
  Clock, 
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './AdminDashboard.css';

interface Announcement {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
  author_id: number;
  created_at: string;
}

const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [mainAudience, setMainAudience] = useState<'All System Users' | 'Student' | 'Coordinator' | 'Supervisor' | 'Mentor'>('All System Users');
  const [studentLevel, setStudentLevel] = useState<string>('All');
  const [studentDegree, setStudentDegree] = useState<string>('All');
  const [staffDepartment, setStaffDepartment] = useState<string>('All');

  const [isPosting, setIsPosting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ✅ Get logged-in admin from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/announcements?role=admin`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAnnouncements(); 
  }, []);

  // Compute exact target audience string based on selected academic_unit and level
  const computeTargetAudience = () => {
    if (mainAudience === 'All System Users') return 'All System Users';
    if (mainAudience === 'Mentor') return 'Mentor';

    if (mainAudience === 'Student') {
      const hasLevel = studentLevel !== 'All';
      const hasDegree = studentDegree !== 'All';

      if (!hasLevel && !hasDegree) return 'Student';
      if (hasLevel && !hasDegree) return `Student - ${studentLevel}`;
      if (!hasLevel && hasDegree) return `Student - ${studentDegree}`;
      return `Student - ${studentLevel} - ${studentDegree}`;
    }

    if (mainAudience === 'Coordinator') {
      if (staffDepartment === 'All') return 'Coordinator';
      return `Coordinator - ${staffDepartment}`;
    }

    if (mainAudience === 'Supervisor') {
      if (staffDepartment === 'All') return 'Supervisor';
      return `Supervisor - ${staffDepartment}`;
    }

    return 'All System Users';
  };

  // ✅ Post with author_id and exact target audience
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusFeedback({ type: 'error', message: 'Please fill in both title and message.' });
      return;
    }

    setIsPosting(true);
    setStatusFeedback(null);

    const target_audience = computeTargetAudience();

    const payload = {
      title: title.trim(),
      message: message.trim(),
      target_audience,
      author_name: user.name || 'System Admin',
      author_id: user.id || null  
    };

    try {
      const res = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTitle('');
        setMessage('');
        setMainAudience('All System Users');
        setStudentLevel('All');
        setStudentDegree('All');
        setStaffDepartment('All');
        await fetchAnnouncements();
        setStatusFeedback({ type: 'success', message: `✅ Announcement posted and dispatched to "${target_audience}" successfully!` });
      } else {
        setStatusFeedback({ type: 'error', message: '❌ Failed to post announcement. Please check server connection.' });
      }
    } catch (error) {
      setStatusFeedback({ type: 'error', message: '❌ Failed to connect to server.' });
    } finally {
      setIsPosting(false);
    }
  };

  // ✅ Delete only if this admin owns the announcement
  const handleDelete = async (ann: Announcement) => {
    if (ann.author_id !== user.id && user.role !== 'admin') {
      setStatusFeedback({ type: 'error', message: '❌ You can only delete your own announcements.' });
      setTimeout(() => setStatusFeedback(null), 3500);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/announcements/${ann.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_id: user.id })
      });

      if (res.ok) {
        await fetchAnnouncements();
        setStatusFeedback({ type: 'success', message: `✅ Announcement "${ann.title}" deleted successfully.` });
        setTimeout(() => setStatusFeedback(null), 3500);
      } else {
        const data = await res.json();
        setStatusFeedback({ type: 'error', message: `❌ ${data.error || 'Failed to delete.'}` });
        setTimeout(() => setStatusFeedback(null), 3500);
      }
    } catch (error) {
      setStatusFeedback({ type: 'error', message: '❌ Failed to connect to server.' });
      setTimeout(() => setStatusFeedback(null), 3500);
    }
  };

  const isMyAnnouncement = (ann: Announcement) => ann.author_id === user.id;

  const getAudienceBadge = (audience: string) => {
    const aud = audience || '';
    if (aud === 'All System Users' || aud === 'All') {
      return {
        label: 'All System Users',
        icon: <Users size={12} />,
        style: { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }
      };
    }
    if (aud.startsWith('Student') || aud.startsWith('Level')) {
      return {
        label: aud,
        icon: <GraduationCap size={12} />,
        style: { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
      };
    }
    if (aud.startsWith('Coordinator')) {
      return {
        label: aud,
        icon: <UserCheck size={12} />,
        style: { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }
      };
    }
    if (aud.startsWith('Supervisor')) {
      return {
        label: aud,
        icon: <User size={12} />,
        style: { backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }
      };
    }
    if (aud.startsWith('Mentor')) {
      return {
        label: aud,
        icon: <Briefcase size={12} />,
        style: { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
      };
    }
    return {
      label: aud,
      icon: <Megaphone size={12} />,
      style: { backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }
    };
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          
          <div className="dashboard-header-section" style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', textAlign: 'left', marginBottom: '28px'
          }}>
            <h2 className="overview-title" style={{ textAlign: 'left', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Megaphone size={22} color="#6366f1" />
              Manage System Announcements
            </h2>
          </div>

          {/* Feedback banner */}
          {statusFeedback && (
            <div style={{
              maxWidth: '650px',
              margin: '0 auto 20px auto',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: statusFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: statusFeedback.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${statusFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
            </div>
          )}

          {/* Post Form */}
          <div style={{ 
            maxWidth: '650px', 
            margin: '0 auto 40px auto', 
            backgroundColor: '#ffffff', 
            padding: '24px 28px', 
            borderRadius: '16px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
            border: '1px solid #e2e8f0' 
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} color="#6366f1" />
              Create & Publish Announcement
            </h3>
            
            <form onSubmit={handlePost}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                  placeholder=""
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Message
                </label>
                <textarea
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                  placeholder=""
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Target Audience
                </label>
                <select
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                  value={mainAudience}
                  onChange={(e) => {
                    setMainAudience(e.target.value as any);
                  }}
                >
                  <option value="All System Users">All System Users</option>
                  <option value="Student">Student</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Mentor">Mentor</option>
                </select>
              </div>

              {/* Sub-Filters for Student: Level and Degree (academic_unit) */}
              {mainAudience === 'Student' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '12px', 
                  marginBottom: '18px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0' 
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                      Academic Level
                    </label>
                    <select
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                      value={studentLevel}
                      onChange={(e) => setStudentLevel(e.target.value)}
                    >
                      <option value="All">All Levels</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                      <option value="Level 4">Level 4</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                      Degree
                    </label>
                    <select
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                      value={studentDegree}
                      onChange={(e) => setStudentDegree(e.target.value)}
                    >
                      <option value="All">All Degrees</option>
                      <option value="IT">IT</option>
                      <option value="ITM">ITM</option>
                      <option value="AI">AI</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sub-Filters for Coordinator / Supervisor: Department (academic_unit) */}
              {(mainAudience === 'Coordinator' || mainAudience === 'Supervisor') && (
                <div style={{ 
                  marginBottom: '18px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                    Department
                  </label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                    value={staffDepartment}
                    onChange={(e) => setStaffDepartment(e.target.value)}
                  >
                    <option value="All">All Departments</option>
                    <option value="IT">IT</option>
                    <option value="IDS">IDS</option>
                    <option value="CM">CM</option>
                  </select>
                </div>
              )}

              {/* Purple-Mixed Blue Button (දම් මිශ්‍ර නිල්) */}
              <button
                type="submit"
                disabled={isPosting}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: isPosting 
                    ? 'linear-gradient(135deg, #c4b5fd 0%, #93c5fd 100%)' 
                    : 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  fontSize: '13px',
                  cursor: isPosting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                }}
                onMouseOver={(e) => {
                  if (!isPosting) e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #1d4ed8 100%)';
                }}
                onMouseOut={(e) => {
                  if (!isPosting) e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)';
                }}
              >
                <Send size={15} />
                {isPosting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          </div>

          {/* Announcements List */}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Published Announcements ({announcements.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Sorted by most recent
              </span>
            </div>

            {loading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '32px' }}>Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                No announcements published yet.
              </div>
            ) : (
              announcements.map((ann) => {
                const badge = getAudienceBadge(ann.target_audience);

                return (
                  <div 
                    key={ann.id} 
                    style={{ 
                      backgroundColor: '#fff', 
                      padding: '18px 20px', 
                      borderRadius: '12px', 
                      marginBottom: '12px', 
                      border: `1px solid ${isMyAnnouncement(ann) ? '#bfdbfe' : '#e2e8f0'}`, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: '600',
                          ...badge.style
                        }}>
                          {badge.icon}
                          {badge.label}
                        </span>
                    
                        {isMyAnnouncement(ann) && (
                          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                            Your Post
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                        {ann.title}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                        {ann.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                        <Clock size={12} />
                        <span>By {ann.author_name} • {new Date(ann.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Delete only shown for own announcements or admin */}
                    {(isMyAnnouncement(ann) || user.role === 'admin') && (
                      <button
                        onClick={() => handleDelete(ann)}
                        style={{ 
                          color: '#ef4444', 
                          border: '1px solid #fecaca', 
                          backgroundColor: '#fef2f2',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer', 
                          fontWeight: '600', 
                          fontSize: '12px', 
                          marginLeft: '16px', 
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Delete Announcement"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminAnnouncements;