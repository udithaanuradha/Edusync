import React, { useEffect, useMemo, useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  Users, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  X, 
  GraduationCap
} from "lucide-react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorMeetingRequest from "../../components/student/SupervisorMeetingRequest";
import { useAuth } from "../../context/AuthContext";
import "../CalendarPage.css";

interface ScheduledPanel {
  id: string;
  title: string;
  level: number;
  groupId: number | string;
  groupName: string;
  date: string;
  time: string;
  duration: string;
  evaluators: string[];
  supervisors: string[];
  location: string;
  meetingLink: string;
  notes: string;
  kind: string;
  department?: string;
  status?: string;
}

interface FrozenDateRecord {
  date: string;
  reason: string;
}

interface AwarenessSession {
  id: number;
  title: string;
  description: string;
  target_levels: string;
  degree_program?: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  session_type: "online" | "physical" | "hybrid";
  venue: string | null;
  meeting_link: string | null;
  resource_person_name: string;
  resource_person_title: string | null;
  days_remaining: number;
  reminderBadge: string | null;
  reminderType: string;
  isToday: boolean;
  is2DaysAlert: boolean;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return new Date(NaN);
  const trimmed = String(value).trim();
  if (!trimmed) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(trimmed);
};

const formatShortDate = (value: string) => {
  const parsed = parseDateValue(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getLocalDateStr = (d: string | Date | null | undefined): string => {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return String(d).split("T")[0];
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime12h = (timeStr?: string | null): string => {
  if (!timeStr) return "";
  const trimmed = String(timeStr).trim();
  if (!trimmed) return "";
  if (/am|pm/i.test(trimmed)) return trimmed;

  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2).padStart(2, "0");
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHour = String(hours).padStart(2, "0");
      return `${formattedHour}:${minutes} ${ampm}`;
    }
  }
  return trimmed;
};

const normalizePanelFromApi = (row: Record<string, unknown>): ScheduledPanel => ({
  id: String(row.id ?? row.panel_id ?? `panel-${Date.now()}-${Math.random()}`),
  title: String(row.evaluation_type ?? row.title ?? "Evaluation Panel"),
  level: Number(row.academic_level ?? row.level ?? 1),
  groupId: String(
    row.target_group_id ?? row.group_id ?? row.target_group ?? row.groupName ?? ""
  ),
  groupName: String(row.target_group ?? row.group_name ?? row.groupName ?? "Group"),
  date:
    getLocalDateStr((row.panel_date ?? row.date) as string | Date | null | undefined) ||
    toDateValue(new Date()),
  time: String(row.start_time ?? row.time ?? "10:00"),
  duration: String(row.duration ?? "60 min"),
  evaluators: Array.isArray(row.evaluators)
    ? row.evaluators.map((item) => String(item ?? "")).filter(Boolean)
    : typeof row.evaluators === "string"
    ? JSON.parse(row.evaluators || "[]")
    : [],
  supervisors: Array.isArray(row.supervisors)
    ? row.supervisors.map((item) => String(item ?? "")).filter(Boolean)
    : typeof row.supervisors === "string"
    ? JSON.parse(row.supervisors || "[]")
    : [],
  location: String(row.location ?? "To be announced"),
  meetingLink: String(row.meeting_link ?? row.meetingLink ?? ""),
  notes: String(row.notes ?? ""),
  kind: String(row.kind ?? "Evaluation panel"),
  department: String(row.department ?? "ITM"),
  status: String(row.status ?? "scheduled"),
});

const StudentCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const userObj = user as any;
  const studentLevel = Number(userObj?.level) || 1;
  const studentDegree = userObj?.academic_unit || userObj?.degreeProgram || userObj?.department || "";

  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  const [scheduledPanels, setScheduledPanels] = useState<ScheduledPanel[]>([]);
  const [frozenDates, setFrozenDates] = useState<FrozenDateRecord[]>([]);
  const [awarenessSessions, setAwarenessSessions] = useState<AwarenessSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSessionModal, setSelectedSessionModal] = useState<AwarenessSession | null>(null);

  // Fetch Evaluation Panels for this student
  const loadPanels = async () => {
    try {
      if (!user?.id) return;
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/calendar/panels?studentId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setScheduledPanels(rows.map((row) => normalizePanelFromApi(row as Record<string, unknown>)));
      }
    } catch (err) {
      console.error("Failed to load student evaluation panels:", err);
    }
  };

  // Fetch Frozen Dates
  const loadFrozenDates = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:5000/api/calendar/frozen-dates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setFrozenDates(
          rows.map((r: any) => ({
            date: String(r.frozen_date ?? r.date ?? ""),
            reason: String(r.reason ?? ""),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load frozen dates:", err);
    }
  };

  // Fetch Awareness & Guidance Sessions for student's level & degree
  const loadAwarenessSessions = async () => {
    try {
      const degreeParam = studentDegree ? `&degree=${encodeURIComponent(studentDegree)}` : "";
      const res = await fetch(
        `http://localhost:5000/api/awareness-sessions?role=student&level=${studentLevel}${degreeParam}&upcomingOnly=true`
      );
      if (res.ok) {
        const payload = await res.json();
        setAwarenessSessions(payload.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load student awareness sessions:", err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([loadPanels(), loadFrozenDates(), loadAwarenessSessions()]);
      setLoading(false);
    };
    fetchAll();
  }, [user?.id, studentLevel, studentDegree]);

  const monthName = useMemo(() => {
    return viewDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewDate]);

  // Calendar Days Grid & Marker Calculation
  const { cells, markerMap } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayCells: Array<number | null> = [];
    for (let i = 0; i < firstDayIndex; i += 1) dayCells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) dayCells.push(d);
    while (dayCells.length % 7 !== 0) dayCells.push(null);

    interface DayMarker {
      day: number;
      panels: number;
      sessions: number;
      isFrozen: boolean;
      sessionTitles: string[];
    }

    const map = new Map<number, DayMarker>();

    // Mark evaluation panels
    scheduledPanels.forEach((panel) => {
      const pStatus = (panel.status || "").toLowerCase();
      if (pStatus === "completed") return;

      const pDate = parseDateValue(panel.date);
      if (pDate.getFullYear() === year && pDate.getMonth() === month) {
        const day = pDate.getDate();
        const existing = map.get(day) || { day, panels: 0, sessions: 0, isFrozen: false, sessionTitles: [] };
        existing.panels += 1;
        map.set(day, existing);
      }
    });

    // Mark frozen dates
    frozenDates.forEach((fd) => {
      const fDate = parseDateValue(fd.date);
      if (fDate.getFullYear() === year && fDate.getMonth() === month) {
        const day = fDate.getDate();
        const existing = map.get(day) || { day, panels: 0, sessions: 0, isFrozen: false, sessionTitles: [] };
        existing.isFrozen = true;
        map.set(day, existing);
      }
    });

    // Mark awareness & guidance sessions
    awarenessSessions.forEach((s) => {
      const sDate = parseDateValue(s.session_date);
      if (sDate.getFullYear() === year && sDate.getMonth() === month) {
        const day = sDate.getDate();
        const existing = map.get(day) || { day, panels: 0, sessions: 0, isFrozen: false, sessionTitles: [] };
        existing.sessions += 1;
        existing.sessionTitles.push(s.title);
        map.set(day, existing);
      }
    });

    return { cells: dayCells, markerMap: map };
  }, [viewDate, scheduledPanels, frozenDates, awarenessSessions]);

  // Filter panels based on selected day
  const displayedPanels = useMemo(() => {
    const active = scheduledPanels.filter((p) => (p.status || "").toLowerCase() !== "completed");
    if (!selectedCalendarDate) {
      return [...active].sort((a, b) => {
        const dateA = `${getLocalDateStr(a.date)} ${a.time || "00:00"}`;
        const dateB = `${getLocalDateStr(b.date)} ${b.time || "00:00"}`;
        return dateA.localeCompare(dateB);
      });
    }
    return active.filter((p) => getLocalDateStr(p.date) === selectedCalendarDate);
  }, [scheduledPanels, selectedCalendarDate]);

  // Filter awareness sessions based on selected day
  const displayedSessions = useMemo(() => {
    if (!selectedCalendarDate) {
      return awarenessSessions;
    }
    return awarenessSessions.filter((s) => s.session_date === selectedCalendarDate);
  }, [awarenessSessions, selectedCalendarDate]);

  const onDayClick = (day: number) => {
    const dateValue = toDateValue(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    if (selectedDayNumber === day) {
      setSelectedDayNumber(null);
      setSelectedCalendarDate(null);
    } else {
      setSelectedDayNumber(day);
      setSelectedCalendarDate(dateValue);
    }
  };

  const clearDateFilter = () => {
    setSelectedDayNumber(null);
    setSelectedCalendarDate(null);
  };

  return (
    <div
      className="app-layout calendar-shell"
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <div
        className="main-viewport"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Header />

        <main className="content-container">
          <div className="dashboard-content calendar-page-wrap">
            
            {/* Header row */}
            <div className="calendar-header-row">
              <div>
                <h2 className="calendar-page-title">Calendar</h2>
                <p className="calendar-page-subtitle">
                  Manage evaluation panels, frozen dates, and project schedules
                </p>
              </div>

              <div className="calendar-action-row">
                <SupervisorMeetingRequest levelNumber={studentLevel} />
              </div>
            </div>

            {/* Layout Grid: Left Calendar + Right Side Panels/Sessions */}
            <div className="calendar-layout-grid">
              
              {/* Main Calendar Card */}
              <section className="calendar-main-card" aria-label="Calendar grid">
                <div className="month-nav-row">
                  <button
                    type="button"
                    className="month-icon-btn"
                    aria-label="Previous month"
                    onClick={() =>
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                    }
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <h3>{monthName}</h3>

                  <button
                    type="button"
                    className="month-icon-btn"
                    aria-label="Next month"
                    onClick={() =>
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="weekday-row">
                  {weekDays.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="month-grid">
                  {cells.map((day, idx) => {
                    if (!day) {
                      return <div key={`blank-${idx}`} className="day-cell day-cell-empty" />;
                    }

                    const marker = markerMap.get(day);
                    const isSelected = selectedDayNumber === day;

                    let dayClass = "day-cell clickable-day";
                    if (isSelected) dayClass += " selected-day";
                    if (marker?.isFrozen) dayClass += " marker-frozen";
                    else if (marker?.panels) dayClass += " marker-panel";

                    return (
                      <button
                        key={day}
                        type="button"
                        className={dayClass}
                        onClick={() => onDayClick(day)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: "92px",
                          padding: "8px",
                        }}
                      >
                        <span className="day-number" style={{ fontSize: "16px", fontWeight: 700 }}>
                          {day}
                        </span>

                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
                          {/* Panel Pill */}
                          {marker && marker.panels > 0 && (
                            <span
                              className="panel-count"
                              style={{
                                fontSize: "10.5px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#dcfce7",
                                color: "#15803d",
                                fontWeight: 700,
                                display: "inline-block",
                                textAlign: "center",
                              }}
                            >
                              {marker.panels} Panel{marker.panels > 1 ? "s" : ""}
                            </span>
                          )}

                          {/* Awareness Session Pill */}
                          {marker && marker.sessions > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                fontWeight: 700,
                                display: "inline-block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textAlign: "center",
                              }}
                              title={marker.sessionTitles.join(", ")}
                            >
                              {marker.sessions === 1 ? `🎓 ${marker.sessionTitles[0] || "Session"}` : `🎓 ${marker.sessions} Sessions`}
                            </span>
                          )}

                          {/* Frozen Pill */}
                          {marker?.isFrozen && (
                            <span
                              className="freeze-pill"
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                fontWeight: 700,
                                display: "inline-block",
                                textAlign: "center",
                              }}
                            >
                              Frozen
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="calendar-legend-row" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "14px" }}>
                  <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <span className="legend-swatch legend-panel" style={{ backgroundColor: "#22c55e", width: "10px", height: "10px", borderRadius: "50%" }} />
                    <span>Scheduled panel</span>
                  </div>
                  <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <span style={{ backgroundColor: "#2563eb", width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" }} />
                    <span>Guidance / Awareness session</span>
                  </div>
                  <div className="legend-item" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                    <span className="legend-swatch legend-frozen" style={{ backgroundColor: "#94a3b8", width: "10px", height: "10px", borderRadius: "50%" }} />
                    <span>Frozen date</span>
                  </div>
                </div>
              </section>

              {/* Right Side Card: Upcoming Panels + Upcoming Sessions */}
              <aside className="calendar-right-card" aria-label="Student schedule panels and sessions" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* SECTION 1: UPCOMING PANELS */}
                <div>
                  <div className="calendar-side-header" style={{ marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Upcoming Panels
                      </h3>
                      {selectedCalendarDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <span style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 600 }}>
                            {formatShortDate(selectedCalendarDate)}
                          </span>
                          <button
                            type="button"
                            className="clear-filter-chip"
                            onClick={clearDateFilter}
                            style={{
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "none",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            Show All
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="calendar-side-count">{displayedPanels.length}</span>
                  </div>

                  <div className="upcoming-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {displayedPanels.length === 0 ? (
                      <div className="empty-state-card" style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                        <strong>No upcoming panels</strong>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>No evaluation panels scheduled for this date.</p>
                      </div>
                    ) : (
                      displayedPanels.map((panel) => {
                        const panelSupervisors = panel.supervisors || [];
                        const supervisorNamesLower = new Set(panelSupervisors.map((name) => name.toLowerCase()));
                        const externalEvaluators = (panel.evaluators || []).filter(
                          (name) => !supervisorNamesLower.has(name.toLowerCase())
                        );

                        return (
                          <article key={panel.id} className="upcoming-item" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", background: "#fff" }}>
                            <div className="upcoming-item-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div className="upcoming-item-titleblock">
                                <span className="upcoming-item-group" style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                                  {panel.groupName}
                                </span>
                                <div className="upcoming-item-badges" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      backgroundColor: (panel.department || "ITM").toUpperCase() === "AI" ? "#f3e8ff" : (panel.department || "ITM").toUpperCase() === "IT" ? "#e0f2fe" : "#fef3c7",
                                      color: (panel.department || "ITM").toUpperCase() === "AI" ? "#6b21a8" : (panel.department || "ITM").toUpperCase() === "IT" ? "#0369a1" : "#92400e",
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {panel.department || "ITM"}
                                  </span>
                                  <span className="upcoming-level-pill" style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: 700 }}>
                                    Level {panel.level}
                                  </span>
                                  <span className="upcoming-stage-pill" style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                                    {panel.title}
                                  </span>
                                </div>
                              </div>
                              <div className="upcoming-date-chip" style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "3px 6px", borderRadius: "6px" }}>
                                {formatShortDate(panel.date)}
                              </div>
                            </div>

                            <div className="upcoming-item-rows" style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#475569" }}>
                              <div className="upcoming-item-row" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={13} color="#2563eb" />
                                <span>{panel.time} ({panel.duration})</span>
                              </div>

                              {panel.meetingLink && (
                                <div className="upcoming-item-row" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Video size={13} color="#2563eb" />
                                  <a href={panel.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                                    Join Meeting
                                  </a>
                                </div>
                              )}

                              <div className="upcoming-item-row" style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <Users size={13} color="#64748b" style={{ marginTop: "2px" }} />
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                  {panelSupervisors.length > 0 && (
                                    <div><strong>Supervisor:</strong> {panelSupervisors.join(", ")}</div>
                                  )}
                                  {externalEvaluators.length > 0 && (
                                    <div><strong>Evaluators:</strong> {externalEvaluators.join(", ")}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* SECTION 2: UPCOMING GUIDANCE & AWARENESS SESSIONS */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  <div className="calendar-side-header" style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Upcoming Sessions
                      </h3>
                      <span style={{ fontSize: "11px", backgroundColor: "#eff6ff", color: "#2563eb", padding: "2px 7px", borderRadius: "10px", fontWeight: 700 }}>
                        Guidance
                      </span>
                    </div>
                    <span className="calendar-side-count" style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>
                      {displayedSessions.length}
                    </span>
                  </div>

                  <div className="upcoming-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {displayedSessions.length === 0 ? (
                      <div className="empty-state-card" style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                        <GraduationCap size={24} color="#cbd5e1" style={{ margin: "0 auto 6px auto" }} />
                        <strong>No awareness sessions</strong>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>No guidance sessions scheduled for this date.</p>
                      </div>
                    ) : (
                      displayedSessions.map((session) => (
                        <article
                          key={session.id}
                          style={{
                            border: `1px solid ${session.isToday ? "#fca5a5" : "#bfdbfe"}`,
                            borderLeft: `4px solid ${session.isToday ? "#ef4444" : "#2563eb"}`,
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <h4 style={{ margin: "0 0 3px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                                {session.title}
                              </h4>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    backgroundColor: "#eff6ff",
                                    color: "#2563eb",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Level {session.target_levels === "All" ? "All" : session.target_levels}
                                </span>
                                {session.degree_program && session.degree_program !== "All" && (
                                  <span
                                    style={{
                                      backgroundColor: "#f5f3ff",
                                      color: "#6d28d9",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {session.degree_program}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "3px 6px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                              {formatShortDate(session.session_date)}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#475569" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Clock size={13} color="#2563eb" />
                              <span>
                                {formatTime12h(session.start_time)}
                                {session.end_time ? ` - ${formatTime12h(session.end_time)}` : ""}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <User size={13} color="#2563eb" />
                              <span>{session.resource_person_name}</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {session.session_type === "online" ? (
                                <>
                                  <Video size={13} color="#2563eb" />
                                  <span>Online Zoom / Teams</span>
                                </>
                              ) : (
                                <>
                                  <MapPin size={13} color="#dc2626" />
                                  <span>{session.venue || "Campus Hall"}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedSessionModal(session)}
                              style={{
                                flex: 1,
                                padding: "6px 8px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#334155",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                              }}
                            >
                              <Info size={13} /> Details
                            </button>

                            {session.session_type === "online" && session.meeting_link && (
                              <a
                                href={session.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: session.isToday ? "#dc2626" : "#2563eb",
                                  color: "#ffffff",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "4px",
                                }}
                              >
                                <Video size={13} /> {session.isToday ? "Join Live" : "Meeting Link"}
                              </a>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>

              </aside>

            </div>

          </div>
        </main>
      </div>

      {/* Details Modal Popup for Awareness Session */}
      {selectedSessionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setSelectedSessionModal(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSessionModal(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span
                style={{
                  background: "#eff6ff",
                  color: "#2563eb",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                🎓 Awareness & Guidance
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Level {selectedSessionModal.target_levels === "All" ? "All" : selectedSessionModal.target_levels}
                {selectedSessionModal.degree_program && selectedSessionModal.degree_program !== "All"
                  ? ` | ${selectedSessionModal.degree_program}`
                  : ""}
              </span>
            </div>

            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
              {selectedSessionModal.title}
            </h3>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarIcon size={14} color="#2563eb" />
                <strong>Date:</strong> {selectedSessionModal.session_date}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={14} color="#2563eb" />
                <strong>Time:</strong> {formatTime12h(selectedSessionModal.start_time)}
                {selectedSessionModal.end_time ? ` - ${formatTime12h(selectedSessionModal.end_time)}` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={14} color="#2563eb" />
                <strong>Resource Person:</strong> {selectedSessionModal.resource_person_name}
                {selectedSessionModal.resource_person_title ? ` (${selectedSessionModal.resource_person_title})` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedSessionModal.session_type === "online" ? (
                  <>
                    <Video size={14} color="#2563eb" />
                    <strong>Mode:</strong> Online Zoom / Teams
                  </>
                ) : (
                  <>
                    <MapPin size={14} color="#dc2626" />
                    <strong>Venue:</strong> {selectedSessionModal.venue || "Campus Hall"}
                  </>
                )}
              </div>
            </div>

            <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              Agenda & Instructions:
            </h4>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 20px 0" }}>
              {selectedSessionModal.description}
            </p>

            {selectedSessionModal.session_type === "online" && selectedSessionModal.meeting_link && (
              <a
                href={selectedSessionModal.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <Video size={16} /> Open Meeting Link <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendarPage;
