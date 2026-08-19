import React, { useEffect, useState } from "react";
import { Clock, Plus, Trash2, X, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./supervisorPartInCalendar.css";

type TimeSlot = { start: string; end: string };
type WeeklySchedule = Record<string, TimeSlot[]>;

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

const getLectureStorageKey = (supervisorId: number | string) =>
  `edusync.supervisor.lectureTimes.${supervisorId}`;

const createEmptySchedule = (): WeeklySchedule =>
  DAYS_OF_WEEK.reduce((accumulator, day) => {
    accumulator[day] = [];
    return accumulator;
  }, {} as WeeklySchedule);

const normalizeWeeklySchedule = (value: unknown): WeeklySchedule => {
  if (!value || typeof value !== "object") return createEmptySchedule();

  const payload = value as Record<string, unknown>;

  return DAYS_OF_WEEK.reduce((accumulator, day) => {
    const slots = Array.isArray(payload[day]) ? payload[day] : [];

    accumulator[day] = slots
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;

        const slotRecord = slot as Record<string, unknown>;
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

const SupervisorPartInCalendar: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supervisorId = user?.id ?? null;
  const lectureStorageKey = supervisorId
    ? getLectureStorageKey(supervisorId)
    : null;

  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    createEmptySchedule(),
  );

  // Load schedule when the drawer opens or supervisor changes
  useEffect(() => {
    if (!supervisorId) {
      setSchedule(createEmptySchedule());
      return;
    }

    const loadSavedSchedule = async () => {
      try {
        // 1. Instantly load from local storage for a fast UI feel
        if (lectureStorageKey) {
          const stored = localStorage.getItem(lectureStorageKey);
          if (stored) {
            setSchedule(normalizeWeeklySchedule(JSON.parse(stored)));
          }
        }

        // 2. Fetch fresh from DB (Bypassing browser cache!)
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
          `${WEEKLY_SCHEDULE_API}/${supervisorId}?t=${Date.now()}`,
          {
            headers,
            cache: "no-store", // CRITICAL: Forces the browser to get fresh data
          },
        );

        if (!response.ok) return;

        const result = await response.json();
        const savedSchedule =
          result.data?.weeklySchedule ??
          result.data?.weekly_schedule ??
          result.data;

        if (savedSchedule && Object.keys(savedSchedule).length > 0) {
          const normalizedSchedule = normalizeWeeklySchedule(savedSchedule);
          setSchedule(normalizedSchedule);

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

    if (isOpen) {
      void loadSavedSchedule();
    }
  }, [lectureStorageKey, supervisorId, isOpen]);

  const handleAddSlot = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: "08:00", end: "10:00" }],
    }));
  };

  const handleRemoveSlot = (day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

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

      // Update local storage so the next immediate open is accurate
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
      <button
        type="button"
        className="freeze-date-btn ghost-btn supervisor-freeze-btn"
        onClick={() => setIsOpen(true)}
      >
        <Clock size={16} />
        Freeze Lecture Times
      </button>

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

            <div className="drawer-summary-card freeze-card">
              <span className="drawer-summary-label">Lecture Times</span>
              <strong>Weekly Recurring</strong>
              <span>
                Times added here will be frozen every week automatically until
                you edit or remove them.
              </span>
            </div>

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

                  {schedule[day].length === 0 ? (
                    <div className="no-slots-msg">No slots frozen</div>
                  ) : (
                    <div className="slots-list">
                      {schedule[day].map((slot, index) => (
                        <div key={index} className="time-slot-row">
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
                            <button
                              type="button"
                              className="remove-slot-btn"
                              onClick={() => handleRemoveSlot(day, index)}
                            >
                              <Trash2 size={14} />
                            </button>

                            {index === schedule[day].length - 1 && (
                              <button
                                type="button"
                                className="inline-add-btn"
                                onClick={() => handleAddSlot(day)}
                              >
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
