import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
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
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: 'All System Users'
  });
  const [isPosting, setIsPosting] = useState(false);

  // ✅ Get logged-in admin from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/announcements?role=admin`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  // ✅ Post with author_id so ownership is tracked
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      alert("Please fill in both title and message.");
      return;
    }

    setIsPosting(true);
    const payload = {
      ...formData,
      author_name: user.name || 'Admin',
      author_id: user.id || null  
    };

    try {
      const res = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormData({ title: '', message: '', target_audience: 'All System Users' });
        await fetchAnnouncements();
        alert("✅ Announcement posted successfully!");
      } else {
        alert("❌ Failed to post announcement.");
      }
    } catch (error) {
      alert("❌ Failed to connect to server.");
    } finally {
      setIsPosting(false);
    }
  };

  // ✅ Delete only if this admin owns the announcement
  const handleDelete = async (ann: Announcement) => {
    if (ann.author_id !== user.id) {
      alert("❌ You can only delete your own announcements.");
      return;
    }
    if (!window.confirm("Delete this announcement?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/announcements/${ann.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_id: user.id })
      });

      if (res.ok) {
        await fetchAnnouncements();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error || 'Failed to delete.'}`);
      }
    } catch (error) {
      alert("❌ Failed to connect to server.");
    }
  };

  const isMyAnnouncement = (ann: Announcement) => ann.author_id === user.id;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">

          
          <div className="dashboard-header-section" style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', textAlign: 'left', marginBottom: '32px'
          }}>
            <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>
              Manage System Announcements
            </h2>
            <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>
              Create and manage system-wide notifications.
            </p>
          </div>

          {/* Post Form */}
          <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Post Announcement</h3>
            <form onSubmit={handlePost}>
              <input
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <textarea
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px', boxSizing: 'border-box' }}
                placeholder="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
              <select
                style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              >
                <option>All System Users</option>
                <option>Student</option>
                <option>Coordinator</option>
                <option>Supervisor</option>
                <option>Mentor</option>
              </select>
              <button
                type="submit"
                disabled={isPosting}
                style={{ width: '100%', padding: '12px', backgroundColor: isPosting ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isPosting ? 'not-allowed' : 'pointer' }}
              >
                {isPosting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>
          </div>

          {/* Announcements List */}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Recent Announcements</h3>
            {loading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
            ) : announcements.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>No announcements yet.</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '12px', border: `1px solid ${isMyAnnouncement(ann) ? '#bfdbfe' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>
                        {ann.target_audience}
                      </span>
                  
                      {isMyAnnouncement(ann) && (
                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          Your Post
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 6px 0' }}>{ann.title}</h4>
                    <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 8px 0' }}>{ann.message}</p>
                    <small style={{ color: '#94a3b8' }}>
                      By {ann.author_name} • {new Date(ann.created_at).toLocaleString()}
                    </small>
                  </div>

                  {/* Delete only shown for own announcements */}
                  {isMyAnnouncement(ann) && (
                    <button
                      onClick={() => handleDelete(ann)}
                      style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginLeft: '16px', flexShrink: 0 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminAnnouncements;