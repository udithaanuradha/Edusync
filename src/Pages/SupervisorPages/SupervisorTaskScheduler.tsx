import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  X,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./supervisorPartInCalendar.css";
import "./SupervisorTaskScheduler.css";

/**
 * TYPE DEFINITIONS
 */
type TimeSlot = { start: string; end: string };
type WeeklySchedule = Record<string, TimeSlot[]>;

/**
 * Defines the classification for schedule entries.
 * Used for styling and backend categorization.
 */
type CategoryType =
  | "Meeting"
  | "Faculty Work"
  | "Personal"
  | "Interim"
  | "Evaluation"
  | "Code Review"
  | "Final Evaluation";

/** Structure for individual one-off schedule tasks */
type Task = {
  id?: number;
  task_date: string;
  start_time: string;
  end_time: string;
  category: CategoryType;
  description: string;
};

// API Endpoints
const API_TASKS = "http://localhost:5000/api/supervisor-tasks";
const API_RECURRING = "http://localhost:5000/api/supervisorpartincalender";

/**
 * DATE UTILITIES
 * Logic for managing week boundaries and formatting strings for input/API compatibility.
 */

/**
 * Logic: Calculates the Monday of the week for any given date.
 * Purpose: Standardizes the calendar view so it always begins on Monday[cite: 4].
 */
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

/** Logic: Shifts a date by a set number of days using milliseconds (86.4m per day)[cite: 4]. */
const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400000);

