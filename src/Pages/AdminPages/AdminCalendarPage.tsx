import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import { Database, Plus, ChevronLeft, ChevronRight, X, Shield, CheckCircle, Loader2 } from 'lucide-react';
import './AdminDashboard.css';

const AdminCalendarPage: React.FC = () => {
  const [viewDate, setViewDate] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Real Data States
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [backupType, setBackupType] = useState('Full System Backup');
  const [backupTime, setBackupTime] = useState('02:00');

  // --- 1. Fetch Data from TiDB Backend ---
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

  useEffect(() => {
    fetchBackups();
  }, []);

  // --- 2. Handle Scheduling (POST) ---
  const handleConfirmBackup = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    const payload = {
      type: backupType,
      // Formats date to YYYY-MM-DD for TiDB DATE column
      date: selectedDate.toISOString().split('T')[0], 
      time: backupTime
    };

    try {
      const response = await fetch('http://localhost:5000/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchBackups(); // Refresh table with real data
        setIsDrawerOpen(false);
        alert("✅ Backup successfully scheduled in TiDB Cloud!");
      }
    } catch (error) {
      alert("❌ Failed to save backup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(newDate);
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(clickedDate);
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
          <div 
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }}
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        <main className="content-container" style={{ padding: '24px' }}>
          <div className="dashboard-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
            <div style={{ textAlign: 'left' }}>
              <h2 className="overview-title" style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Admin Master Calendar</h2>
              <p className="overview-subtitle" style={{ color: '#6b7280' }}>Manage maintenance and system backup protocols.</p>
            </div>
            <button style={{ padding: '10px 20px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} /> Global Security Lock
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
            {/* Calendar Grid */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
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
                    <div 
                      key={day} 
                      onClick={() => handleDayClick(day)}
                      style={{ 
                        border: isSelected ? '2px solid #2563eb' : '1px solid #f3f4f6', 
                        borderRadius: '10px', minHeight: '80px', padding: '8px', cursor: 'pointer',
                        backgroundColor: isSelected ? '#eff6ff' : '#fff'
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REAL DATA BACKUP TABLE */}
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
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Fetching backups...</td></tr>
                  ) : backups.length > 0 ? (
                    backups.map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '12px 5px', fontWeight: '500' }}>{b.backup_type}</td>
                        <td style={{ padding: '12px 5px' }}>{new Date(b.scheduled_date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 5px', color: '#2563eb', fontWeight: '600' }}>{b.scheduled_time}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No backups scheduled</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* SIDE DRAWER */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '380px',
          backgroundColor: 'white', zIndex: 20, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out', padding: '24px'
        }}>
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
            <select 
              value={backupType}
              onChange={(e) => setBackupType(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option>Full System Backup</option>
              <option>Database Only</option>
              <option>Files & Media</option>
            </select>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Start Time</label>
            <input 
              type="time" 
              value={backupTime}
              onChange={(e) => setBackupTime(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} 
            />
          </div>

          <button 
            onClick={handleConfirmBackup}
            disabled={isSubmitting}
            style={{ 
              width: '100%', padding: '14px', backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb', 
              color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} 
            {isSubmitting ? 'Saving...' : 'Confirm Backup Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarPage;