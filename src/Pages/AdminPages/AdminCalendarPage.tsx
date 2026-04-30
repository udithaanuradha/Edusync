import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { Database, ChevronLeft, ChevronRight, X, Shield, CheckCircle, Loader2, Lock, Unlock, Pencil, Trash2 } from 'lucide-react';
import './AdminDashboard.css';

const AdminCalendarPage: React.FC = () => {
  const [viewDate, setViewDate] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Security Lock State
  const [isLocked, setIsLocked] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  // Real Data States
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [backupType, setBackupType] = useState('Full System Backup');
  const [backupTime, setBackupTime] = useState('02:00');

  //  Edit States
  const [editingBackup, setEditingBackup] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- Fetch Data ---
  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/backups');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error("❌ Error fetching backups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  // --- Create Backup ---
  const handleConfirmBackup = async () => {
    if (!selectedDate) return;
    if (isLocked) { alert("🔒 System is locked."); return; }

    setIsSubmitting(true);
    const payload = { type: backupType, date: selectedDate.toISOString().split('T')[0], time: backupTime };

    try {
      const response = await fetch('http://localhost:5000/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        await fetchBackups();
        setIsDrawerOpen(false);
        alert("✅ Backup successfully scheduled!");
      }
    } catch (error) {
      alert("❌ Failed to save backup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleEditClick = (backup: any) => {
    setEditingBackup({
      id: backup.id,
      type: backup.backup_type,
      date: new Date(backup.scheduled_date).toISOString().split('T')[0],
      time: backup.scheduled_time.slice(0, 5) // trim seconds
    });
  };

  //  Save Edit
  const handleSaveEdit = async () => {
    if (!editingBackup) return;
    try {
      const response = await fetch(`http://localhost:5000/api/backups/${editingBackup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editingBackup.type, date: editingBackup.date, time: editingBackup.time }),
      });
      if (response.ok) {
        await fetchBackups();
        setEditingBackup(null);
        alert("✅ Backup updated successfully!");
      } else {
        alert("❌ Failed to update backup.");
      }
    } catch (error) {
      alert("❌ Error updating backup.");
    }
  };

  //  Confirm Delete
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/backups/${deletingId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchBackups();
        setShowDeleteModal(false);
        setDeletingId(null);
        alert("✅ Backup deleted successfully!");
      } else {
        alert("❌ Failed to delete backup.");
      }
    } catch (error) {
      alert("❌ Error deleting backup.");
    }
  };

  // --- Security Lock ---
  const handleLockToggle = () => setShowLockModal(true);
  const confirmLockToggle = () => { setIsLocked(prev => !prev); setShowLockModal(false); setIsDrawerOpen(false); };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleDayClick = (day: number) => {
    if (isLocked) { alert("🔒 System is locked."); return; }
    setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    setIsDrawerOpen(true);
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div className="main-viewport" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <Header />

        {isDrawerOpen && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }}
            onClick={() => setIsDrawerOpen(false)} />
        )}

        {/* Security Lock Modal */}
        {showLockModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '420px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: isLocked ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                {isLocked ? <Unlock size={28} color="#16a34a" /> : <Lock size={28} color="#dc2626" />}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>{isLocked ? 'Unlock System?' : 'Lock System?'}</h3>
              <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
                {isLocked ? 'This will re-enable backup scheduling.' : 'This will disable all backup scheduling until unlocked.'}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowLockModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={confirmLockToggle} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: isLocked ? '#16a34a' : '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
                  {isLocked ? 'Yes, Unlock' : 'Yes, Lock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingBackup && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Edit Backup</h3>
                <X size={20} style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => setEditingBackup(null)} />
              </div>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Backup Type</label>
              <select
                value={editingBackup.type}
                onChange={(e) => setEditingBackup({ ...editingBackup, type: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px' }}
              >
                <option>Full System Backup</option>
                <option>Database Only</option>
                <option>Files & Media</option>
              </select>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Date</label>
              <input
                type="date"
                value={editingBackup.date}
                onChange={(e) => setEditingBackup({ ...editingBackup, date: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '16px', boxSizing: 'border-box' }}
              />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Time</label>
              <input
                type="time"
                value={editingBackup.time}
                onChange={(e) => setEditingBackup({ ...editingBackup, time: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '24px', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setEditingBackup(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleSaveEdit} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '400px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <Trash2 size={28} color="#dc2626" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>Delete Backup?</h3>
              <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>This action cannot be undone. The backup schedule will be permanently removed.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowDeleteModal(false); setDeletingId(null); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        <main className="content-container" style={{ padding: '24px' }}>

          {/* Header */}
          <div className="dashboard-header-section" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', marginBottom: '32px' }}>
            <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>Admin Master Calendar</h2>
            <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>Manage maintenance and system backup protocols.</p>
          </div>

          {/* Security Lock Button */}
          <div style={{ marginBottom: '24px' }}>
            <button onClick={handleLockToggle} style={{ padding: '10px 20px', backgroundColor: isLocked ? '#fef2f2' : '#fee2e2', color: isLocked ? '#7f1d1d' : '#991b1b', border: `1px solid ${isLocked ? '#fca5a5' : '#fecaca'}`, borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: isLocked ? '0 0 0 3px rgba(220,38,38,0.2)' : 'none' }}>
              {isLocked ? <Lock size={18} /> : <Shield size={18} />}
              {isLocked ? '🔒 System Locked — Click to Unlock' : 'Global Security Lock'}
            </button>
            {isLocked && (
              <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={14} /> System is currently locked. Backup scheduling is disabled.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>

            {/* Calendar */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '25px' }}>
                <button onClick={() => changeMonth(-1)} style={{ border: 'none', background: '#f3f4f6', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                <h3 style={{ margin: 0, fontSize: '24px', width: '250px', textAlign: 'center' }}>
                  {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
                </h3>
                <button onClick={() => changeMonth(1)} style={{ border: 'none', background: '#f3f4f6', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><ChevronRight size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: '#6b7280', fontSize: '12px' }}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewDate.getMonth();
                  return (
                    <div key={day} onClick={() => handleDayClick(day)} style={{ border: isSelected ? '2px solid #2563eb' : '1px solid #f3f4f6', borderRadius: '10px', minHeight: '80px', padding: '8px', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : '#fff' }}>
                      <span style={{ fontWeight: '600' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#2563eb" /> Upcoming Backups
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6', textAlign: 'left', color: '#6b7280' }}>
                    <th style={{ padding: '10px 5px' }}>Type</th>
                    <th style={{ padding: '10px 5px' }}>Date</th>
                    <th style={{ padding: '10px 5px' }}>Time</th>
                    <th style={{ padding: '10px 5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Fetching backups...</td></tr>
                  ) : backups.length > 0 ? (
                    backups.map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '12px 5px', fontWeight: '500' }}>{b.backup_type}</td>
                        <td style={{ padding: '12px 5px' }}>{new Date(b.scheduled_date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 5px', color: '#2563eb', fontWeight: '600' }}>{b.scheduled_time}</td>
                        <td style={{ padding: '12px 5px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditClick(b)}
                              title="Edit"
                              style={{ padding: '5px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Pencil size={13} color="#2563eb" />
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteClick(b.id)}
                              title="Delete"
                              style={{ padding: '5px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={13} color="#dc2626" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No backups scheduled</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Side Drawer */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '380px', backgroundColor: 'white', zIndex: 20, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>Admin Tools</span>
            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsDrawerOpen(false)} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '24px' }}>Schedule Backup</h2>
          <div style={{ backgroundColor: '#f3f7ff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>SELECTED DATE</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#1e40af' }}>
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
            </p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Backup Type</label>
            <select value={backupType} onChange={(e) => setBackupType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
              <option>Full System Backup</option>
              <option>Database Only</option>
              <option>Files & Media</option>
            </select>
          </div>
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Start Time</label>
            <input type="time" value={backupTime} onChange={(e) => setBackupTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
          </div>
          <button onClick={handleConfirmBackup} disabled={isSubmitting} style={{ width: '100%', padding: '14px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            {isSubmitting ? 'Saving...' : 'Confirm Backup Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarPage;