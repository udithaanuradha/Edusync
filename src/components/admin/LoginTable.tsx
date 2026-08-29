import React, { useState, useEffect, useMemo } from 'react';
import { 
  KeyRound, 
  Search, 
  Shield, 
  User, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  MailCheck, 
  UserX,
  Sparkles
} from 'lucide-react';
import PasswordResetModal, { TargetUser } from './PasswordResetModal';

export interface LoginRow {
  id?: number | string;
  username: string;
  email?: string;
  role: string;
  time: string;
  isOnline?: boolean;
  isVerified?: boolean;
}

const columnHeaderStyle: React.CSSProperties = {
  padding: '12px 24px',
  color: '#64748b',
  fontWeight: '600',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};

const LoginTable: React.FC = () => {
  const [allUsers, setAllUsers] = useState<LoginRow[]>([]);
  const [recentLogins, setRecentLogins] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'recent' | 'all' | 'student' | 'lecturer' | 'mentor' | 'unverified'>('recent');
  const [selectedUser, setSelectedUser] = useState<TargetUser | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [verifiedUserIds, setVerifiedUserIds] = useState<Set<string>>(new Set());

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#e11d48'; 
      case 'student': return '#2563eb'; 
      case 'coordinator': return '#059669'; 
      case 'supervisor': return '#7c3aed'; 
      case 'lecturer': return '#0284c7';
      case 'mentor': return '#d97706';
      default: return '#64748b';
    }
  };

  useEffect(() => {
    const loadAllDirectoryData = async () => {
      try {
        setLoading(true);
        // 1. Fetch recent logins
        const recentRes = await fetch('http://localhost:5000/api/admin/recent-logins').catch(() => null);
        const recentData = recentRes && recentRes.ok ? await recentRes.json() : [];
        const mappedRecent: LoginRow[] = Array.isArray(recentData) ? recentData.map((r: any) => ({
          id: r.id,
          username: r.username,
          email: r.email,
          role: r.role || 'user',
          time: r.time || new Date().toISOString(),
          isOnline: true,
          isVerified: true,
        })) : [];
        setRecentLogins(mappedRecent);

        // 2. Fetch all user cohorts across roles in parallel
        const [studentRes, lecturerRes, mentorRes] = await Promise.all([
          fetch('http://localhost:5000/api/users?role=student').catch(() => null),
          fetch('http://localhost:5000/api/users?role=lecturer').catch(() => null),
          fetch('http://localhost:5000/api/users?role=mentor').catch(() => null),
        ]);

        const students = studentRes && studentRes.ok ? await studentRes.json() : [];
        const lecturers = lecturerRes && lecturerRes.ok ? await lecturerRes.json() : [];
        const mentors = mentorRes && mentorRes.ok ? await mentorRes.json() : [];

        const studentList = Array.isArray(students) ? students : (students.data || []);
        const lecturerList = Array.isArray(lecturers) ? lecturers : (lecturers.data || []);
        const mentorList = Array.isArray(mentors) ? mentors : (mentors.data || []);

        const combinedCohort: LoginRow[] = [
          ...studentList.map((u: any) => ({
            id: u.id,
            username: u.name || u.username || 'Student User',
            email: u.email || u.user_email || u.userEmail || u.mail || '',
            role: 'student',
            time: u.created_at || u.updated_at || new Date().toISOString(),
            isOnline: false,
            isVerified: Boolean(u.email || u.user_email),
          })),
          ...lecturerList.map((u: any) => ({
            id: u.id,
            username: u.name || u.username || 'Lecturer User',
            email: u.email || u.user_email || u.userEmail || u.mail || '',
            role: u.designation === 'coordinator' ? 'coordinator' : u.designation === 'supervisor' ? 'supervisor' : 'lecturer',
            time: u.created_at || u.updated_at || new Date().toISOString(),
            isOnline: false,
            isVerified: Boolean(u.email || u.user_email),
          })),
          ...mentorList.map((u: any) => ({
            id: u.id,
            username: u.name || u.username || 'Mentor User',
            email: u.email || u.user_email || u.userEmail || u.mail || '',
            role: 'mentor',
            time: u.created_at || u.updated_at || new Date().toISOString(),
            isOnline: false,
            isVerified: Boolean(u.email || u.user_email),
          })),
        ];

        // Enrich recent logins with exact email and user ID matched from registered database cohort
        const enrichedRecent: LoginRow[] = mappedRecent.map((r) => {
          const match = combinedCohort.find(
            (c) => c.username.toLowerCase().trim() === r.username.toLowerCase().trim()
          );
          return {
            ...r,
            id: match?.id || r.id,
            email: match?.email || r.email || '',
            isVerified: true,
          };
        });
        setRecentLogins(enrichedRecent);

        // Merge: all users from database cohort with active online recent logins overlay
        const mergedMap = new Map<string, LoginRow>();
        
        combinedCohort.forEach((u) => {
          const key = u.username.toLowerCase().trim();
          mergedMap.set(key, u);
        });

        enrichedRecent.forEach((r) => {
          const key = r.username.toLowerCase().trim();
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            mergedMap.set(key, {
              ...existing,
              time: r.time,
              isOnline: true,
              email: existing.email || r.email || '',
              isVerified: true,
            });
          } else {
            mergedMap.set(key, r);
          }
        });

        setAllUsers(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Error fetching users directory:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllDirectoryData();
  }, []);

  const handleManualVerify = (login: LoginRow) => {
    const key = String(login.id || login.username);
    setVerifiedUserIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    setAllUsers((prev) =>
      prev.map((u) => {
        if ((login.id && u.id === login.id) || u.username === login.username) {
          return { ...u, isVerified: true, email: u.email || `${u.username.toLowerCase().replace(/\s+/g, '')}@uom.lk` };
        }
        return u;
      })
    );
  };

  const isUserVerified = (login: LoginRow): boolean => {
    const key = String(login.id || login.username);
    if (verifiedUserIds.has(key)) return true;
    return Boolean(login.email && login.email.trim().length > 0 && login.isVerified !== false);
  };

  const studentCount = useMemo(() => allUsers.filter((u) => u.role.toLowerCase() === 'student').length, [allUsers]);
  const lecturerCount = useMemo(() => allUsers.filter((u) => ['lecturer', 'supervisor', 'coordinator'].includes(u.role.toLowerCase())).length, [allUsers]);
  const mentorCount = useMemo(() => allUsers.filter((u) => u.role.toLowerCase() === 'mentor').length, [allUsers]);

  const verifiedCount = useMemo(() => allUsers.filter((u) => isUserVerified(u)).length, [allUsers, verifiedUserIds]);
  const unverifiedCount = useMemo(() => allUsers.length - verifiedCount, [allUsers, verifiedCount]);

  const displayedLogins = useMemo(() => {
    // If there is an active search query, search through ALL users in the system
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q) ||
          (u.id && String(u.id).includes(q))
      );
    }

    // Filter based on active tab
    if (activeFilter === 'recent') {
      return recentLogins.length > 0 ? recentLogins : allUsers.slice(0, 10);
    }
    if (activeFilter === 'student') {
      return allUsers.filter((u) => u.role.toLowerCase() === 'student');
    }
    if (activeFilter === 'lecturer') {
      return allUsers.filter((u) => ['lecturer', 'supervisor', 'coordinator'].includes(u.role.toLowerCase()));
    }
    if (activeFilter === 'mentor') {
      return allUsers.filter((u) => u.role.toLowerCase() === 'mentor');
    }
    if (activeFilter === 'unverified') {
      return allUsers.filter((u) => !isUserVerified(u));
    }
    return allUsers;
  }, [allUsers, recentLogins, searchQuery, activeFilter, verifiedUserIds]);

  const handleOpenReset = (login: LoginRow) => {
    setSelectedUser({
      id: login.id,
      username: login.username,
      email: login.email,
      role: login.role,
    });
    setIsResetModalOpen(true);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      marginTop: '32px',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      width: '100%',
    }}>
      
      {/* Title Header: Clean White with Search Box */}
      <div style={{ 
        padding: '18px 24px', 
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        backgroundColor: '#ffffff'
      }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#2563eb" />
            System Users Directory & Security Management
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live Full-System Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '7px 12px',
            width: '280px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search all users by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#0f172a',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Method 4: Security Audit Overview Bar (KPI Summary Strip) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '14px 24px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
      }}>
        {/* Total Accounts KPI */}
        <div 
          onClick={() => setActiveFilter('all')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = '#93c5fd')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            backgroundColor: '#eff6ff', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Enrolled</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{allUsers.length} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>Accounts</span></div>
          </div>
        </div>

        {/* Online / Active Sessions KPI */}
        <div 
          onClick={() => setActiveFilter('recent')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = '#86efac')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            backgroundColor: '#ecfdf5', color: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Active Online</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {recentLogins.length} 
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '11px', fontWeight: '500', color: '#059669' }}>Sessions</span>
            </div>
          </div>
        </div>

        {/* Verified Accounts KPI */}
        <div 
          onClick={() => setActiveFilter('all')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = '#a7f3d0')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            backgroundColor: '#f0fdf4', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Verified Access</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>{verifiedCount} <span style={{ fontSize: '11px', fontWeight: '500', color: '#16a34a' }}>Users</span></div>
          </div>
        </div>

        {/* Unverified / Failed Logins KPI (Method 4) */}
        <div 
          onClick={() => setActiveFilter('unverified')}
          style={{
            backgroundColor: activeFilter === 'unverified' ? '#fef3c7' : '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: activeFilter === 'unverified' ? '1px solid #f59e0b' : '1px solid #fed7aa',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = activeFilter === 'unverified' ? '#f59e0b' : '#fed7aa')}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            backgroundColor: '#fff7ed', color: '#ea580c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: '700', textTransform: 'uppercase' }}>Unverified / Failed</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#ea580c' }}>{unverifiedCount} <span style={{ fontSize: '11px', fontWeight: '600', color: '#c2410c' }}>Pending</span></div>
          </div>
        </div>
      </div>

      {/* Cohort Filter Tabs */}
      {!searchQuery && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          overflowX: 'auto',
        }}>
          <button
            type="button"
            onClick={() => setActiveFilter('recent')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeFilter === 'recent' ? '#2563eb' : '#f1f5f9',
              color: activeFilter === 'recent' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={13} />
            Recent Logins ({recentLogins.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeFilter === 'all' ? '#2563eb' : '#f1f5f9',
              color: activeFilter === 'all' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={13} />
            All System Users ({allUsers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('student')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeFilter === 'student' ? '#2563eb' : '#f1f5f9',
              color: activeFilter === 'student' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            Students ({studentCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('lecturer')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeFilter === 'lecturer' ? '#2563eb' : '#f1f5f9',
              color: activeFilter === 'lecturer' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            Lecturers & Staff ({lecturerCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('mentor')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeFilter === 'mentor' ? '#2563eb' : '#f1f5f9',
              color: activeFilter === 'mentor' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            Industry Mentors ({mentorCount})
          </button>

          {/* Unverified / Failed Logins Filter Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('unverified')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeFilter === 'unverified' ? '#ea580c' : '#fff7ed',
              color: activeFilter === 'unverified' ? '#ffffff' : '#c2410c',
              transition: 'all 0.15s ease',
              marginLeft: 'auto',
            }}
          >
            <AlertTriangle size={13} />
            ⚠️ Failed & Unverified ({unverifiedCount})
          </button>
        </div>
      )}

      {/* Search Result Counter */}
      {searchQuery && (
        <div style={{ padding: '8px 24px', backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>
          Showing {displayedLogins.length} user{displayedLogins.length !== 1 ? 's' : ''} matching "{searchQuery}" across entire university database:
        </div>
      )}

      <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={columnHeaderStyle}>User Identity</th>
              <th style={columnHeaderStyle}>Security Role</th>
              <th style={columnHeaderStyle}>Access / Activity</th>
              <th style={columnHeaderStyle}>Verification & Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Syncing users directory from server...</td></tr>
            ) : displayedLogins.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>No users match the selected filter.</td></tr>
            ) : (
              displayedLogins.map((login, index) => {
                const verified = isUserVerified(login);

                return (
                  <tr 
                    key={`${login.id || index}-${login.username}`} 
                    className="pro-table-row" 
                    style={{ 
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: !verified ? '#fffdf7' : index % 2 === 0 ? '#ffffff' : '#fafbfc' 
                    }}
                  >
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px', 
                          backgroundColor: !verified ? '#fff7ed' : '#eff6ff', 
                          color: !verified ? '#ea580c' : '#2563eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '12px', 
                          border: !verified ? '1px solid #fed7aa' : '1px solid #dbeafe',
                          flexShrink: 0,
                        }}>
                          {login.username ? login.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {login.username}
                          </div>
                          <div style={{ fontSize: '11px', color: login.email ? '#64748b' : '#c2410c', fontWeight: !login.email ? '600' : '400' }}>
                            {login.email || '⚠️ No email registered'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '7px', height: '7px', borderRadius: '50%', 
                          backgroundColor: getRoleColor(login.role) 
                        }} />
                        <span style={{ color: '#475569', fontWeight: '600', fontSize: '12px', textTransform: 'capitalize' }}>
                          {login.role}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 24px', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                      {login.isOnline ? (
                        new Date(login.time).toLocaleString('en-GB', { 
                          timeZone: 'Asia/Colombo',
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true 
                        })
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Enrolled User</span>
                      )}
                    </td>

                    {/* Verification & Status Badges */}
                    <td style={{ padding: '12px 24px' }}>
                      {login.isOnline ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                           <span className="pulse-dot"></span>
                           <span style={{ color: '#059669', fontSize: '11px', fontWeight: '700' }}>ONLINE</span>
                        </div>
                      ) : !verified ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}>
                          <AlertTriangle size={12} color="#ea580c" />
                          UNVERIFIED / BLOCKED
                        </div>
                      ) : (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          <CheckCircle2 size={12} color="#059669" />
                          VERIFIED
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
      
      <style>{`
        .pro-table-row { transition: background-color 0.1s ease; }
        .pro-table-row:hover { background-color: #f0f7ff !important; }
        
        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          position: relative;
        }

        .pulse-dot::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LoginTable;