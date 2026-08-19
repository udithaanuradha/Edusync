import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  X,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
  | "Group Meeting/Request Approve";

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
  const supervisorId = user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
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
  const [selectedRequestId, setSelectedRequestId] = useState<number | "">("");
  const [supervisorMessage, setSupervisorMessage] = useState("");

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
          category: "Group Meeting/Request Approve",
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
    if (inline) {
      openFullScheduler();
      return;
    }
    setEditingTask(null);
    setFormData({
      task_date: dateStr,
      start_time: "09:00",
      end_time: "10:00",
      category: "Meeting",
      description: "",
    });
    setSelectedRequestId("");
    setIsFormOpen(true);
  };

  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (inline) {
      openFullScheduler();
      return;
    }
    setEditingTask(task);
    const d = new Date(task.task_date);
    const safeDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    setFormData({ ...task, task_date: safeDateStr });
    setSelectedRequestId("");
    setIsFormOpen(true);
  };

  const saveTask = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      const url = editingTask?.id
        ? `${API_TASKS}/${supervisorId}/${editingTask.id}`
        : `${API_TASKS}/${supervisorId}`;
      const method = editingTask?.id ? "PUT" : "POST";

      let payload = formData;
      let reqDetails = null;

      if (formData.category === "Group Meeting/Request Approve" && selectedRequestId !== "") {
        const req = studentRequests.find(r => r.id === selectedRequestId);
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
        if (reqDetails) {
          const token = localStorage.getItem("token") || "auth_token";
          await fetch(`http://localhost:5000/api/meeting-requests/${selectedRequestId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: 'approved', message: supervisorMessage || formData.description })
          });
          setStudentRequests(studentRequests.filter(r => r.id !== selectedRequestId));
          window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
        }
        setIsFormOpen(false);
        setSupervisorMessage("");
        loadWeekData();
      }
    } catch (error) {
      console.error("Save task error", error);
    }
  };

  const rejectRequest = async () => {
    if (selectedRequestId !== "") {
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
          setStudentRequests(studentRequests.filter(r => r.id !== selectedRequestId));
          window.dispatchEvent(new CustomEvent('meetingRequestUpdated'));
          setIsFormOpen(false);
          setSupervisorMessage("");
        }
      } catch (err) {
        console.error("Reject request error", err);
      }
    }
  };

  const deleteTask = async (taskId: number) => {
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
              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={20} color="#3b82f6" />
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
                color: "#059669",
                fontWeight: 700,
                backgroundColor: "#d1fae5",
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
          <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 500 }}>
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
                style={isInline ? { cursor: "pointer" } : {}}
                onClick={
                  isInline
                    ? openFullScheduler
                    : () => handleTrackClick(day.dateStr)
                }
              >
                {/* Recurring Lecture Blocks */}
                {dayRecurring.map((slot, idx) => (
                  <div
                    key={`rec-${idx}`}
                    className="time-block block-lecture"
                    style={calculateStyle(slot.start, slot.end)}
                    title={`Lecture (Frozen): ${slot.start} - ${slot.end}`}
                    onClick={
                      isInline
                        ? (e) => {
                          e.stopPropagation();
                          openFullScheduler();
                        }
                        : undefined
                    }
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
                  if (cat !== "Group Meeting/Request Approve") {
                    setSelectedRequestId("");
                  }
                }}
              >
                <option value="Meeting">Meeting</option>
                <option value="Group Meeting/Request Approve">
                  Group Meeting/Request Approve
                </option>
                <option value="Faculty Work">Faculty Work</option>
                <option value="Personal">Personal</option>
                <option value="Interim">Interim</option>
                <option value="Evaluation">Evaluation</option>
                <option value="Code Review">Code Review</option>
                <option value="Final Evaluation">Final Evaluation</option>
              </select>
            </label>

            {formData.category === "Group Meeting/Request Approve" && (
              <div className="student-request-section" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label className="drawer-field highlight-field" style={{ margin: 0 }}>
                  <span>Select Pending Student Request</span>
                  <select
                    value={selectedRequestId}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : "";
                      setSelectedRequestId(id);
                      if (id !== "") {
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
                    }}
                  >
                    <option value="">-- Choose a Student Request --</option>
                    {studentRequests.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.group_name || `Group #${req.group_id}`} - {req.topic || req.reason || "Meeting"} ({req.preferred_date ? req.preferred_date.split("T")[0] : (req.date ? req.date.split("T")[0] : "")} {req.preferred_time ? req.preferred_time.substring(0, 5) : ""})
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRequestId !== "" && (() => {
                  const req = studentRequests.find((r) => r.id === selectedRequestId);
                  if (!req) return null;
                  return (
                    <div
                      className="student-request-detail-box"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                        📌 Student Request Details
                      </div>
                      <div style={{ fontSize: "12px", color: "#334155", marginBottom: "4px" }}>
                        <strong>Group:</strong> {req.group_name || `Group #${req.group_id}`} &nbsp;|&nbsp; <strong>Topic:</strong> {req.topic || "General Meeting"}
                      </div>
                      {req.reason && (
                        <div style={{ fontSize: "12px", color: "#475569", background: "#ffffff", border: "1px solid #e2e8f0", padding: "6px 8px", borderRadius: "6px", margin: "4px 0" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>Student Request Note:</span> {req.reason}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Requested: {req.preferred_date ? req.preferred_date.split("T")[0] : (req.date ? req.date.split("T")[0] : "")} ({req.preferred_time ? req.preferred_time.substring(0, 5) : ""} - {req.end_time ? req.end_time.substring(0, 5) : ""})
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

            {formData.category !== "Group Meeting/Request Approve" && (
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

              {formData.category === "Group Meeting/Request Approve" && selectedRequestId !== "" ? (
                <>
                  <button
                    type="button"
                    className="drawer-primary-btn"
                    onClick={rejectRequest}
                    style={{ background: "#ef4444" }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="drawer-primary-btn"
                    onClick={saveTask}
                    style={{ background: "#10b981" }}
                  >
                    <Save size={16} /> Approve & Save
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
