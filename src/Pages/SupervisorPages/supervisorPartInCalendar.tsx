import React, { useEffect, useState } from "react";
import { Clock, Plus, Trash2, X, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./supervisorPartInCalendar.css";

/**
 * TYPE DEFINITIONS
 */
type TimeSlot = { start: string; end: string };
type WeeklySchedule = Record<string, TimeSlot[]>;

/**
 * CONFIGURATION & CONSTANTS
 */
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEEKLY_SCHEDULE_API =
  "http://localhost:5000/api/supervisorpartincalender";

/**
 * HELPER FUNCTIONS
 */

/**
 * Logic: Generates a unique key for local storage caching based on supervisor ID[cite: 4].
 * This ensures that if multiple users use the same machine, they don't see each other's cached data[cite: 4].
 */
const getLectureStorageKey = (supervisorId: number | string) =>
  `edusync.supervisor.lectureTimes.${supervisorId}`;

/**
 * Logic: Returns a fresh schedule object with empty arrays for each day of the week[cite: 4].
 * It uses the reduce method to build an object where keys are the days from DAYS_OF_WEEK[cite: 4].
 */
const createEmptySchedule = (): WeeklySchedule =>
  DAYS_OF_WEEK.reduce((accumulator, day) => {
    accumulator[day] = [];
    return accumulator;
  }, {} as WeeklySchedule);

/**
 * Logic: Data Normalization.
 * This is a "Sanity Check" that validates raw data from the API or LocalStorage[cite: 4].
 * It ensures the UI always receives a valid WeeklySchedule structure and provides
 * default times (08:00 - 10:00) if data is corrupt or missing[cite: 4].
 */
const normalizeWeeklySchedule = (value: unknown): WeeklySchedule => {
  if (!value || typeof value !== "object") return createEmptySchedule();

  const payload = value as Record<string, unknown>;

  return DAYS_OF_WEEK.reduce((accumulator, day) => {
    const slots = Array.isArray(payload[day]) ? payload[day] : [];

    accumulator[day] = slots
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;

        const slotRecord = slot as Record<string, unknown>;
        // Default to 08:00 - 10:00 if time data is missing/corrupt[cite: 4]
        const start =
          typeof slotRecord.start === "string" ? slotRecord.start : "08:00";
        const end =
          typeof slotRecord.end === "string" ? slotRecord.end : "10:00";

        return { start, end };
      })
      .filter((slot): slot is TimeSlot => slot !== null);

    return accumulator;
  }, createEmptySchedule());
};

/**
 * COMPONENT: SupervisorPartInCalendar
 * Handles the management of recurring weekly "frozen" slots (e.g., Lectures)[cite: 4].
 */