/** Logic: Formats Date objects to YYYY-MM-DD for standard HTML5 date inputs and SQL compatibility[cite: 4]. */
const formatDateStr = (d: Date) => {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * TIMELINE RENDERING LOGIC
 * Calculations to map 24-hour time strings to horizontal percentages.
 */

/** Logic: Parses HH:mm strings into total integer minutes from 00:00[cite: 4]. */
const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Logic: Computes CSS 'left' (position) and 'width' (duration) percentages.
 * Window: 08:00 (480 mins) to 24:00 (1440 mins), total 960 minutes[cite: 4].
 */
const calculateStyle = (start: string, end: string) => {
  const startMins = Math.max(timeToMinutes(start), 480); // Clamp start at 08:00
  let endMins = timeToMinutes(end);

  /** Logic: Handles edge case where end time wraps or is logged before start time[cite: 4]. */
  if (endMins <= startMins) {
    endMins += 720;
  }

  endMins = Math.min(endMins, 1440); // Clamp end at Midnight

  const left = ((startMins - 480) / 960) * 100;
  const width = Math.max(((endMins - startMins) / 960) * 100, 2);

  return { left: `${left}%`, width: `${width}%` };
};

/**
 * MAIN COMPONENT: SupervisorTaskScheduler
 * Handles fetching, managing, and displaying a supervisor's weekly timeline[cite: 4].
 */
const SupervisorTaskScheduler: React.FC = () => {
  const { user } = useAuth();
  const supervisorId = user?.id;

  // VISIBILITY STATES: Controls drawer and modal form visibility[cite: 4].
  const [isOpen, setIsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // DATA STATES: Stores current week reference, recurring lecture slots, and dynamic tasks[cite: 4].
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getMonday(new Date()),
  );
  const [recurring, setRecurring] = useState<WeeklySchedule>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  // FORM STATE: Local buffer for task creation/editing[cite: 4].
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Task>({
    task_date: "",
    start_time: "09:00",
    end_time: "10:00",
    category: "Meeting",
    description: "",
  });

  /**
   * Function: loadWeekData
   * Logic: Synchronizes frontend state with backend data for the currently visible 7-day range.
   * Details: Fetches one-off tasks and recurring weekly slots simultaneously[cite: 1, 4].
   */
  const loadWeekData = async () => {
    if (!supervisorId) return;
    const startDate = formatDateStr(currentWeekStart);
    const endDate = formatDateStr(addDays(currentWeekStart, 6));

    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      // API Call: Fetch dynamic tasks within the specific date boundaries[cite: 4].
      const taskRes = await fetch(
        `${API_TASKS}/${supervisorId}?startDate=${startDate}&endDate=${endDate}`,
        { headers },
      );
      if (taskRes.ok) setTasks(await taskRes.json());

      // API Call: Fetch static recurring "Lecture Freezes" for this supervisor[cite: 1, 4].
      const recRes = await fetch(
        `${API_RECURRING}/${supervisorId}?t=${Date.now()}`,
        { headers },
      );
      if (recRes.ok) {
        const result = await recRes.json();
        // Logic: Support both camelCase and snake_case API responses[cite: 1, 2].
        setRecurring(
          result.data?.weeklySchedule ?? result.data?.weekly_schedule ?? {},
        );
      }
    } catch (error) {
      console.error("Error loading schedule data", error);
    }
  };

  // Trigger: Re-fetches data whenever the drawer opens or the user navigates between weeks[cite: 4].
  useEffect(() => {
    if (isOpen) loadWeekData();
  }, [isOpen, currentWeekStart]);

  /**
   * Memo: weekDays
   * Logic: Generates day labels and date strings for the 7 columns in the UI grid.
   * Purpose: Prevents unnecessary recalculations during standard state renders[cite: 4].
   */
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

  /**
   * CRUD EVENT HANDLERS for Tasks
   * Logic: Manages creation, updating, and deletion of tasks with appropriate API calls[cite: 4].
   * Details: Uses form state to buffer user input before sending to backend.
   */

  /** Function: handleTrackClick - Initializes the form with the date of the clicked row[cite: 4]. */
  const handleTrackClick = (dateStr: string) => {
    setEditingTask(null);
    setFormData({
      task_date: dateStr,
      start_time: "10:00",
      end_time: "11:00",
      category: "Meeting",
      description: "",
    });
    setIsFormOpen(true);
  };

  /** Function: handleEditTask - Populates form with existing task details for modification[cite: 4]. */
  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Logic: Prevents track click event from overlapping
    setEditingTask(task);

    // Logic: Force format date to match HTML date input requirements[cite: 4].
    const d = new Date(task.task_date);
    const safeDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    setFormData({ ...task, task_date: safeDateStr });
    setIsFormOpen(true);
  };

  /** Function: saveTask - Logic: Switches between POST and PUT based on task existence[cite: 4]. */
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

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsFormOpen(false);
        loadWeekData(); // Refresh UI[cite: 4].
      }
    } catch (error) {
      console.error("Save error", error);
    }
  };

  /** Function: deleteTask - Removes the task from the database after confirmation[cite: 4]. */
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
        loadWeekData(); // Refresh UI[cite: 4].
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  return (
    <>
      {/* UI TRIGGER BUTTON: Opens the full-page timeline drawer[cite: 4]. */}
      <button
        type="button"
        className="freeze-date-btn task-scheduler-btn"
        onClick={() => setIsOpen(true)}
      >
        <Calendar size={16} /> Schedule & Free Times
      </button>

      {/* TIMELINE OVERLAY & DRAWER */}
      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="schedule-drawer timeline-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Displays title and close button[cite: 4]. */}
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

            {/* Controls: Logic for week navigation and "This Week" reset[cite: 4]. */}
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

            {/* MAIN TIMELINE GRID: Renders the time markers and daily rows[cite: 4]. */}
            <div className="timeline-container">
              {/* Horizontal X-Axis: Time markers from 8 AM to Midnight[cite: 4]. */}
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

              {/* Day Rows: Logic filters tasks and recurring slots specific to each day[cite: 4]. */}
              {weekDays.map((day) => {
                /** Logic: Filter tasks matching the current row's date[cite: 4]. */
                const dayTasks = tasks.filter((t) => {
                  const d = new Date(t.task_date);
                  const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  return (
                    localDateStr === day.dateStr || t.task_date === day.dateStr
                  );
                });

                /** Logic: Match recurring slots by the literal day name (e.g., 'Monday')[cite: 4]. */
                const dayRecurring = recurring[day.dayName] || [];

                return (
                  <div key={day.dateStr} className="timeline-row">
                    <div className="day-label">
                      <strong>{day.dayName.substring(0, 3)}</strong>
                      <span>{day.display}</span>
                    </div>
                    {/* Track: Clickable area for adding new tasks[cite: 4]. */}
                    <div
                      className="day-track"
                      onClick={() => handleTrackClick(day.dateStr)}
                    >
                      {/* Recurring Blocks: Rendered as static "Lecture (Frozen)" items[cite: 4]. */}
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

                      {/* Task Blocks: Interactive items color-coded by category[cite: 4]. */}
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

          {/* TASK MANAGEMENT FORM: Logic for capturing task details[cite: 4]. */}
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
                  </select>
                </label>
                <label className="drawer-field">
                  <span>Description / Purpose</span>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="E.g., Sync with Dr. Smith"
                  />
                </label>

                <div className="drawer-actions">
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
