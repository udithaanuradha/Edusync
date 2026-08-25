import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Layers,
  Users,
  AlertCircle,
  CalendarDays,
  Plus,
  X,
  ExternalLink,
  Search,
  FileText
} from 'lucide-react';
import './AdminDashboard.css';

interface StageEvent {
  stage_id: number;
  stage_name: string;
  deadline: string;
  academic_level: number;
  academic_unit?: string;
  description?: string;
  status?: string;
  creator_name?: string;
  file_count?: number;
}

interface EvaluationPanelEvent {
  id: string | number;
  group_name: string;
  evaluation_type: string;
  academic_level: number;
  panel_date: string;
  start_time?: string;
  duration?: string;
  evaluators?: string[] | string;
  location?: string;
}

interface FrozenDateEvent {
  date: string;
  reason: string;
}

const getDegreeNameFromAcademicUnit = (unit?: string): string => {
  if (!unit) return 'General';
  const u = unit.trim().toUpperCase();
  if (u === 'IDS' || u === 'ITM' || u.includes('INFORMATION TECHNOLOGY & MANAGEMENT') || u.includes('ITM')) return 'ITM';
  if (u === 'IT' || u.includes('INFORMATION TECHNOLOGY')) return 'IT';
  if (u === 'CM' || u === 'AI' || u.includes('COMPUTATIONAL') || u.includes('ARTIFICIAL INTELLIGENCE')) return 'AI';
  return u;
};

