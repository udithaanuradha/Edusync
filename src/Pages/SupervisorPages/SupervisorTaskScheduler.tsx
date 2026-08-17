import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  X,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./supervisorPartInCalendar.css";
import "./SupervisorTaskScheduler.css";

// Types
type TimeSlot = { start: string; end: string };
type WeeklySchedule = Record<string, TimeSlot[]>;

// NEW: Expanded categories
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

  // Fix AM/PM mistakes (e.g. putting 12:00 AM instead of 12:00 PM)
  if (endMins <= startMins) {
    endMins += 720;
  }

  endMins = Math.min(endMins, 1440); // Clamp to 24:00

  const left = ((startMins - 480) / 960) * 100;
  // Ensure width never breaks CSS by clamping it to a minimum of 2%
  const width = Math.max(((endMins - startMins) / 960) * 100, 2);

  return { left: `${left}%`, width: `${width}%` };
};

const SupervisorTaskScheduler: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const supervisorId = user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [recurring, setRecurring] = useState<WeeklySchedule>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Task>({
    task_date: "",
    start_time: "09:00",
    end_time: "10:00",
    category: "Meeting",
    description: "",
  });

  // Student Requests from Backend
  const [studentRequests, setStudentRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | "">("");

  // Fetch Data
  const loadWeekData = async () => {
    if (!supervisorId) return;
    const startDate = formatDateStr(currentWeekStart);
    const endDate = formatDateStr(addDays(currentWeekStart, 6));

    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      // Fetch Tasks
      const taskRes = await fetch(
        `${API_TASKS}/${supervisorId}?startDate=${startDate}&endDate=${endDate}`,
        { headers },
      );
      if (taskRes.ok) setTasks(await taskRes.json());

      // Fetch Recurring Lectures
      const recRes = await fetch(
        `${API_RECURRING}/${supervisorId}?t=${Date.now()}`,
        { headers },
      );
      if (recRes.ok) {
        const result = await recRes.json();
        setRecurring(
          result.data?.weeklySchedule ?? result.data?.weekly_schedule ?? {},
        );
      }

      // Fetch Student Meeting Requests
      const reqRes = await fetch(
        `http://localhost:5000/api/meeting-requests/supervisor/${supervisorId}`,
        { headers }
      );
      if (reqRes.ok) {
        const requests = await reqRes.json();
        setStudentRequests(requests);
      } else {
        console.error("Failed to fetch requests", reqRes.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart, supervisorId]);

  // Check if we arrived here with an intent to open meeting requests
  useEffect(() => {
    if (location.state?.openMeetingRequests) {
      setIsOpen(true);
      setIsFormOpen(true);
      setFormData(prev => ({ ...prev, category: "Group Meeting/Request Approve" }));
      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Generate the 7 days for the UI
  const weekDays = useMemo(() => {
    const daysName = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return Array.from({ length: 7 }).map((_, i) => {
      const dateObj = addDays(currentWeekStart, i);
      return {
        dateStr: formatDateStr(dateObj),
        dayName: daysName[i],
        display: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [currentWeekStart]);

  // Form Handlers
  const handleTrackClick = (dateStr: string) => {
    setEditingTask(null);
    setFormData({
      task_date: dateStr,
      start_time: "10:00",
      end_time: "11:00",
      category: "Meeting",
      description: "",
    });
    setSelectedRequestId("");
    setIsFormOpen(true);
  };

  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);

    // Safely format the date for the input field to prevent timezone bugs
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
            description: `Meeting with ${req.group_name}${formData.description ? ' - ' + formData.description : ''}`
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
          // Update status in backend
          await fetch(`http://localhost:5000/api/meeting-requests/${selectedRequestId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ status: 'approved' })
          });
          setStudentRequests(studentRequests.filter(r => r.id !== selectedRequestId));
          alert("Time scheduled and message sent to student group successfully!");
        }
        setIsFormOpen(false);
        loadWeekData();
      }
    } catch (error) {
      console.error("Save error", error);
    }
  };

  const handleRejectRequest = async () => {
    if (selectedRequestId !== "") {
      try {
        const res = await fetch(`http://localhost:5000/api/meeting-requests/${selectedRequestId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status: 'rejected' })
        });
        if (res.ok) {
          setStudentRequests(studentRequests.filter(r => r.id !== selectedRequestId));
          alert("Student group request rejected and message sent.");
          setIsFormOpen(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const deleteTask = async () => {
    if (!editingTask?.id) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      const res = await fetch(
        `${API_TASKS}/${supervisorId}/${editingTask.id}`,
        { method: "DELETE", headers },
      );
      if (res.ok) {
        setIsFormOpen(false);
        loadWeekData();
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

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
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Supervisor Tools</p>
                <h3>Timeline Scheduler</h3>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="timeline-header-controls">
              <div className="week-display">
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3>
                    {currentWeekStart.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  {/* Instruction Badge */}
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#059669",
                      fontWeight: 700,
                      backgroundColor: "#d1fae5",
                      padding: "4px 10px",
                      borderRadius: "12px",
                    }}
                  >
                    ✨ Click any empty area on the grid to schedule a task
                  </span>
                </div>
                <span>
                  Week of {weekDays[0].display} - {weekDays[6].display}
                </span>
              </div>

              <div className="week-nav">
                {/* Fixed Navigation Buttons with flexible width */}
                <button
                  className="timeline-nav-btn"
                  onClick={() =>
                    setCurrentWeekStart(addDays(currentWeekStart, -7))
                  }
                >
                  <ChevronLeft size={16} /> prev
                </button>

                <button
                  className="timeline-nav-btn"
                  onClick={() => setCurrentWeekStart(getMonday(new Date()))}
                >
                  This week
                </button>

                <button
                  className="timeline-nav-btn"
                  onClick={() =>
                    setCurrentWeekStart(addDays(currentWeekStart, 7))
                  }
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
                // Safely parse database dates to Local Time
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
                      {dayTasks.map((task) => (
                        <div
                          key={`task-${task.id}`}
                          className={`time-block block-${task.category.toLowerCase().split(" ")[0]}`}
                          style={calculateStyle(task.start_time, task.end_time)}
                          onClick={(e) => handleEditTask(e, task)}
                        >
                          <strong>{task.category}</strong>
                          <span>
                            {task.description ||
                              `${task.start_time} - ${task.end_time}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* New/Edit Task Modal */}
          {isFormOpen && (
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as CategoryType,
                      })
                    }
                  >
                    <option>Meeting</option>
                    <option>Faculty Work</option>
                    <option>Personal</option>
                    <option>Interim</option>
                    <option>Evaluation</option>
                    <option>Code Review</option>
                    <option>Final Evaluation</option>
                    <option>Group Meeting/Request Approve</option>
                  </select>
                </label>
                
                {formData.category === "Group Meeting/Request Approve" && (
                  <label className="drawer-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Pending Student Requests</span>
                    <div style={{ 
                      maxHeight: '220px', 
                      overflowY: 'auto', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px', 
                      padding: '8px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      background: '#f9fafb'
                    }}>
                      {studentRequests.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                          No pending requests at the moment.
                        </div>
                      ) : (
                        studentRequests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => {
                              setSelectedRequestId(req.id);
                              setFormData({
                                ...formData,
                                task_date: req.preferred_date ? req.preferred_date.split('T')[0] : '',
                                start_time: req.preferred_time ? req.preferred_time.substring(0, 5) : '',
                                end_time: req.preferred_time ? req.preferred_time.substring(0, 5) : '',
                                description: "", // Leave empty for supervisor reply
                              });
                            }}
                            style={{
                              padding: '12px',
                              border: `1px solid ${selectedRequestId === req.id ? '#3b82f6' : '#e5e7eb'}`,
                              backgroundColor: selectedRequestId === req.id ? '#eff6ff' : '#ffffff',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: selectedRequestId === req.id ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{req.group_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                                {req.preferred_date ? req.preferred_date.split('T')[0] : ''} {req.preferred_time ? req.preferred_time.substring(0, 5) : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>{req.topic}</div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic', background: '#f3f4f6', padding: '6px', borderRadius: '4px', borderLeft: '3px solid #9ca3af' }}>
                              "{req.reason}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </label>
                )}

                <label className="drawer-field">
                  <span>
                    {formData.category === "Group Meeting/Request Approve"
                      ? "Message to Student Group"
                      : "Description / Purpose"}
                  </span>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={
                      formData.category === "Group Meeting/Request Approve"
                        ? "Type your approval/rejection message to the students here..."
                        : "E.g., Sync with Dr. Smith"
                    }
                  />
                </label>
                <div className="drawer-actions">
                  {/* Fixed Delete Button */}
                  {editingTask && (
                    <button
                      type="button"
                      className="task-delete-btn"
                      onClick={deleteTask}
                    >
                      <Trash2 size={16} /> Delete Task
                    </button>
                  )}

                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="drawer-secondary-btn"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </button>
                  {formData.category === "Group Meeting/Request Approve" ? (
                    <>
                      <button
                        type="button"
                        className="task-delete-btn"
                        onClick={handleRejectRequest}
                        disabled={selectedRequestId === ""}
                        style={{ 
                          background: selectedRequestId === "" ? '#f3f4f6' : '#fef2f2', 
                          color: selectedRequestId === "" ? '#9ca3af' : '#ef4444', 
                          border: `1px solid ${selectedRequestId === "" ? '#d1d5db' : '#fca5a5'}`, 
                          padding: '8px 16px', 
                          borderRadius: '8px', 
                          fontWeight: 600,
                          cursor: selectedRequestId === "" ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="drawer-primary-btn"
                        onClick={saveTask}
                        disabled={selectedRequestId === ""}
                        style={{ 
                          background: selectedRequestId === "" ? '#9ca3af' : '#10b981', 
                          boxShadow: selectedRequestId === "" ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                          cursor: selectedRequestId === "" ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Save
                          size={16}
                          style={{ marginRight: "6px", verticalAlign: "middle" }}
                        />{" "}
                        Approve & Send Message
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="drawer-primary-btn"
                      onClick={saveTask}
                    >
                      <Save
                        size={16}
                        style={{ marginRight: "6px", verticalAlign: "middle" }}
                      />{" "}
                      Save
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupervisorTaskScheduler;