const SupervisorPartInCalendar: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supervisorId = user?.id ?? null;
  const lectureStorageKey = supervisorId
    ? getLectureStorageKey(supervisorId)
    : null;

  // Logic: Initialize local state with an empty schedule to prevent undefined errors[cite: 4]
  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    createEmptySchedule(),
  );

  /**
   * Function: useEffect (Data Loading Strategy)
   * Logic: Implements an "Optimistic UI" approach when the drawer opens[cite: 4].
   * 1. Checks LocalStorage for an instant (cached) UI population[cite: 4].
   * 2. Fetches from the database to get the latest "Source of Truth"[cite: 4].
   * 3. Syncs the LocalStorage with fresh data once the API call finishes[cite: 4].
   */
  useEffect(() => {
    if (!supervisorId) {
      setSchedule(createEmptySchedule());
      return;
    }

    const loadSavedSchedule = async () => {
      try {
        // STEP 1: Load cached version for zero-latency feel[cite: 4]
        if (lectureStorageKey) {
          const stored = localStorage.getItem(lectureStorageKey);
          if (stored) {
            setSchedule(normalizeWeeklySchedule(JSON.parse(stored)));
          }
        }

        // STEP 2: Fetch fresh data from DB[cite: 4]
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
          `${WEEKLY_SCHEDULE_API}/${supervisorId}?t=${Date.now()}`,
          {
            headers,
            cache: "no-store", // Logic: Bypass browser cache to get latest from server[cite: 4]
          },
        );

        if (!response.ok) return;

        const result = await response.json();

        // Logic: Handle varying payload structures from the server[cite: 1, 4]
        const savedSchedule =
          result.data?.weeklySchedule ??
          result.data?.weekly_schedule ??
          result.data;

        if (savedSchedule && Object.keys(savedSchedule).length > 0) {
          const normalizedSchedule = normalizeWeeklySchedule(savedSchedule);
          setSchedule(normalizedSchedule);

          // STEP 3: Update local cache with truth from server[cite: 4]
          if (lectureStorageKey) {
            localStorage.setItem(
              lectureStorageKey,
              JSON.stringify(normalizedSchedule),
            );
          }
        }
      } catch (error) {
        console.error("Failed to load weekly schedule", error);
      }
    };

    // Logic: Only triggers the load if the settings drawer is open[cite: 4]
    if (isOpen) {
      void loadSavedSchedule();
    }
  }, [lectureStorageKey, supervisorId, isOpen]);

  /**
   * EVENT HANDLERS: LOCAL STATE MANAGEMENT
   */

  /**
   * Function: handleAddSlot
   * Logic: Appends a new default time slot (08:00 - 10:00) to a specific day's array[cite: 4].
   */
  const handleAddSlot = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: "08:00", end: "10:00" }],
    }));
  };

  /**
   * Function: handleRemoveSlot
   * Logic: Filters the specific day's array to remove the slot at the given index[cite: 4].
   */
  const handleRemoveSlot = (day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  /**
   * Function: handleTimeChange
   * Logic: Updates either the 'start' or 'end' value of a specific slot within the schedule state[cite: 4].
   */
  const handleTimeChange = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  /**
   * Function: handleSave
   * Logic: Persists the local React state to the remote database and updates local cache[cite: 4].
   * It uses a PUT request to update the supervisor's weekly record[cite: 1, 4].
   */
  const handleSave = async () => {
    if (!supervisorId) {
      alert("Please log in again to save.");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${WEEKLY_SCHEDULE_API}/${supervisorId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ weeklySchedule: schedule }),
      });

      if (!response.ok) throw new Error("Failed to save schedule to database");

      // Logic: Sync local cache immediately after successful server update[cite: 4]
      if (lectureStorageKey) {
        localStorage.setItem(lectureStorageKey, JSON.stringify(schedule));
      }

      setIsOpen(false);
      alert("Weekly lecture schedule saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save weekly schedule. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* TRIGGER: Opens the recurring freeze settings drawer[cite: 4] */}
      <button
        type="button"
        className="freeze-date-btn ghost-btn supervisor-freeze-btn"
        onClick={() => setIsOpen(true)}
      >
        <Clock size={16} />
        Freeze Lecture Times
      </button>

      {/* DRAWER COMPONENT[cite: 4] */}
      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="schedule-drawer sup-schedule-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Supervisor Tools</p>
                <h3>Recurring Freezes</h3>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Instruction Card[cite: 4] */}
            <div className="drawer-summary-card freeze-card">
              <span className="drawer-summary-label">Lecture Times</span>
              <strong>Weekly Recurring</strong>
              <span>
                Times added here will be frozen every week automatically until
                you edit or remove them.
              </span>
            </div>

            {/* MAIN SCHEDULE INTERFACE: Day-by-day slot management[cite: 4] */}
            <div className="weekly-schedule-container">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="day-schedule-block">
                  <div className="day-schedule-header">
                    <span className="day-name">{day}</span>
                    <button
                      type="button"
                      className="add-slot-btn"
                      onClick={() => handleAddSlot(day)}
                    >
                      <Plus size={14} /> Add Slot
                    </button>
                  </div>

                  {/* EMPTY STATE HANDLING: Logic to display message when no slots exist for a day[cite: 4] */}
                  {schedule[day].length === 0 ? (
                    <div className="no-slots-msg">No slots frozen</div>
                  ) : (
                    <div className="slots-list">
                      {schedule[day].map((slot, index) => (
                        <div key={index} className="time-slot-row">
                          {/* START TIME INPUT[cite: 4] */}
                          <input
                            type="time"
                            className="time-input"
                            value={slot.start}
                            onChange={(e) =>
                              handleTimeChange(
                                day,
                                index,
                                "start",
                                e.target.value,
                              )
                            }
                          />
                          <span className="time-separator">to</span>
                          {/* END TIME INPUT[cite: 4] */}
                          <input
                            type="time"
                            className="time-input"
                            value={slot.end}
                            onChange={(e) =>
                              handleTimeChange(
                                day,
                                index,
                                "end",
                                e.target.value,
                              )
                            }
                          />

                          <div className="slot-action-buttons">
                            {/* DELETE ACTION[cite: 4] */}
                            <button
                              type="button"
                              className="remove-slot-btn"
                              onClick={() => handleRemoveSlot(day, index)}
                            >
                              Delete
                              <Trash2 size={14} />
                            </button>

                            {/* QUICK ADD LOGIC: Shows only on the last item for UX convenience[cite: 4] */}
                            {index === schedule[day].length - 1 && (
                              <button
                                type="button"
                                className="inline-add-btn"
                                onClick={() => handleAddSlot(day)}
                              >
                                add
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* DRAWER FOOTER: Save and Cancel actions[cite: 4] */}
            <div className="drawer-actions sup-drawer-actions">
              <button
                type="button"
                className="drawer-secondary-btn"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="drawer-primary-btn flex-btn"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save size={16} style={{ marginRight: "6px" }} />
                {isSaving ? "Saving..." : "Save Weekly Schedule"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default SupervisorPartInCalendar;
