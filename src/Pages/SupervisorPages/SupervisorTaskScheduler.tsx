import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  X,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  History,
  ArrowRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./supervisorPartInCalendar.css";
import "./SupervisorTaskScheduler.css";

// Types
type TimeSlot = { start: string; end: string };
type WeeklySchedule = Record<string, TimeSlot[]>;

type CategoryType =
  | "Meeting"
  | "Faculty Work"
  | "Personal"
  | "Interim"
  | "Evaluation"
  | "Code Review"
  | "Final Evaluation"
  | "Group Meeting Request/Report Approve";

type Task = {
  id?: number;
  task_date: string;
  start_time: string;
  end_time: string;
  category: CategoryType;
  description: string;
};

const API_TASKS = "http://localhost:5000/api/supervisor-tasks";
const API_RECURRING = "http://localhost:5000/api/supervisorpartincalender";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const normalizeWeeklySchedule = (value: unknown): WeeklySchedule => {
  if (!value || typeof value !== "object") return {};

  if (Array.isArray(value)) {
    const formatted: WeeklySchedule = {};
    value.forEach((row: any) => {
      if (!row || typeof row !== "object") return;
      const day = row.day_of_week || row.day;
      if (day) {
        if (!formatted[day]) formatted[day] = [];
        formatted[day].push({
          start: (row.start_time || row.start || "08:00").substring(0, 5),
          end: (row.end_time || row.end || "10:00").substring(0, 5),
        });
      }
    });
    return formatted;
  }

  const payload = value as Record<string, unknown>;
  const formatted: WeeklySchedule = {};

  DAYS_OF_WEEK.forEach((day) => {
    const slots = Array.isArray(payload[day]) ? payload[day] : [];
    formatted[day] = slots
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;
        const s = slot as Record<string, unknown>;
        const start =
          typeof s.start === "string"
            ? s.start.substring(0, 5)
            : typeof s.start_time === "string"
              ? s.start_time.substring(0, 5)
              : "08:00";
        const end =
          typeof s.end === "string"
            ? s.end.substring(0, 5)
            : typeof s.end_time === "string"
              ? s.end_time.substring(0, 5)
              : "10:00";
        return { start, end };
      })
      .filter((slot): slot is TimeSlot => slot !== null);
  });

  return formatted;
};

// Date Helpers
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};
const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400000);
const formatDateStr = (d: Date) => {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

// Timeline Math (08:00 to 24:00 = 16 hours = 960 minutes)
const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};
const calculateStyle = (start: string, end: string) => {
  const startMins = Math.max(timeToMinutes(start), 480); // Clamp to 08:00
  let endMins = timeToMinutes(end);

  if (endMins <= startMins) {
    endMins += 720;
  }

  endMins = Math.min(endMins, 1440); // Clamp to 24:00

  const left = ((startMins - 480) / 960) * 100;
  const width = Math.max(((endMins - startMins) / 960) * 100, 2);

  return { left: `${left}%`, width: `${width}%` };
};

interface SupervisorTaskSchedulerProps {
  inline?: boolean;
}

const SupervisorTaskScheduler: React.FC<SupervisorTaskSchedulerProps> = ({
  inline = false,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const supervisorId = useMemo(() => {
    if (user?.id) return user.id;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.id ?? parsed.user_id ?? undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [user]);

  const [isOpen, setIsOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [recurring, setRecurring] = useState<WeeklySchedule>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  // Form State (for full drawer modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Task>({
    task_date: "",
    start_time: "09:00",
    end_time: "10:00",
    category: "Meeting",
    description: "",
  });

  const [studentRequests, setStudentRequests] = useState<any[]>([]);
  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | "">("");
  // Which list selectedRequestId came from — a meeting request (gets
  // scheduled into a calendar block on approval) or a meeting report (just
  // approved/rejected directly, nothing to schedule).
  const [selectedRequestKind, setSelectedRequestKind] = useState<"request" | "report" | "">("");
  const [supervisorMessage, setSupervisorMessage] = useState("");

  // "View History" panel — pick one of this supervisor's assigned groups,
  // then see that group's full meeting request + report history.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [assignedGroups, setAssignedGroups] = useState<{ groupId: number; groupName: string; level: number }[]>([]);
  const [historyGroupName, setHistoryGroupName] = useState("");
  const [historyData, setHistoryData] = useState<{ meetings: any[]; reports: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Which single request/report box (by "request-<id>" / "report-<id>") is
  // currently expanded to show its full details — topic-only otherwise.
  const [expandedHistoryKey, setExpandedHistoryKey] = useState<string | null>(null);

  // Automatically open the full scheduler drawer and modal if navigated with state flag or query param
  useEffect(() => {
    if (inline) return;
    const isSchedulerParam = new URLSearchParams(location.search).get("open") === "scheduler";
    const isMeetingParam = new URLSearchParams(location.search).get("open") === "meeting-requests";
    const isSchedulerState = location.state && (location.state as any).openTimelineScheduler;
    const isMeetingState = location.state && (location.state as any).openMeetingRequests;
    const isSchedulerStored = sessionStorage.getItem("openScheduler") === "true";
    const isMeetingStored = sessionStorage.getItem("openMeetingRequests") === "true";

    if (isSchedulerParam || isMeetingParam || isSchedulerState || isMeetingState || isSchedulerStored || isMeetingStored) {
      setIsOpen(true);
      sessionStorage.removeItem("openScheduler");

      if (isMeetingParam || isMeetingState || isMeetingStored) {
        sessionStorage.removeItem("openMeetingRequests");
        setIsFormOpen(true);
        setEditingTask(null);
        setFormData({
          task_date: formatDateStr(new Date()),
          start_time: "09:00",
          end_time: "10:00",
          category: "Group Meeting Request/Report Approve",
          description: "",
        });
      }
    }
  }, [inline, location.search, location.state]);

  const openFullScheduler = () => {
    sessionStorage.setItem("openScheduler", "true");
    navigate("/dashboard/calendar?open=scheduler", { state: { openTimelineScheduler: true } });
  };

  // Fetch Data
  const loadWeekData = async () => {
    if (!supervisorId) return;
    const startDate = formatDateStr(currentWeekStart);
    const endDate = formatDateStr(addDays(currentWeekStart, 6));

    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      // 1. Instantly load recurring lecture times from localStorage
      const stored = localStorage.getItem(`edusync.supervisor.lectureTimes.${supervisorId}`);
      if (stored) {
        try {
          setRecurring(normalizeWeeklySchedule(JSON.parse(stored)));
        } catch (e) {
          console.error("Local schedule parse error", e);
        }
      }

      // 2. Fetch Tasks
      const taskRes = await fetch(
        `${API_TASKS}/${supervisorId}?startDate=${startDate}&endDate=${endDate}`,
        { headers },
      );
      if (taskRes.ok) setTasks(await taskRes.json());

      // 3. Fetch Recurring Lectures (Bypass cache)
      const recRes = await fetch(
        `${API_RECURRING}/${supervisorId}?t=${Date.now()}`,
        { headers, cache: "no-store" },
      );
      if (recRes.ok) {
        const result = await recRes.json();
        const savedSchedule =
          result.data?.weeklySchedule ??
          result.data?.weekly_schedule ??
          result.weeklySchedule ??
          result.data ??
          result;

        if (savedSchedule) {
          const norm = normalizeWeeklySchedule(savedSchedule);
          setRecurring(norm);
          localStorage.setItem(
            `edusync.supervisor.lectureTimes.${supervisorId}`,
            JSON.stringify(norm),
          );
        }
      }

      // Fetch Student Requests
      const reqRes = await fetch(
        `http://localhost:5000/api/meeting-requests/supervisor/${supervisorId}`,
        { headers },
      );
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setStudentRequests(reqData.filter((r: any) => r.status === "pending"));
      }

      // Fetch Student Meeting Reports (pending review)
      const repRes = await fetch(
        `http://localhost:5000/api/meeting-reports/supervisor/${supervisorId}`,
        { headers },
      );
      if (repRes.ok) {
        const repData = await repRes.json();
        setStudentReports(repData.filter((r: any) => r.status === "pending"));
      }
    } catch (error) {
      console.error("Failed to load timeline scheduler data", error);
    }
  };

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart, supervisorId, isOpen]);

  useEffect(() => {
    const handleScheduleUpdate = (e: any) => {
      if (e?.detail) {
        setRecurring(normalizeWeeklySchedule(e.detail));
      }
      loadWeekData();
    };
    window.addEventListener("supervisorScheduleUpdated", handleScheduleUpdate);
    window.addEventListener("storage", handleScheduleUpdate);
    return () => {
      window.removeEventListener("supervisorScheduleUpdated", handleScheduleUpdate);
      window.removeEventListener("storage", handleScheduleUpdate);
    };
  }, [supervisorId, currentWeekStart]);

  // Generate Week Days
  const weekDays = useMemo(() => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return days.map((dayName, index) => {
      const date = addDays(currentWeekStart, index);
      const dayNum = date.getDate();
      const monthShort = date.toLocaleDateString("en-US", { month: "short" });
      return {
        dayName,
        dateStr: formatDateStr(date),
        display: `${monthShort} ${dayNum}`,
      };
    });
  }, [currentWeekStart]);

  const handleTrackClick = (dateStr: string) => {
    setEditingTask(null);
    setFormData({
      task_date: dateStr,
      start_time: "09:00",
      end_time: "10:00",
      category: "Meeting",
      description: "",
    });
    setSelectedRequestId(""); setSelectedRequestKind("");
    setIsFormOpen(true);
  };

  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    const d = new Date(task.task_date);
    const safeDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    setFormData({ ...task, task_date: safeDateStr });
    setSelectedRequestId(""); setSelectedRequestKind("");
    setIsFormOpen(true);
  };

  // Approving/rejecting a meeting REPORT never creates a calendar block —
  // the meeting already happened, this is just a review action — so it
  // bypasses the task-scheduling API entirely, unlike a request.
  const setReportStatus = async (status: "approved" | "rejected") => {
    if (selectedRequestId === "") return;
    try {
      const token = localStorage.getItem("token") || "auth_token";
      const res = await fetch(`http://localhost:5000/api/meeting-reports/${selectedRequestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, message: supervisorMessage })
      });
      if (res.ok) {
        setStudentReports(studentReports.filter((r: any) => r.id !== selectedRequestId));
        window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
        setIsFormOpen(false);
        setSupervisorMessage("");
        setSelectedRequestId("");
        setSelectedRequestKind("");
      }
    } catch (err) {
      console.error("Set report status error", err);
    }
  };

  const saveTask = async () => {
    if (!supervisorId) {
      alert("Unable to find Supervisor ID. Please re-login.");
      return;
    }

    // A meeting report has nothing to schedule — approving it is just
    // marking it approved, not creating a task block.
    if (selectedRequestKind === "report") {
      await setReportStatus("approved");
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      const url = editingTask?.id
        ? `${API_TASKS}/${supervisorId}/${editingTask.id}`
        : `${API_TASKS}/${supervisorId}`;
      const method = editingTask?.id ? "PUT" : "POST";

      let payload: any = formData;
      let reqDetails: any = null;

      if (formData.category === "Group Meeting Request/Report Approve" && selectedRequestKind === "request" && selectedRequestId !== "") {
        const req = studentRequests.find((r: any) => r.id === selectedRequestId);
        if (req) {
          reqDetails = req;
          payload = {
            ...formData,
            category: "Meeting",
            description: `Meeting with ${req.group_name || 'Group'}${formData.description ? ' - ' + formData.description : ''}`
          };
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (reqDetails && selectedRequestId !== "") {
          const token = localStorage.getItem("token") || "auth_token";
          await fetch(`http://localhost:5000/api/meeting-requests/${selectedRequestId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: 'approved', message: supervisorMessage || formData.description })
          });
          setStudentRequests(studentRequests.filter((r: any) => r.id !== selectedRequestId));
          window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
        }
        setIsFormOpen(false);
        setSupervisorMessage("");
        setSelectedRequestId("");
        setSelectedRequestKind("");
        loadWeekData();
      }
    } catch (error) {
      console.error("Save task error", error);
    }
  };

  const rejectRequest = async () => {
    if (selectedRequestId === "") return;

    if (selectedRequestKind === "report") {
      await setReportStatus("rejected");
      return;
    }

    try {
      const token = localStorage.getItem("token") || "auth_token";
      const res = await fetch(`http://localhost:5000/api/meeting-requests/${selectedRequestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'rejected', message: supervisorMessage })
      });
      if (res.ok) {
        setStudentRequests(studentRequests.filter((r: any) => r.id !== selectedRequestId));
        window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
        setIsFormOpen(false);
        setSupervisorMessage("");
        setSelectedRequestId("");
        setSelectedRequestKind("");
      }
    } catch (err) {
      console.error("Reject request error", err);
    }
  };

  // Every group this supervisor is actually assigned to (primary or second
  // supervisor), with its level — the "View History" picker's group list.
  // Same endpoint the dashboard/level pages use, so it already accounts for
  // supervisor_id_2. Fetched fresh each time the panel opens.
  const fetchAssignedGroups = async () => {
    if (!supervisorId) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/groupdetailstosupervisordashboard/supervisor/${supervisorId}`,
      );
      if (res.ok) {
        setAssignedGroups(await res.json());
      }
    } catch (err) {
      console.error("Failed to load assigned groups", err);
    }
  };

  // group_name on supervisor_student_meeting/meeting_reports is free text
  // typed by the student, so it's matched against the group's real name
  // rather than an id.
  const fetchGroupHistory = async (groupName: string) => {
    if (!groupName) return;
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await fetch(
        `http://localhost:5000/api/meeting-reports/group-history/${encodeURIComponent(groupName)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      if (res.ok) {
        setHistoryData(await res.json());
      }
    } catch (err) {
      console.error("Failed to load group history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryPanel = () => {
    setHistoryGroupName("");
    setHistoryData(null);
    setHistoryOpen(true);
    fetchAssignedGroups();
  };

  const selectHistoryGroup = (groupName: string) => {
    setHistoryGroupName(groupName);
    setExpandedHistoryKey(null);
    fetchGroupHistory(groupName);
  };

  // Same approved/rejected/pending color convention used throughout the
  // meeting request/report UI (green/red/amber).
  const renderHistoryStatusBadge = (status: string) => (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "capitalize",
        padding: "2px 8px",
        borderRadius: "12px",
        flexShrink: 0,
        backgroundColor:
          status === "approved"
            ? "var(--eds-color-success-solid)"
            : status === "rejected"
              ? "var(--eds-color-danger-solid)"
              : "#f59e0b",
        color: "var(--eds-color-bg-surface)",
      }}
    >
      {status}
    </span>
  );

  const deleteTask = async (taskId: number) => {
    if (!supervisorId) return;
    try {
      const res = await fetch(`${API_TASKS}/${supervisorId}/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setIsFormOpen(false);
        loadWeekData();
      }
    } catch (error) {
      console.error("Delete task error", error);
    }
  };

  const renderTimelineBody = (isInline: boolean) => (
    <>
      <div className="drawer-header" style={isInline ? { padding: "16px 20px 10px 20px" } : {}}>
        <div>
          <p className="drawer-kicker">Supervisor Tools</p>
          <h3 style={isInline ? { margin: 0, fontSize: "1.25rem", fontWeight: 700 } : {}}>Timeline Scheduler</h3>
        </div>
        {isInline ? (
          <button
            type="button"
            className="timeline-open-page-btn"
            onClick={openFullScheduler}
          >
            Open Full Scheduler ↗
          </button>
        ) : (
          <button
            className="drawer-close-btn"
            onClick={() => setIsOpen(false)}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="timeline-header-controls">
        <div className="week-display">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--eds-color-text-strong)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={20} color="var(--eds-color-primary)" />
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--eds-color-primary)",
                fontWeight: 700,
                backgroundColor: "var(--eds-color-primary-soft)",
                padding: "4px 10px",
                borderRadius: "12px",
                cursor: isInline ? "pointer" : "default",
              }}
              onClick={isInline ? openFullScheduler : undefined}
            >
              {isInline
                ? "✨ Click anywhere on schedule to open full scheduler page"
                : "✨ Click any empty area on the grid to schedule a task"}
            </span>
          </div>
          <span style={{ fontSize: "12.5px", color: "var(--eds-color-text-muted)", fontWeight: 500 }}>
            Week of {weekDays[0].display} - {weekDays[6].display}
          </span>
        </div>

        <div className="week-nav">
          <button
            type="button"
            className="timeline-nav-btn"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
          >
            <ChevronLeft size={16} /> prev
          </button>

          <button
            type="button"
            className="timeline-nav-btn"
            onClick={() => setCurrentWeekStart(getMonday(new Date()))}
          >
            This week
          </button>

          <button
            type="button"
            className="timeline-nav-btn"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-axis">
          {[8, 10, 12, 14, 16, 18, 20, 22, 24].map((h) => (
            <div
              key={h}
              className="time-marker"
              style={{ left: `${((h - 8) / 16) * 100}%` }}
            >
              {h === 12
                ? "12 PM"
                : h === 24
                  ? "12 AM"
                  : h > 12
                    ? `${h - 12} PM`
                    : `${h} AM`}
            </div>
          ))}
        </div>

        {weekDays.map((day) => {
          const dayTasks = tasks.filter((t) => {
            const d = new Date(t.task_date);
            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return (
              localDateStr === day.dateStr || t.task_date === day.dateStr
            );
          });

          const dayRecurring = recurring[day.dayName] || [];

          return (
            <div key={day.dateStr} className="timeline-row">
              <div className="day-label">
                <strong>{day.dayName.substring(0, 3)}</strong>
                <span>{day.display}</span>
              </div>
              <div
                className="day-track"
                onClick={() => handleTrackClick(day.dateStr)}
              >
                {/* Recurring Lecture Blocks */}
                {dayRecurring.map((slot, idx) => (
                  <div
                    key={`rec-${idx}`}
                    className="time-block block-lecture"
                    style={calculateStyle(slot.start, slot.end)}
                  >
                    <strong>Lecture (Frozen)</strong>
                    <span>
                      {slot.start} - {slot.end}
                    </span>
                  </div>
                ))}

                {/* Specific Task Blocks */}
                {dayTasks.map((task) => {
                  const startTimeStr = task.start_time ? task.start_time.substring(0, 5) : "";
                  const endTimeStr = task.end_time ? task.end_time.substring(0, 5) : "";
                  const timePeriod = startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr}` : (startTimeStr || endTimeStr);
                  const tooltipText = task.description
                    ? `${task.category}: ${task.description} (${timePeriod})`
                    : `${task.category} (${timePeriod})`;

                  return (
                    <div
                      key={`task-${task.id}`}
                      className={`time-block block-${task.category.toLowerCase().split(" ")[0]}`}
                      style={calculateStyle(task.start_time, task.end_time)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInline) {
                          openFullScheduler();
                        } else {
                          handleEditTask(e, task);
                        }
                      }}
                      title={tooltipText}
                    >
                      <strong>{task.category}</strong>
                      <span>
                        {task.description || timePeriod}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New/Edit Task Modal for Drawer View */}
      {!isInline && isFormOpen && (
        <div
          className="task-form-overlay"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="task-form-card drawer-form"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingTask ? "Edit Schedule" : "Add to Schedule"}</h3>
            <label className="drawer-field">
              <span>Date</span>
              <input
                type="date"
                value={formData.task_date}
                onChange={(e) =>
                  setFormData({ ...formData, task_date: e.target.value })
                }
              />
            </label>
            <div className="drawer-inline-grid">
              <label className="drawer-field">
                <span>Start Time</span>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </label>
              <label className="drawer-field">
                <span>End Time</span>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </label>
            </div>

            <label className="drawer-field">
              <span>Category</span>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value as CategoryType;
                  setFormData({ ...formData, category: cat });
                  if (cat !== "Group Meeting Request/Report Approve") {
                    setSelectedRequestId(""); setSelectedRequestKind("");
                  }
                }}
              >
                <option value="Meeting">Meeting</option>
                <option value="Group Meeting Request/Report Approve">
                  Group Meeting Request/Report Approve
                </option>
                <option value="Faculty Work">Faculty Work</option>
                <option value="Personal">Personal</option>
                <option value="Interim">Interim</option>
                <option value="Evaluation">Evaluation</option>
                <option value="Code Review">Code Review</option>
                <option value="Final Evaluation">Final Evaluation</option>
              </select>
            </label>

            {formData.category === "Group Meeting Request/Report Approve" && (
              <div className="student-request-section" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--eds-color-text-strong)" }}>
                    Select Pending Student Request
                  </span>
                  <button
                    type="button"
                    onClick={openHistoryPanel}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "var(--eds-color-primary-soft)",
                      color: "var(--eds-color-primary)",
                      border: "1px solid var(--eds-color-primary-soft-border)",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <History size={13} /> View History
                  </button>
                </div>
                <label className="drawer-field highlight-field" style={{ margin: 0 }}>
                  <select
                    value={selectedRequestId !== "" ? `${selectedRequestKind}-${selectedRequestId}` : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedRequestId(""); setSelectedRequestKind("");
                        return;
                      }
                      const [kind, idStr] = val.split("-");
                      const id = Number(idStr);
                      setSelectedRequestKind(kind as "request" | "report");
                      setSelectedRequestId(id);

                      if (kind === "request") {
                        const req = studentRequests.find((r) => r.id === id);
                        if (req) {
                          const reqDate = req.preferred_date ? req.preferred_date.split("T")[0] : (req.date ? req.date.split("T")[0] : "");
                          const reqStart = req.preferred_time ? req.preferred_time.substring(0, 5) : (req.start_time ? req.start_time.substring(0, 5) : "09:00");
                          const reqEnd = req.end_time ? req.end_time.substring(0, 5) : "10:00";
                          setFormData((prev) => ({
                            ...prev,
                            task_date: reqDate || prev.task_date,
                            start_time: reqStart || prev.start_time,
                            end_time: reqEnd || prev.end_time,
                            description: `Meeting with ${req.group_name || 'Group'} regarding ${req.topic || req.reason || "Project"}`,
                          }));
                        }
                      }
                      // Reports have nothing to schedule, so formData's
                      // date/time fields are left as-is for that kind.
                    }}
                  >
                    <option value="">-- Choose a Student Request --</option>
                    {studentRequests.length > 0 && (
                      <optgroup label="Meeting Requests">
                        {studentRequests.map((req) => {
                          const reqDate = req.preferred_date ? req.preferred_date.split("T")[0] : (req.date ? req.date.split("T")[0] : "");
                          const slot = reqDate
                            ? `${reqDate}${req.preferred_time ? ` ${req.preferred_time.substring(0, 5)}` : ""}`
                            : "no date proposed";
                          return (
                            <option key={`request-${req.id}`} value={`request-${req.id}`}>
                              {req.group_name || `Group #${req.group_id}`} - {req.topic || req.reason || "Meeting"} ({slot})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {studentReports.length > 0 && (
                      <optgroup label="Meeting Summary Reports">
                        {studentReports.map((rep) => (
                          <option key={`report-${rep.id}`} value={`report-${rep.id}`}>
                            [Report] {rep.group_name || `Group #${rep.group_id}`} - {(rep.summary || "").slice(0, 40)}{rep.summary?.length > 40 ? "…" : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </label>

                {selectedRequestId !== "" && selectedRequestKind === "request" && (() => {
                  const req = studentRequests.find((r) => r.id === selectedRequestId);
                  if (!req) return null;
                  return (
                    <div
                      className="student-request-detail-box"
                      style={{
                        background: "var(--eds-color-bg-surface-soft)",
                        border: "1px solid var(--eds-color-border)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--eds-color-text-strong)", marginBottom: "4px" }}>
                        📌 Student Request Details
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--eds-color-text-body)", marginBottom: "4px" }}>
                        <strong>Group:</strong> {req.group_name || `Group #${req.group_id}`} &nbsp;|&nbsp; <strong>Topic:</strong> {req.topic || "General Meeting"}
                      </div>
                      {req.reason && (
                        <div style={{ fontSize: "12px", color: "var(--eds-color-text-muted)", background: "var(--eds-color-bg-surface)", border: "1px solid var(--eds-color-border)", padding: "6px 8px", borderRadius: "6px", margin: "4px 0" }}>
                          <span style={{ fontWeight: 600, color: "var(--eds-color-text-strong)" }}>Student Request Note:</span> {req.reason}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "var(--eds-color-text-muted)" }}>
                        {(req.preferred_date || req.date)
                          ? `Requested: ${req.preferred_date ? req.preferred_date.split("T")[0] : req.date.split("T")[0]} (${req.preferred_time ? req.preferred_time.substring(0, 5) : ""} - ${req.end_time ? req.end_time.substring(0, 5) : ""})`
                          : "No fixed date/time from the student — see their note above for available options, then pick one below."}
                      </div>
                    </div>
                  );
                })()}

                {selectedRequestId !== "" && selectedRequestKind === "report" && (() => {
                  const rep = studentReports.find((r) => r.id === selectedRequestId);
                  if (!rep) return null;
                  return (
                    <div
                      className="student-request-detail-box"
                      style={{
                        background: "var(--eds-color-bg-surface-soft)",
                        border: "1px solid var(--eds-color-border)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--eds-color-text-strong)", marginBottom: "4px" }}>
                        📝 Meeting Summary Report
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--eds-color-text-body)", marginBottom: "4px" }}>
                        <strong>Group:</strong> {rep.group_name || `Group #${rep.group_id}`}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--eds-color-text-muted)", background: "var(--eds-color-bg-surface)", border: "1px solid var(--eds-color-border)", padding: "6px 8px", borderRadius: "6px", margin: "4px 0", whiteSpace: "pre-wrap" }}>
                        {rep.summary}
                      </div>
                    </div>
                  );
                })()}

                <label className="drawer-field" style={{ margin: 0 }}>
                  <span>Supervisor Message / Response</span>
                  <textarea
                    rows={2}
                    value={supervisorMessage}
                    onChange={(e) => setSupervisorMessage(e.target.value)}
                    placeholder="Enter approval note, meeting instructions, or rejection reason for the student..."
                  />
                </label>
              </div>
            )}

            {formData.category !== "Group Meeting Request/Report Approve" && (
              <label className="drawer-field">
                <span>Description / Note</span>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g. Code Review, Project Sync..."
                />
              </label>
            )}

            <div className="drawer-actions">
              {editingTask && (
                <button
                  type="button"
                  className="task-delete-btn"
                  onClick={() => deleteTask(editingTask.id!)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}

              {formData.category === "Group Meeting Request/Report Approve" && selectedRequestId !== "" ? (
                <>
                  <button
                    type="button"
                    className="drawer-primary-btn"
                    onClick={rejectRequest}
                    style={{ background: "var(--eds-color-danger-solid)" }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="drawer-primary-btn"
                    onClick={saveTask}
                    style={{ background: "var(--eds-color-success-solid)" }}
                  >
                    <Save size={16} /> {selectedRequestKind === "report" ? "Approve Report" : "Approve & Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="drawer-primary-btn"
                  onClick={saveTask}
                >
                  <Save size={16} /> Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="drawer-overlay" onClick={() => setHistoryOpen(false)}>
          <aside
            className="schedule-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(480px, 100vw)" }}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Supervisor Tools</p>
                <h3>Group Meeting History</h3>
              </div>
              <button className="drawer-close-btn" onClick={() => setHistoryOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "0 1.5rem 1.5rem", flex: 1, overflowY: "auto" }}>
              {!historyGroupName ? (
                // Step 1: pick one of the assigned groups (name + level).
                assignedGroups.length === 0 ? (
                  <p className="supervisor-level-muted">No assigned groups found.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {assignedGroups.map((g) => (
                      <button
                        key={g.groupId}
                        type="button"
                        onClick={() => selectHistoryGroup(g.groupName)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          textAlign: "left",
                          border: "1px solid var(--eds-color-border)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          background: "var(--eds-color-bg-surface)",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--eds-color-text-strong)" }}>
                          {g.groupName}
                        </span>
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "var(--eds-color-primary-soft)",
                          color: "var(--eds-color-primary)",
                        }}>
                          Level {g.level}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                // Step 2: the selected group's full meeting + report history.
                <>
                  <button
                    type="button"
                    onClick={() => { setHistoryGroupName(""); setHistoryData(null); setExpandedHistoryKey(null); }}
                    style={{ background: "none", border: "none", color: "var(--eds-color-primary)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "1rem" }}
                  >
                    ← Back to groups
                  </button>
                  <h4 style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>{historyGroupName}</h4>

                  {historyLoading && <p className="supervisor-level-muted">Loading history...</p>}

                  {!historyLoading && historyData && (
                    historyData.meetings.length === 0 ? (
                      <p className="supervisor-level-muted">No meeting requests yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {historyData.meetings.map((m: any) => {
                          const matchingReports = historyData.reports.filter((r: any) => r.meeting_request_id === m.id);
                          const requestKey = `request-${m.id}`;
                          const requestExpanded = expandedHistoryKey === requestKey;
                          return (
                            // Shared card groups a request with its report(s) as one
                            // visual unit, with a connecting arrow between the two
                            // columns making the pairing explicit rather than just
                            // implied by being on the same row.
                            <div
                              key={m.id}
                              style={{
                                border: "1px solid var(--eds-color-border)",
                                borderRadius: "10px",
                                background: "var(--eds-color-bg-surface-soft)",
                                padding: "10px",
                                display: "grid",
                                gridTemplateColumns: "1fr auto 1fr",
                                gap: "8px",
                                alignItems: "start",
                              }}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setExpandedHistoryKey(requestExpanded ? null : requestKey)}
                                style={{ background: "var(--eds-color-bg-surface)", border: "1px solid var(--eds-color-border)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
                                  <span>{m.topic}</span>
                                  {renderHistoryStatusBadge(m.status)}
                                </div>
                                {requestExpanded && m.reason && (
                                  <div style={{ fontSize: "0.75rem", color: "var(--eds-color-text-muted)", whiteSpace: "pre-wrap", marginTop: "6px" }}>
                                    {m.reason}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", height: "100%", color: "var(--eds-color-text-faint)", paddingTop: "14px" }}>
                                <ArrowRight size={16} />
                              </div>

                              {matchingReports.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {matchingReports.map((r: any) => {
                                    const reportKey = `report-${r.id}`;
                                    const reportExpanded = expandedHistoryKey === reportKey;
                                    return (
                                      <div
                                        key={r.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpandedHistoryKey(reportExpanded ? null : reportKey)}
                                        style={{ background: "var(--eds-color-bg-surface)", border: "1px solid var(--eds-color-border)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 600 }}>
                                          <span>Report</span>
                                          {renderHistoryStatusBadge(r.status)}
                                        </div>
                                        {reportExpanded && (
                                          <div style={{ fontSize: "0.75rem", color: "var(--eds-color-text-body)", whiteSpace: "pre-wrap", marginTop: "6px" }}>
                                            {r.summary}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{
                                  border: "1px dashed var(--eds-color-border)",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  fontSize: "0.75rem",
                                  color: "var(--eds-color-text-faint)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}>
                                  No report yet
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="timeline-inline-card">
        {renderTimelineBody(true)}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="freeze-date-btn task-scheduler-btn"
        onClick={() => setIsOpen(true)}
      >
        <Calendar size={16} /> Schedule & Free Times
      </button>

      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="schedule-drawer timeline-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {renderTimelineBody(false)}
          </aside>
        </div>
      )}
    </>
  );
};

export default SupervisorTaskScheduler;