const getLevelColor = (level: number) => {
  switch (level) {
    case 1:
      return { bg: 'var(--eds-color-primary-soft)', border: 'var(--eds-color-primary-soft-border)', text: 'var(--eds-color-primary-hover)', solid: 'var(--eds-color-primary)', badge: 'var(--eds-color-primary-soft-border)' };
    case 2:
      return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', solid: '#7c3aed', badge: '#ede9fe' };
    case 3:
      return { bg: '#fffbeb', border: '#fde68a', text: 'var(--eds-color-warning-text)', solid: '#d97706', badge: 'var(--eds-color-warning-bg)' };
    case 4:
      return { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', solid: '#059669', badge: '#d1fae5' };
    default:
      return { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', solid: '#4b5563', badge: '#e5e7eb' };
  }
};

const parseDateString = (val?: string | null): Date | null => {
  if (!val) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateOnly = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatReadableDate = (val?: string | null): string => {
  const d = parseDateString(val);
  if (!d) return 'No date set';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getDaysRemainingText = (deadlineStr?: string) => {
  const d = parseDateString(deadlineStr);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { text: 'Due Today', isUrgent: true, isPast: false };
  if (diffDays === 1) return { text: 'Due Tomorrow', isUrgent: true, isPast: false };
  if (diffDays > 1) return { text: `In ${diffDays} days`, isUrgent: diffDays <= 7, isPast: false };
  return { text: `Overdue by ${Math.abs(diffDays)}d`, isUrgent: true, isPast: true };
};

const AdminCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [degreeFilter, setDegreeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [allStages, setAllStages] = useState<StageEvent[]>([]);
  const [evaluationPanels, setEvaluationPanels] = useState<EvaluationPanelEvent[]>([]);
  const [frozenDates, setFrozenDates] = useState<FrozenDateEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [showFreezeModal, setShowFreezeModal] = useState<boolean>(false);
  const [freezeDateInput, setFreezeDateInput] = useState<string>(formatDateOnly(new Date()));
  const [freezeReasonInput, setFreezeReasonInput] = useState<string>('');
  const [isSubmittingFreeze, setIsSubmittingFreeze] = useState<boolean>(false);

  const [selectedStageDetail, setSelectedStageDetail] = useState<StageEvent | null>(null);

  // Fetch all real academic data across Level 1 - 4
  const fetchAllAcademicData = async () => {
    try {
      setLoading(true);
      const levels = [1, 2, 3, 4];
      
      // 1. Fetch Stages for all 4 levels in parallel
      const stagePromises = levels.map(lvl =>
        fetch(`http://localhost:5000/api/projects/level/${lvl}`)
          .then(res => res.ok ? res.json() : [])
          .then(resData => {
            const list = Array.isArray(resData) ? resData : (resData?.data || []);
            return list.map((st: any) => ({
              stage_id: st.stage_id || st.id,
              stage_name: st.stage_name || st.name || 'Untitled Stage',
              deadline: st.deadline,
              academic_level: lvl,
              academic_unit: st.academic_unit,
              description: st.description || st.stage_description,
              status: st.status || 'Active',
              creator_name: st.creator_name,
              file_count: Array.isArray(st.files) ? st.files.length : (st.file_count || 0)
            }));
          })
          .catch(() => [])
      );

      // 2. Fetch Frozen Dates
      const frozenPromise = fetch('http://localhost:5000/api/calendar/frozen-dates')
        .then(res => res.ok ? res.json() : [])
        .then(resData => {
          const list = Array.isArray(resData) ? resData : (resData?.data || []);
          return list.map((f: any) => ({
            date: f.frozen_date || f.date,
            reason: f.reason || 'Faculty Holiday / Frozen'
          }));
        })
        .catch(() => []);

      // 3. Fetch Evaluation Panels
      const panelsPromise = fetch('http://localhost:5000/api/calendar/panels')
        .then(res => res.ok ? res.json() : [])
        .then(resData => {
          const list = Array.isArray(resData) ? resData : (resData?.data || []);
          return list.map((p: any) => ({
            id: p.id || p.panel_id,
            group_name: p.group_name || p.target_group || 'Evaluation Panel',
            evaluation_type: p.evaluation_type || p.title || 'Viva',
            academic_level: Number(p.academic_level || p.level || 1),
            panel_date: p.panel_date || p.date,
            start_time: p.start_time || p.time,
            duration: p.duration,
            evaluators: p.evaluators,
            location: p.location
          }));
        })
        .catch(() => []);

      const [stageResults, frozenResults, panelResults] = await Promise.all([
        Promise.all(stagePromises),
        frozenPromise,
        panelsPromise
      ]);

      const flattenedStages = stageResults.flat();
      setAllStages(flattenedStages);
      setFrozenDates(frozenResults);
      setEvaluationPanels(panelResults);
    } catch (err) {
      console.error('Failed to load academic master calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAcademicData();
  }, []);

  // Filtered lists based on user selections
  const filteredStages = useMemo(() => {
    return allStages.filter(stage => {
      if (levelFilter !== 'all' && String(stage.academic_level) !== levelFilter) return false;
      if (degreeFilter !== 'all') {
        const d = getDegreeNameFromAcademicUnit(stage.academic_unit);
        if (d !== degreeFilter) return false;
      }
      if (typeFilter === 'panels' || typeFilter === 'frozen') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = stage.stage_name.toLowerCase().includes(q);
        const matchUnit = (stage.academic_unit || '').toLowerCase().includes(q);
        if (!matchTitle && !matchUnit) return false;
      }
      return true;
    });
  }, [allStages, levelFilter, degreeFilter, typeFilter, searchQuery]);

  const filteredPanels = useMemo(() => {
    if (typeFilter === 'stages' || typeFilter === 'frozen') return [];
    return evaluationPanels.filter(p => {
      if (levelFilter !== 'all' && String(p.academic_level) !== levelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchGroup = p.group_name.toLowerCase().includes(q);
        const matchType = p.evaluation_type.toLowerCase().includes(q);
        if (!matchGroup && !matchType) return false;
      }
      return true;
    });
  }, [evaluationPanels, levelFilter, typeFilter, searchQuery]);

  const filteredFrozenDates = useMemo(() => {
    if (typeFilter === 'stages' || typeFilter === 'panels') return [];
    return frozenDates.filter(f => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!f.reason.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [frozenDates, typeFilter, searchQuery]);

  // Calendar Day Map
  const calendarDayEventsMap = useMemo(() => {
    const map = new Map<string, { stages: StageEvent[]; panels: EvaluationPanelEvent[]; frozen: FrozenDateEvent[] }>();

    filteredStages.forEach(s => {
      const d = parseDateString(s.deadline);
      if (!d) return;
      const key = formatDateOnly(d);
      const entry = map.get(key) || { stages: [], panels: [], frozen: [] };
      entry.stages.push(s);
      map.set(key, entry);
    });

    filteredPanels.forEach(p => {
      const d = parseDateString(p.panel_date);
      if (!d) return;
      const key = formatDateOnly(d);
      const entry = map.get(key) || { stages: [], panels: [], frozen: [] };
      entry.panels.push(p);
      map.set(key, entry);
    });

    filteredFrozenDates.forEach(f => {
      const d = parseDateString(f.date);
      if (!d) return;
      const key = formatDateOnly(d);
      const entry = map.get(key) || { stages: [], panels: [], frozen: [] };
      entry.frozen.push(f);
      map.set(key, entry);
    });

    return map;
  }, [filteredStages, filteredPanels, filteredFrozenDates]);

  // Navigation handlers
  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(formatDateOnly(today));
  };

  // Submit Faculty Frozen Date
  const handleCreateFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeDateInput || !freezeReasonInput.trim()) {
      alert('Please enter both date and reason.');
      return;
    }
    try {
      setIsSubmittingFreeze(true);
      const res = await fetch('http://localhost:5000/api/calendar/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frozen_date: freezeDateInput,
          reason: freezeReasonInput.trim(),
          type: 'faculty_frozen_day'
        })
      });
      if (res.ok) {
        setShowFreezeModal(false);
        setFreezeReasonInput('');
        await fetchAllAcademicData();
      } else {
        alert('Failed to freeze date.');
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setIsSubmittingFreeze(false);
    }
  };

  // Items to display on the Right Sidebar
  const selectedDayData = selectedDateStr ? calendarDayEventsMap.get(selectedDateStr) : null;

  const upcomingStagesSorted = useMemo(() => {
    return [...filteredStages].sort((a, b) => {
      const da = parseDateString(a.deadline)?.getTime() || 0;
      const db = parseDateString(b.deadline)?.getTime() || 0;
      return da - db;
    });
  }, [filteredStages]);

  // Calendar Calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayStr = formatDateOnly(new Date());

  // Metrics for Top Bar
  const activeStageCount = allStages.length;
  const upcomingDeadlineCount = allStages.filter(s => {
    const d = parseDateString(s.deadline);
    if (!d) return false;
    const diff = d.getTime() - new Date().getTime();
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const panelCount = evaluationPanels.length;
  const frozenCount = frozenDates.length;

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
      <Sidebar />
      <div className="main-viewport" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <Header />

        <main className="content-container" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* Header Title Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--eds-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--eds-color-text-strong)', margin: 0 }}>
                    Academic Master Calendar
                  </h2>
                  <p style={{ color: 'var(--eds-color-text-muted)', fontSize: '13.5px', margin: '3px 0 0 0' }}>
                    Cross-level project milestones, evaluation schedules, and faculty academic calendar
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowFreezeModal(true)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'var(--eds-color-danger-bg)',
                  color: 'var(--eds-color-danger-text)',
                  border: '1px solid var(--eds-color-danger-bg)',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--eds-color-danger-bg)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--eds-color-danger-bg)'}
              >
                <Plus size={16} />
                Freeze Faculty Date
              </button>
            </div>
          </div>

          {/* Metric Overview Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--eds-color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--eds-color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--eds-color-primary)' }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>{activeStageCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>Active Project Stages</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--eds-color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>{upcomingDeadlineCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>Deadlines in 30 Days</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--eds-color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>{panelCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>Evaluation Panels</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--eds-color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--eds-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--eds-color-danger-solid)' }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>{frozenCount}</div>
                <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)', fontWeight: '500' }}>Faculty Frozen Dates</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-muted)', marginRight: '4px' }}>
                <Filter size={16} /> Filters:
              </div>

              {/* Level Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--eds-color-text-muted)' }}>Level:</span>
                <select
                  value={levelFilter}
                  onChange={e => setLevelFilter(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '13px', backgroundColor: 'var(--eds-color-bg-surface-soft)', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Levels (1-4)</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                </select>
              </div>

              {/* Degree Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--eds-color-text-muted)' }}>Degree:</span>
                <select
                  value={degreeFilter}
                  onChange={e => setDegreeFilter(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '13px', backgroundColor: 'var(--eds-color-bg-surface-soft)', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Degrees</option>
                  <option value="IT">IT</option>
                  <option value="ITM">ITM</option>
                  <option value="AI">AI</option>
                </select>
              </div>

              {/* Event Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--eds-color-text-muted)' }}>Type:</span>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '13px', backgroundColor: 'var(--eds-color-bg-surface-soft)', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Events</option>
                  <option value="stages">Stage Deadlines Only</option>
                  <option value="panels">Evaluation Panels Only</option>
                  <option value="frozen">Frozen Dates Only</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--eds-color-text-faint)' }} />
              <input
                type="text"
                placeholder="Search milestone or group..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>

          {/* Main Calendar Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Calendar Box */}
            <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              
              {/* Calendar Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => changeMonth(-1)}
                    style={{ border: '1px solid var(--eds-color-border)', background: 'var(--eds-color-bg-surface-soft)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--eds-color-text-muted)' }}
                    title="Previous Month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    style={{ border: '1px solid var(--eds-color-border)', background: 'var(--eds-color-bg-surface-soft)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--eds-color-text-muted)' }}
                    title="Next Month"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={jumpToToday}
                    style={{ border: '1px solid var(--eds-color-border)', background: 'var(--eds-color-bg-surface)', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--eds-color-primary)' }}
                  >
                    Today
                  </button>
                </div>

                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                  {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
                </h3>

                {/* Level Color Legend */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--eds-color-primary-hover)', fontWeight: '600', backgroundColor: 'var(--eds-color-primary-soft)', padding: '2px 8px', borderRadius: '4px' }}>L1</span>
                  <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6d28d9', fontWeight: '600', backgroundColor: '#f5f3ff', padding: '2px 8px', borderRadius: '4px' }}>L2</span>
                  <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--eds-color-warning-text)', fontWeight: '600', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '4px' }}>L3</span>
                  <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: '600', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>L4</span>
                </div>
              </div>

              {/* Grid Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontWeight: '600', color: 'var(--eds-color-text-muted)', fontSize: '12px', padding: '6px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: '90px', backgroundColor: 'var(--eds-color-bg-surface-soft)', borderRadius: '10px', opacity: 0.3 }} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const curDate = new Date(year, month, dayNum);
                  const curDateStr = formatDateOnly(curDate);
                  const isToday = curDateStr === todayStr;
                  const isSelected = selectedDateStr === curDateStr;
                  const dayEvents = calendarDayEventsMap.get(curDateStr);

                  const hasStages = dayEvents && dayEvents.stages.length > 0;
                  const hasPanels = dayEvents && dayEvents.panels.length > 0;
                  const hasFrozen = dayEvents && dayEvents.frozen.length > 0;

                  return (
                    <div
                      key={dayNum}
                      onClick={() => setSelectedDateStr(isSelected ? null : curDateStr)}
                      style={{
                        border: isSelected
                          ? '2px solid var(--eds-color-primary)'
                          : isToday
                          ? '2px solid var(--eds-color-primary-soft-border)'
                          : '1px solid var(--eds-color-border-soft)',
                        borderRadius: '10px',
                        minHeight: '95px',
                        padding: '6px',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--eds-color-primary-soft)'
                          : hasFrozen
                          ? '#fff5f5'
                          : 'var(--eds-color-bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none'
                      }}
                      onMouseOver={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = hasFrozen ? 'var(--eds-color-danger-bg)' : 'var(--eds-color-bg-surface-soft)';
                      }}
                      onMouseOut={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = hasFrozen ? '#fff5f5' : 'var(--eds-color-bg-surface)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontWeight: isToday || isSelected ? '700' : '600',
                            fontSize: '13px',
                            color: isToday ? 'var(--eds-color-primary)' : 'var(--eds-color-text-body)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isToday ? 'var(--eds-color-primary-soft-border)' : 'transparent'
                          }}
                        >
                          {dayNum}
                        </span>

                        {hasFrozen && (
                          <span style={{ fontSize: '10px', color: 'var(--eds-color-danger-solid)', fontWeight: '700' }} title="Frozen Date">
                            ❄️
                          </span>
                        )}
                      </div>

                      {/* Event Badges inside Cell */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', overflow: 'hidden' }}>
                        {dayEvents?.frozen.map((fr, idx) => (
                          <div
                            key={`fr-${idx}`}
                            style={{
                              backgroundColor: 'var(--eds-color-danger-bg)',
                              color: 'var(--eds-color-danger-text)',
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={`Frozen: ${fr.reason}`}
                          >
                            ❄️ {fr.reason}
                          </div>
                        ))}

                        {dayEvents?.stages.slice(0, 2).map((st) => {
                          const clr = getLevelColor(st.academic_level);
                          const deg = getDegreeNameFromAcademicUnit(st.academic_unit);
                          return (
                            <div
                              key={st.stage_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStageDetail(st);
                              }}
                              style={{
                                backgroundColor: clr.bg,
                                color: clr.text,
                                border: `1px solid ${clr.border}`,
                                fontSize: '10px',
                                fontWeight: '600',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={`L${st.academic_level} [${deg}]: ${st.stage_name}`}
                            >
                              L{st.academic_level} • {st.stage_name}
                            </div>
                          );
                        })}

                        {dayEvents && dayEvents.stages.length > 2 && (
                          <div style={{ fontSize: '9.5px', color: 'var(--eds-color-text-muted)', fontWeight: '700', textAlign: 'center' }}>
                            +{dayEvents.stages.length - 2} more
                          </div>
                        )}

                        {dayEvents?.panels && dayEvents.panels.length > 0 && (
                          <div
                            style={{
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              fontSize: '9.5px',
                              fontWeight: '600',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}
                          >
                            👥 {dayEvents.panels.length} Panel{dayEvents.panels.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side Panel: Academic Milestones & Event Hub */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                      {selectedDateStr ? `Events for ${formatReadableDate(selectedDateStr)}` : 'Upcoming Milestones & Deadlines'}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                      {selectedDateStr ? 'Filtered by selected calendar date' : 'Sorted chronologically across levels'}
                    </p>
                  </div>

                  {selectedDateStr && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateStr(null)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--eds-color-border-soft)',
                        border: '1px solid var(--eds-color-border)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--eds-color-text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Show All
                    </button>
                  )}
                </div>

                {/* Selected Day View */}
                {selectedDateStr ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(!selectedDayData || (selectedDayData.stages.length === 0 && selectedDayData.panels.length === 0 && selectedDayData.frozen.length === 0)) ? (
                      <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--eds-color-text-faint)' }}>
                        <CalendarIcon size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--eds-color-text-muted)' }}>No events on this day</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Click another date or click "Show All".</div>
                      </div>
                    ) : (
                      <>
                        {/* Frozen Dates for Day */}
                        {selectedDayData.frozen.map((fr, i) => (
                          <div key={i} style={{ backgroundColor: 'var(--eds-color-danger-bg)', border: '1px solid var(--eds-color-danger-solid)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ fontSize: '18px' }}>❄️</div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--eds-color-danger-text)' }}>Faculty Frozen Day</div>
                              <div style={{ fontSize: '12.5px', color: 'var(--eds-color-danger-text)', marginTop: '2px' }}>{fr.reason}</div>
                            </div>
                          </div>
                        ))}

                        {/* Stages for Day */}
                        {selectedDayData.stages.map((st) => {
                          const clr = getLevelColor(st.academic_level);
                          const deg = getDegreeNameFromAcademicUnit(st.academic_unit);
                          return (
                            <div
                              key={st.stage_id}
                              style={{
                                backgroundColor: 'var(--eds-color-bg-surface)',
                                border: `1px solid ${clr.border}`,
                                borderLeft: `4px solid ${clr.solid}`,
                                borderRadius: '10px',
                                padding: '14px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <span style={{ backgroundColor: clr.badge, color: clr.text, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                                    Level {st.academic_level}
                                  </span>
                                  <span style={{ backgroundColor: 'var(--eds-color-border-soft)', color: 'var(--eds-color-text-muted)', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                                    {deg}
                                  </span>
                                </div>
                                <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--eds-color-danger-solid)', backgroundColor: 'var(--eds-color-danger-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                                  Deadline Today
                                </span>
                              </div>

                              <h4 style={{ margin: '0 0 6px 0', fontSize: '14.5px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                                {st.stage_name}
                              </h4>

                              {st.description && (
                                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: 'var(--eds-color-text-muted)', lineHeight: 1.4 }}>
                                  {st.description}
                                </p>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--eds-color-border-soft)' }}>
                                <span style={{ fontSize: '11.5px', color: 'var(--eds-color-text-muted)' }}>
                                  {st.creator_name ? `Coordinator: ${st.creator_name}` : 'Coordinator Stage'}
                                </span>
                                <button
                                  onClick={() => navigate(`/dashboard/level-${st.academic_level}`)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--eds-color-primary)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  Go to Level {st.academic_level} <ExternalLink size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Panels for Day */}
                        {selectedDayData.panels.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              backgroundColor: 'var(--eds-color-bg-surface)',
                              border: '1px solid #c7d2fe',
                              borderLeft: '4px solid #4f46e5',
                              borderRadius: '10px',
                              padding: '14px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                                Level {p.academic_level} • {p.evaluation_type}
                              </span>
                              {p.start_time && (
                                <span style={{ fontSize: '11.5px', color: '#4f46e5', fontWeight: '600' }}>
                                  ⏰ {p.start_time} {p.duration ? `(${p.duration})` : ''}
                                </span>
                              )}
                            </div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '14.5px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                              Group: {p.group_name}
                            </h4>
                            {p.location && (
                              <div style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                                📍 Location: {p.location}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  /* Chronological Upcoming List */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--eds-color-text-faint)' }}>
                        Loading academic deadlines...
                      </div>
                    ) : upcomingStagesSorted.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--eds-color-text-faint)' }}>
                        No upcoming deadlines match your filters.
                      </div>
                    ) : (
                      upcomingStagesSorted.map((st) => {
                        const clr = getLevelColor(st.academic_level);
                        const deg = getDegreeNameFromAcademicUnit(st.academic_unit);
                        const daysInfo = getDaysRemainingText(st.deadline);

                        return (
                          <div
                            key={st.stage_id}
                            onClick={() => setSelectedStageDetail(st)}
                            style={{
                              backgroundColor: 'var(--eds-color-bg-surface)',
                              border: `1px solid var(--eds-color-border)`,
                              borderLeft: `4px solid ${clr.solid}`,
                              borderRadius: '10px',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                            onMouseOver={e => e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)'}
                            onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ backgroundColor: clr.badge, color: clr.text, fontSize: '10.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px' }}>
                                  L{st.academic_level}
                                </span>
                                <span style={{ backgroundColor: 'var(--eds-color-border-soft)', color: 'var(--eds-color-text-muted)', fontSize: '10.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px' }}>
                                  {deg}
                                </span>
                              </div>

                              {daysInfo && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: daysInfo.isPast ? 'var(--eds-color-danger-text)' : daysInfo.isUrgent ? 'var(--eds-color-warning-text)' : 'var(--eds-color-success-text)',
                                    backgroundColor: daysInfo.isPast ? 'var(--eds-color-danger-bg)' : daysInfo.isUrgent ? 'var(--eds-color-warning-bg)' : 'var(--eds-color-success-bg)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {daysInfo.text}
                                </span>
                              )}
                            </div>

                            <h4 style={{ margin: '4px 0 6px 0', fontSize: '13.5px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                              {st.stage_name}
                            </h4>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--eds-color-text-muted)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> {formatReadableDate(st.deadline)}
                              </span>
                              {st.file_count && st.file_count > 0 ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--eds-color-primary)' }}>
                                  <FileText size={12} /> {st.file_count} doc{st.file_count > 1 ? 's' : ''}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* Freeze Faculty Date Modal */}
        {showFreezeModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--eds-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--eds-color-danger-solid)' }}>
                    <CalendarDays size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>Freeze Faculty Date</h3>
                </div>
                <X size={20} style={{ cursor: 'pointer', color: 'var(--eds-color-text-muted)' }} onClick={() => setShowFreezeModal(false)} />
              </div>

              <p style={{ fontSize: '13px', color: 'var(--eds-color-text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Freezing a date marks it university-wide (e.g. for study leave, public holiday, sports meet). Coordinators cannot schedule evaluation panels on frozen dates.
              </p>

              <form onSubmit={handleCreateFreeze}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-body)', marginBottom: '6px' }}>Date to Freeze</label>
                <input
                  type="date"
                  required
                  value={freezeDateInput}
                  onChange={e => setFreezeDateInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}
                />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-body)', marginBottom: '6px' }}>Reason / Occasion</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Faculty Sports Meet, Study Holiday, Semester Exam"
                  value={freezeReasonInput}
                  onChange={e => setFreezeReasonInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', marginBottom: '22px', boxSizing: 'border-box', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowFreezeModal(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', backgroundColor: 'var(--eds-color-bg-surface)', color: 'var(--eds-color-text-muted)', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFreeze}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--eds-color-danger-solid)', color: 'var(--eds-color-bg-surface)', fontWeight: '600', cursor: isSubmittingFreeze ? 'not-allowed' : 'pointer' }}
                  >
                    {isSubmittingFreeze ? 'Saving...' : 'Confirm Freeze'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stage Detail Drawer / Modal */}
        {selectedStageDetail && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ backgroundColor: getLevelColor(selectedStageDetail.academic_level).badge, color: getLevelColor(selectedStageDetail.academic_level).text, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                      Level {selectedStageDetail.academic_level}
                    </span>
                    <span style={{ backgroundColor: 'var(--eds-color-border-soft)', color: 'var(--eds-color-text-muted)', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                      {getDegreeNameFromAcademicUnit(selectedStageDetail.academic_unit)}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                    {selectedStageDetail.stage_name}
                  </h3>
                </div>
                <X size={20} style={{ cursor: 'pointer', color: 'var(--eds-color-text-muted)' }} onClick={() => setSelectedStageDetail(null)} />
              </div>

              <div style={{ backgroundColor: 'var(--eds-color-bg-surface-soft)', borderRadius: '10px', padding: '14px', border: '1px solid var(--eds-color-border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--eds-color-text-body)', fontSize: '13px', fontWeight: '600' }}>
                  <Clock size={16} color="var(--eds-color-primary)" />
                  Deadline: <span style={{ color: 'var(--eds-color-text-strong)' }}>{formatReadableDate(selectedStageDetail.deadline)}</span>
                </div>
              </div>

              {selectedStageDetail.description && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eds-color-text-muted)', textTransform: 'uppercase' }}>Description / Guidelines</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--eds-color-text-body)', lineHeight: 1.5, backgroundColor: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border-soft)', borderRadius: '8px', padding: '10px' }}>
                    {selectedStageDetail.description}
                  </p>
                </div>
              )}

              {selectedStageDetail.creator_name && (
                <div style={{ fontSize: '12.5px', color: 'var(--eds-color-text-muted)', marginBottom: '20px' }}>
                  <strong>Created by Coordinator:</strong> {selectedStageDetail.creator_name}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedStageDetail(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', backgroundColor: 'var(--eds-color-bg-surface)', color: 'var(--eds-color-text-muted)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lvl = selectedStageDetail.academic_level;
                    setSelectedStageDetail(null);
                    navigate(`/dashboard/level-${lvl}`);
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--eds-color-primary)', color: 'var(--eds-color-bg-surface)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  Manage Level {selectedStageDetail.academic_level} <ExternalLink size={14} />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminCalendarPage;