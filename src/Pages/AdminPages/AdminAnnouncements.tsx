import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

interface Announcement {
  id: number;
  title: string;
  message: string;
  target_audience: string;
  author_name: string;
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

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchAnnouncements = async () => {
    try {
      // Fetching with role=admin to trigger the full list in the backend
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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, author_name: user.name || 'Admin' };

    try {
      const res = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormData({ title: '', message: '', target_audience: 'All System Users' });
        fetchAnnouncements();
      }
    } catch (error) { alert("Post failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this announcement?")) return;
    await fetch(`http://localhost:5000/api/announcements/${id}`, { method: 'DELETE' });
    fetchAnnouncements();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }}>Manage System Announcements</h2>
            <p style={{ color: '#64748b' }}>Create and manage system-wide notifications</p>
          </div>

          {/* Form matches the layout in */}
          <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Post Announcement</h3>
            <form onSubmit={handlePost}>
              <input 
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
              <textarea 
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px' }}
                placeholder="Message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              />
              <select 
                style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                value={formData.target_audience}
                onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
              >
                <option>All System Users</option>
                <option>Student</option>
                <option>Coordinator</option>
                <option>Supervisor</option>
                <option>Mentor</option>
              </select>
              <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Post Announcement
              </button>
            </form>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3>Recent Announcements</h3>
            {announcements.map((ann) => (
              <div key={ann.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>{ann.target_audience}</span>
                  <h4 style={{ margin: '8px 0' }}>{ann.title}</h4>
                  <p style={{ fontSize: '14px', color: '#475569' }}>{ann.message}</p>
                  <small style={{ color: '#94a3b8' }}>
                    {/* Timezone fix: new Date() handles local conversion */}
                    By {ann.author_name} • {new Date(ann.created_at).toLocaleString()}
                  </small>
                </div>
                <button onClick={() => handleDelete(ann.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAnnouncements;