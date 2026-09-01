import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  Sparkles,
  FileCheck2,
  Award,
  Bell,
  MessageSquare,
  LogIn,
  UserCheck
} from 'lucide-react';

export interface LoginRow {
  id?: number | string;
  username: string;
  email?: string;
  role: string;
  designation?: string;
  time: string;
  lastAction?: string;
  isOnline?: boolean;
  isVerified?: boolean;
}

const columnHeaderStyle: React.CSSProperties = {
  padding: '12px 24px',
  color: 'var(--eds-color-text-muted)',
  fontWeight: '600',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--eds-color-border)',
  backgroundColor: 'var(--eds-color-bg-surface-soft)',
};

const LoginTable: React.FC = () => {
  const [allUsers, setAllUsers] = useState<LoginRow[]>([]);
  const [recentLogins, setRecentLogins] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'recent' | 'student' | 'lecturer' | 'mentor' | 'unverified'>('recent');
  const [verifiedUserIds, setVerifiedUserIds] = useState<Set<string>>(new Set());
  const [verifyingId, setVerifyingId] = useState<string | number | null>(null);
  const [verifyingAll, setVerifyingAll] = useState(false);

  const getDisplayRole = (user: { role?: string; designation?: string }) => {
    const r = (user.role || '').toLowerCase();
    const d = (user.designation || '').toLowerCase();

    if (r === 'lecturer' || r === 'supervisor' || r === 'coordinator') {
      if (d === 'coordinator' || d.includes('coordinator')) {
        return 'Coordinator';
      }
      if (d === 'supervisor' || d.includes('supervisor')) {
        return 'Supervisor';
      }
      if (r === 'coordinator') return 'Coordinator';
      if (r === 'supervisor') return 'Supervisor';
      return 'Supervisor';
    }

    if (r === 'admin') return 'Admin';
    if (r === 'student') return 'Student';
    if (r === 'mentor') return 'Industry Mentor';

    return user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User';
  };

  const getRoleColor = (roleStr: string) => {
    switch (roleStr.toLowerCase()) {
      case 'admin': return '#e11d48'; 
      case 'student': return 'var(--eds-color-primary)'; 
      case 'coordinator': return 'var(--eds-color-success-solid)'; 
      case 'supervisor': return '#7c3aed'; 
      case 'lecturer': return '#7c3aed';
      case 'mentor': 
      case 'industry mentor': return '#d97706';
      default: return 'var(--eds-color-text-muted)';
    }
  };

  const renderActionBadge = (login: LoginRow) => {
    const act = (login.lastAction || '').toLowerCase();
    
    if (act.includes('milestone') || act.includes('submitted')) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#047857',
          backgroundColor: '#ecfdf5',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #d1fae5'
        }}>
          <FileCheck2 size={12} color="#059669" />
          {login.lastAction}
        </span>
      );
    }

    if (act.includes('graded') || act.includes('evaluated') || act.includes('marks')) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#6d28d9',
          backgroundColor: '#f5f3ff',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #ede9fe'
        }}>
          <Award size={12} color="#7c3aed" />
          {login.lastAction}
        </span>
      );
    }

    if (act.includes('group') || act.includes('joined')) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#1d4ed8',
          backgroundColor: '#eff6ff',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #dbeafe'
        }}>
          <Users size={12} color="#2563eb" />
          {login.lastAction}
        </span>
      );
    }

    if (act.includes('announcement')) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#b45309',
          backgroundColor: '#fffbeb',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #fef3c7'
        }}>
          <Bell size={12} color="#d97706" />
          {login.lastAction}
        </span>
      );
    }

    if (act.includes('chat') || act.includes('message')) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#0e7490',
          backgroundColor: '#ecfeff',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #cffafe'
        }}>
          <MessageSquare size={12} color="#0891b2" />
          {login.lastAction}
        </span>
      );
    }

    if (act.includes('logged') || login.isOnline) {
      return (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#0369a1',
          backgroundColor: '#f0f9ff',
          padding: '2px 8px',
          borderRadius: '5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          width: 'fit-content',
          border: '1px solid #e0f2fe'
        }}>
          <LogIn size={12} color="#0284c7" />
          {login.lastAction || 'Logged In to Portal'}
        </span>
      );
    }

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#64748b',
        backgroundColor: '#f8fafc',
        padding: '2px 8px',
        borderRadius: '5px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        width: 'fit-content',
        border: '1px solid #e2e8f0'
      }}>
        <UserCheck size={12} color="#64748b" />
        {login.lastAction || 'Enrolled User'}
      </span>
    );
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
          designation: r.designation,
          time: r.time || new Date().toISOString(),
          lastAction: 'Logged In to Portal',
          isOnline: true,
          isVerified: true,
        })) : [];
        setRecentLogins(mappedRecent);

        const checkVerification = (u: any): boolean => {
          if (u.is_verified !== undefined && u.is_verified !== null) {
            return u.is_verified === 1 || u.is_verified === true || u.is_verified === '1';
          }
          if (u.isVerified !== undefined && u.isVerified !== null) {
            return u.isVerified === 1 || u.isVerified === true || u.isVerified === '1';
          }
          if (u.is_verify !== undefined && u.is_verify !== null) {
            return u.is_verify === 1 || u.is_verify === true || u.is_verify === '1';
          }
          return Boolean(u.email && u.email.trim().length > 0);
        };

        // 2. Fetch all user cohorts (first try direct full list, then fallback to parallel role queries)
        let combinedCohort: LoginRow[] = [];
        let allDbUsers: any[] = [];

        try {
          const allRes = await fetch('http://localhost:5000/api/users').catch(() => null);
          if (allRes && allRes.ok) {
            const parsed = await allRes.json();
            if (Array.isArray(parsed) && parsed.length > 0) {
              allDbUsers = parsed;
            }
          }
        } catch {
          // ignore fallback
        }

        const isValidDirectoryUser = (u: any): boolean => {
          const r = (u.role || '').toLowerCase().trim();
          // Exclude legacy records where role === 'supervisor' or 'coordinator' directly
          if (r === 'supervisor' || r === 'coordinator') return false;
          // Valid system roles: student, lecturer, mentor, admin
          if (!['student', 'lecturer', 'mentor', 'admin'].includes(r)) return false;
          // If lecturer, must have valid designation (supervisor or coordinator)
          if (r === 'lecturer' && (!u.designation || u.designation === null || String(u.designation).trim() === '' || u.designation === 'null')) {
            return false;
          }
          return true;
        };

        if (allDbUsers.length > 0) {
          combinedCohort = allDbUsers
            .filter(isValidDirectoryUser)
            .map((u: any) => ({
              id: u.id,
              username: u.name || u.username || (u.role ? `${u.role.charAt(0).toUpperCase() + u.role.slice(1)} User` : 'User'),
              email: u.email || u.user_email || u.userEmail || u.mail || '',
              role: u.role || 'user',
              designation: u.designation,
              time: u.last_action_time || u.last_login || u.created_at || u.updated_at || new Date().toISOString(),
              lastAction: u.last_action || (u.last_login ? 'Logged In to Portal' : 'Enrolled User'),
              isOnline: Boolean(u.has_logged_in || u.last_login),
              isVerified: checkVerification(u),
            }));
        } else {
          const [studentRes, lecturerRes, mentorRes, adminRes] = await Promise.all([
            fetch('http://localhost:5000/api/users?role=student').catch(() => null),
            fetch('http://localhost:5000/api/users?role=lecturer').catch(() => null),
            fetch('http://localhost:5000/api/users?role=mentor').catch(() => null),
            fetch('http://localhost:5000/api/users?role=admin').catch(() => null),
          ]);

          const students = studentRes && studentRes.ok ? await studentRes.json() : [];
          const lecturers = lecturerRes && lecturerRes.ok ? await lecturerRes.json() : [];
          const mentors = mentorRes && mentorRes.ok ? await mentorRes.json() : [];
          const admins = adminRes && adminRes.ok ? await adminRes.json() : [];

          const studentList = Array.isArray(students) ? students : (students.data || []);
          const lecturerList = Array.isArray(lecturers) ? lecturers : (lecturers.data || []);
          const mentorList = Array.isArray(mentors) ? mentors : (mentors.data || []);
          const adminList = Array.isArray(admins) ? admins : (admins.data || []);

          combinedCohort = [
            ...studentList.map((u: any) => ({
              id: u.id,
              username: u.name || u.username || 'Student User',
              email: u.email || u.user_email || u.userEmail || u.mail || '',
              role: 'student',
              time: u.last_action_time || u.last_login || u.created_at || u.updated_at || new Date().toISOString(),
              lastAction: u.last_action || (u.last_login ? 'Logged In to Portal' : 'Enrolled User'),
              isOnline: Boolean(u.has_logged_in || u.last_login),
              isVerified: checkVerification(u),
            })),
            ...lecturerList
              .filter((u: any) => u.designation && u.designation !== null && String(u.designation).trim().length > 0 && String(u.designation).trim() !== 'null')
              .map((u: any) => ({
                id: u.id,
                username: u.name || u.username || 'Lecturer User',
                email: u.email || u.user_email || u.userEmail || u.mail || '',
                role: 'lecturer',
                designation: u.designation,
                time: u.last_action_time || u.last_login || u.created_at || u.updated_at || new Date().toISOString(),
                lastAction: u.last_action || (u.last_login ? 'Logged In to Portal' : 'Enrolled User'),
                isOnline: Boolean(u.has_logged_in || u.last_login),
                isVerified: checkVerification(u),
              })),
            ...mentorList.map((u: any) => ({
              id: u.id,
              username: u.name || u.username || 'Mentor User',
              email: u.email || u.user_email || u.userEmail || u.mail || '',
              role: 'mentor',
              time: u.last_action_time || u.last_login || u.created_at || u.updated_at || new Date().toISOString(),
              lastAction: u.last_action || (u.last_login ? 'Logged In to Portal' : 'Enrolled User'),
              isOnline: Boolean(u.has_logged_in || u.last_login),
              isVerified: checkVerification(u),
            })),
            ...adminList.map((u: any) => ({
              id: u.id,
              username: u.name || u.username || 'Admin User',
              email: u.email || u.user_email || u.userEmail || u.mail || '',
              role: 'admin',
              time: u.last_action_time || u.last_login || u.created_at || u.updated_at || new Date().toISOString(),
              lastAction: u.last_action || (u.last_login ? 'Logged In to Portal' : 'Enrolled User'),
              isOnline: Boolean(u.has_logged_in || u.last_login),
              isVerified: checkVerification(u),
            })),
          ].filter(isValidDirectoryUser);
        }

        // Enrich recent logins with exact email, role, and designation matched from registered database cohort
        const enrichedRecent: LoginRow[] = mappedRecent.map((r) => {
          const match = combinedCohort.find(
            (c) => 
              (r.id && c.id && String(c.id) === String(r.id)) ||
              (c.email && r.email && c.email.toLowerCase().trim() === r.email.toLowerCase().trim()) ||
              (c.username && r.username && c.username.toLowerCase().trim() === r.username.toLowerCase().trim())
          );
          return {
            ...r,
            id: match?.id || r.id,
            email: match?.email || r.email || '',
            role: match?.role || r.role,
            designation: match?.designation || r.designation,
            lastAction: match?.lastAction || 'Logged In to Portal',
            isVerified: match ? match.isVerified : true,
          };
        }).filter((r) => r.role.toLowerCase() !== 'supervisor' && r.role.toLowerCase() !== 'coordinator');
        setRecentLogins(enrichedRecent);

        // Merge: all users from database cohort with active online recent logins overlay keyed by UNIQUE ID
        const mergedMap = new Map<string, LoginRow>();
        
        combinedCohort.forEach((u) => {
          const key = String(u.id || u.email || u.username);
          mergedMap.set(key, u);
        });

        enrichedRecent.forEach((r) => {
          const matchKey = Array.from(mergedMap.keys()).find((k) => {
            const existing = mergedMap.get(k);
            return existing && (
              (r.id && existing.id && String(r.id) === String(existing.id)) ||
              (r.username && existing.username && r.username.toLowerCase().trim() === existing.username.toLowerCase().trim()) ||
              (r.email && existing.email && r.email.toLowerCase().trim() === existing.email.toLowerCase().trim())
            );
          });

          if (matchKey && mergedMap.has(matchKey)) {
            const existing = mergedMap.get(matchKey)!;
            mergedMap.set(matchKey, {
              ...existing,
              time: r.time || existing.time,
              lastAction: existing.lastAction || 'Logged In to Portal',
              isOnline: true,
              email: existing.email || r.email || '',
              isVerified: existing.isVerified !== undefined ? existing.isVerified : true,
            });
          } else if (r.role.toLowerCase() !== 'supervisor' && r.role.toLowerCase() !== 'coordinator') {
            const key = String(r.id || r.email || r.username);
            mergedMap.set(key, r);
          }
        });

        setAllUsers(Array.from(mergedMap.values()).filter((u) => u.role.toLowerCase() !== 'supervisor' && u.role.toLowerCase() !== 'coordinator'));
      } catch (err) {
        console.error('Error fetching users directory:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllDirectoryData();
  }, []);

  const isUserVerified = (login: LoginRow): boolean => {
    const key = String(login.id || login.username);
    if (verifiedUserIds.has(key)) return true;
    return login.isVerified === true;
  };

  const handleVerifyUser = async (user: LoginRow) => {
    if (!user.id) {
      const key = String(user.username);
      setVerifiedUserIds((prev) => new Set(prev).add(key));
      setAllUsers((prev) => prev.map((u) => u.username === user.username ? { ...u, isVerified: true } : u));
      return;
    }

    try {
      setVerifyingId(user.id);
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/verify`, {
        method: 'PUT',
      });
      if (res.ok) {
        const key = String(user.id);
        setVerifiedUserIds((prev) => new Set(prev).add(key));
        setAllUsers((prev) => prev.map((u) => (u.id && String(u.id) === String(user.id)) || u.username === user.username ? { ...u, isVerified: true } : u));
      }
    } catch (err) {
      console.error('Error verifying user:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAllUsers = async () => {
    try {
      setVerifyingAll(true);
      const res = await fetch('http://localhost:5000/api/users/verify-all', {
        method: 'PUT',
      });
      if (res.ok) {
        setAllUsers((prev) => prev.map((u) => ({ ...u, isVerified: true })));
        setVerifiedUserIds(new Set(allUsers.map((u) => String(u.id || u.username))));
      }
    } catch (err) {
      console.error('Error verifying all users:', err);
    } finally {
      setVerifyingAll(false);
    }
  };

  const studentCount = useMemo(() => allUsers.filter((u) => u.role.toLowerCase() === 'student' && isUserVerified(u)).length, [allUsers, verifiedUserIds]);
  const lecturerCount = useMemo(() => allUsers.filter((u) => u.role.toLowerCase() === 'lecturer' && isUserVerified(u)).length, [allUsers, verifiedUserIds]);
  const mentorCount = useMemo(() => allUsers.filter((u) => u.role.toLowerCase() === 'mentor' && isUserVerified(u)).length, [allUsers, verifiedUserIds]);

  const verifiedCount = useMemo(() => allUsers.filter((u) => isUserVerified(u)).length, [allUsers, verifiedUserIds]);
  const unverifiedCount = useMemo(() => allUsers.filter((u) => !isUserVerified(u)).length, [allUsers, verifiedUserIds]);

  const displayedLogins = useMemo(() => {
    // If there is an active search query, search through verified users
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return allUsers
        .filter((u) => isUserVerified(u))
        .filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            u.role.toLowerCase().includes(q) ||
            (u.designation && u.designation.toLowerCase().includes(q)) ||
            (u.id && String(u.id).includes(q))
        );
    }
        // Filter based on active tab
        if (activeFilter === 'recent') {
          return recentLogins.length > 0 ? recentLogins : allUsers.filter((u) => isUserVerified(u)).slice(0, 10);
        }
        if (activeFilter === 'student') {
          return allUsers.filter((u) => u.role.toLowerCase() === 'student' && isUserVerified(u));
        }
        if (activeFilter === 'lecturer') {
          return allUsers.filter((u) => u.role.toLowerCase() === 'lecturer' && isUserVerified(u));
        }
        if (activeFilter === 'mentor') {
          return allUsers.filter((u) => u.role.toLowerCase() === 'mentor' && isUserVerified(u));
        }
        if (activeFilter === 'unverified') {
          return allUsers.filter((u) => !isUserVerified(u));
        }
        return recentLogins;
      }, [allUsers, recentLogins, searchQuery, activeFilter, verifiedUserIds]);

  return (
    <div style={{
      backgroundColor: 'var(--eds-color-bg-surface)',
      marginTop: '32px',
      borderRadius: '14px',
      border: '1px solid var(--eds-color-border)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      width: '100%',
    }}>
      
      {/* Title Header: Clean White with Search Box */}
      <div style={{ 
        padding: '18px 24px', 
        borderBottom: '1px solid var(--eds-color-border-soft)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        backgroundColor: 'var(--eds-color-bg-surface)'
      }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--eds-color-text-strong)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--eds-color-primary)" />
            System Users Directory & Security Management
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live Full-System Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--eds-color-bg-surface-soft)',
            border: '1px solid var(--eds-color-border)',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '280px',
          }}>
            <Search size={14} color="var(--eds-color-text-muted)" />
            <input
              type="text"
              placeholder="Search all users by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: 'var(--eds-color-text-strong)',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--eds-color-text-muted)',
                  fontSize: '12px',
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

      {/* Security Audit Overview Bar (KPI Summary Strip) */}
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
          onClick={() => setActiveFilter('recent')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#eff6ff', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Registered</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{allUsers.length} <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Accounts</span></div>
          </div>
        </div>

        {/* Online Active KPI */}
        <div 
          onClick={() => setActiveFilter('recent')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#ecfdf5', color: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Recent Logins</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>{recentLogins.length} <span style={{ fontSize: '11px', fontWeight: '600', color: '#047857' }}>Logins</span></div>
          </div>
        </div>

        {/* Verified KPI */}
        <div 
          onClick={() => setActiveFilter('student')}
          style={{
            backgroundColor: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#f0fdf4', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Verified Users</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>{verifiedCount} <span style={{ fontSize: '11px', fontWeight: '600', color: '#15803d' }}>Secure</span></div>
          </div>
        </div>

        {/* Unverified / Needs Review KPI */}
        <div 
          onClick={() => setActiveFilter('unverified')}
          style={{
            backgroundColor: unverifiedCount > 0 ? '#fffbeb' : '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            border: unverifiedCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#fef3c7', color: '#d97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldAlert size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '700', textTransform: 'uppercase' }}>Unverified Accounts</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#b45309' }}>{unverifiedCount} <span style={{ fontSize: '11px', fontWeight: '600', color: '#92400e' }}>Pending</span></div>
          </div>
        </div>
      </div>

      {/* Cohort Filter Tabs */}
      {!searchQuery && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 24px',
          backgroundColor: 'var(--eds-color-bg-surface-soft)',
          borderBottom: '1px solid var(--eds-color-border-soft)',
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
              backgroundColor: activeFilter === 'recent' ? 'var(--eds-color-primary)' : 'var(--eds-color-border-soft)',
              color: activeFilter === 'recent' ? 'var(--eds-color-bg-surface)' : 'var(--eds-color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={13} />
            Recent Logins ({recentLogins.length})
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
              backgroundColor: activeFilter === 'student' ? 'var(--eds-color-primary)' : 'var(--eds-color-border-soft)',
              color: activeFilter === 'student' ? 'var(--eds-color-bg-surface)' : 'var(--eds-color-text-muted)',
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
              backgroundColor: activeFilter === 'lecturer' ? 'var(--eds-color-primary)' : 'var(--eds-color-border-soft)',
              color: activeFilter === 'lecturer' ? 'var(--eds-color-bg-surface)' : 'var(--eds-color-text-muted)',
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
              backgroundColor: activeFilter === 'mentor' ? 'var(--eds-color-primary)' : 'var(--eds-color-border-soft)',
              color: activeFilter === 'mentor' ? 'var(--eds-color-bg-surface)' : 'var(--eds-color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            Industry Mentors ({mentorCount})
          </button>

          {/* Unverified Accounts Filter Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('unverified')}
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
              backgroundColor: activeFilter === 'unverified' ? '#d97706' : '#fef3c7',
              color: activeFilter === 'unverified' ? '#ffffff' : '#92400e',
              transition: 'all 0.15s ease',
              marginLeft: 'auto',
            }}
          >
            <Clock size={13} />
            Unverified Accounts ({unverifiedCount})
          </button>
        </div>
      )}

      {/* Bulk Verification Notification Banner */}
      {activeFilter === 'unverified' && unverifiedCount > 0 && !searchQuery && (
        <div style={{
          padding: '10px 24px',
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#92400e',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <ShieldAlert size={15} color="#d97706" />
            <span>There are <strong>{unverifiedCount}</strong> unverified accounts waiting for administrative verification.</span>
          </div>
          <button
            type="button"
            onClick={handleVerifyAllUsers}
            disabled={verifyingAll}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: verifyingAll ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: verifyingAll ? 0.7 : 1,
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <CheckCircle2 size={13} />
            {verifyingAll ? 'Verifying All...' : 'Verify All Accounts'}
          </button>
        </div>
      )}

      {/* Search Result Counter */}
      {searchQuery && (
        <div style={{ padding: '8px 24px', backgroundColor: 'var(--eds-color-primary-soft)', borderBottom: '1px solid var(--eds-color-primary-soft-border)', fontSize: '12px', color: 'var(--eds-color-primary-hover)', fontWeight: '600' }}>
          Showing {displayedLogins.length} user{displayedLogins.length !== 1 ? 's' : ''} matching "{searchQuery}" across entire university database:
        </div>
      )}

      <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={columnHeaderStyle}>User Identity</th>
              <th style={columnHeaderStyle}>Security Role</th>
              <th style={columnHeaderStyle}>{activeFilter === 'recent' ? 'Last Login' : 'Activity & Last Active'}</th>
              {activeFilter === 'unverified' && (
                <th style={columnHeaderStyle}>Status</th>
              )}
              {activeFilter === 'unverified' && (
                <th style={{ ...columnHeaderStyle, textAlign: 'right' }}>Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={activeFilter === 'unverified' ? 5 : 3} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Syncing users directory from server...</td></tr>
            ) : displayedLogins.length === 0 ? (
              <tr><td colSpan={activeFilter === 'unverified' ? 5 : 3} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>No users match the selected filter.</td></tr>
            ) : (
              displayedLogins.map((login, index) => {
                return (
                  <tr 
                    key={`${login.id || index}-${login.username}`} 
                    className="pro-table-row" 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc' 
                    }}
                  >
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px', 
                          backgroundColor: '#f1f5f9', 
                          color: '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '12px', 
                          border: '1px solid #e2e8f0',
                          flexShrink: 0,
                        }}>
                          {login.username ? login.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {login.username}
                          </div>
                          <div style={{ fontSize: '11px', color: login.email ? '#64748b' : '#94a3b8' }}>
                            {login.email || 'No email registered'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '7px', height: '7px', borderRadius: '50%', 
                          backgroundColor: getRoleColor(getDisplayRole(login)) 
                        }} />
                        <span style={{ color: '#475569', fontWeight: '600', fontSize: '12px' }}>
                          {getDisplayRole(login)}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 24px', fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* Activity / Action Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {renderActionBadge(login)}
                        </div>

                        {/* Last Active Timestamp */}
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} color="#94a3b8" />
                          <span>
                            {login.time && !isNaN(new Date(login.time).getTime()) ? (
                              new Date(login.time).toLocaleString('en-GB', { 
                                timeZone: 'Asia/Colombo',
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true 
                              })
                            ) : (
                              'Enrolled User'
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge (Shown only in Unverified Accounts tab) */}
                    {activeFilter === 'unverified' && (
                      <td style={{ padding: '12px 24px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                          Unverified
                        </div>
                      </td>
                    )}

                    {/* Action Button (Shown only in Unverified Accounts tab) */}
                    {activeFilter === 'unverified' && (
                      <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleVerifyUser(login)}
                          disabled={verifyingId === login.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: verifyingId === login.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (verifyingId !== login.id) {
                              e.currentTarget.style.backgroundColor = '#059669';
                              e.currentTarget.style.color = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (verifyingId !== login.id) {
                              e.currentTarget.style.backgroundColor = '#ecfdf5';
                              e.currentTarget.style.color = '#047857';
                            }
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {verifyingId === login.id ? 'Verifying...' : 'Verify User'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .pro-table-row { transition: background-color 0.1s ease; }
        .pro-table-row:hover { background-color: var(--eds-color-primary-soft) !important; }
        
        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: var(--eds-color-success-solid);
          border-radius: 50%;
          position: relative;
        }

        .pulse-dot::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: var(--eds-color-success-solid);
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