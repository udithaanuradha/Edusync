import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Sidebar from "../components/shared/Sidebar";
import CalendarGrid, {
  type CalendarGridMarker,
} from "../components/shared/CalendarGrid";
import Header from "../components/shared/Header";
import { useAuth } from "../context/AuthContext";
import "./CalendarPage.css";

// Importing both Supervisor components
import SupervisorPartInCalendar from "./SupervisorPages/supervisorPartInCalendar";
import SupervisorTaskScheduler from "./SupervisorPages/SupervisorTaskScheduler";

type SupervisorOption = {
  id: number;
  name: string;
  email: string;
};

type GroupOption = {
  id: number | string;
  name: string;
  supervisor: string;
  memberCount: number;
};

type FrozenDateRecord = {
  date: string;
  reason: string;
};

type ScheduledPanel = {
  id: string;
  title: string;
  level: number;
  groupId: number | string;
  groupName: string;
  date: string;
  time: string;
  duration: string;
  evaluators: string[];
  location: string;
  meetingLink: string;
  notes: string;
  kind: string;
};

type DrawerMode = "schedule" | "freeze";

const levelOptions = [1, 2, 3, 4];
const evaluationTypes = ["Proposal", "Interim", "Code Review", "Final"];

const today = new Date();

const addDays = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => new Date(`${value}T00:00:00`);

const formatShortDate = (value: string) =>
  parseDateValue(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const formatLongDate = (value: string) =>
  parseDateValue(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const PANEL_STORAGE_KEY = "edusync.calendar.panels";
const FROZEN_STORAGE_KEY = "edusync.calendar.frozenDates";

const loadStoredJson = <T,>(storageKey: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const normalizeFrozenDates = (value: unknown): FrozenDateRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { date: item, reason: "" };
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const date =
          typeof record.date === "string"
            ? record.date
            : typeof record.frozenDate === "string"
              ? record.frozenDate
              : "";
        const reason =
          typeof record.reason === "string"
            ? record.reason
            : typeof record.freezeReason === "string"
              ? record.freezeReason
              : "";

        if (!date) {
          return null;
        }

        return { date, reason };
      }

      return null;
    })
    .filter((item): item is FrozenDateRecord => item !== null);
};

const makeMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const storedUserRole = useMemo(() => {
    const stored = loadStoredJson<Record<string, unknown> | null>("user", null);
    if (!stored || typeof stored.role !== "string") {
      return null;
    }

    return stored.role;
  }, []);
  const userRole = user?.role ?? storedUserRole;
  const isCoordinator = userRole === "coordinator";

  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("schedule");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(
    toDateValue(addDays(today, 2)),
  );
  const [freezeDate, setFreezeDate] = useState(toDateValue(addDays(today, 1)));
  const [evaluationType, setEvaluationType] = useState(evaluationTypes[0]);
  const [selectedLevel, setSelectedLevel] = useState<string>("1");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<number[]>(
    [],
  );
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [duration, setDuration] = useState("60 min");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeLevel, setFreezeLevel] = useState<string>('');
  const [freezeGroupId, setFreezeGroupId] = useState<string>('');
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorsError, setSupervisorsError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [scheduledPanels, setScheduledPanels] = useState<ScheduledPanel[]>(() =>
    loadStoredJson<ScheduledPanel[]>(PANEL_STORAGE_KEY, []),
  );
  const [frozenDates, setFrozenDates] = useState<FrozenDateRecord[]>(() =>
    normalizeFrozenDates(loadStoredJson(FROZEN_STORAGE_KEY, [])),
  );

  const monthName = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const normalizeList = (data: unknown) => {
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }

    const payload = data as Record<string, unknown> | null;
    if (Array.isArray(payload?.data))
      return payload.data as Record<string, unknown>[];
    if (Array.isArray(payload?.results))
      return payload.results as Record<string, unknown>[];
    if (Array.isArray(payload?.users))
      return payload.users as Record<string, unknown>[];
    if (Array.isArray(payload?.supervisors))
      return payload.supervisors as Record<string, unknown>[];
    if (Array.isArray(payload?.groups))
      return payload.groups as Record<string, unknown>[];
    return [];
  };

  const openDrawer = (mode: DrawerMode, dateValue?: string) => {
    setDrawerMode(mode);
    setIsDrawerOpen(true);
    if (mode === "freeze") {
      setEditingPanelId(null);
    }
    if (dateValue) {
      if (mode === "freeze") {
        setFreezeDate(dateValue);
      } else {
        setScheduleDate(dateValue);
      }
    }
  };

  const resetScheduleFields = () => {
    setEditingPanelId(null);
    setEvaluationType(evaluationTypes[0]);
    setSelectedLevel("1");
    setSelectedGroupId("");
    setSelectedSupervisorIds([]);
    setScheduleTime("10:00");
    setDuration("60 min");
    setLocation("");
    setMeetingLink("");
    setNotes("");
    setFreezeReason("");
    setFreezeLevel("");
    setFreezeGroupId("");
  };

  const openCreatePanelDrawer = () => {
    resetScheduleFields();
    setDrawerMode("schedule");
    setIsDrawerOpen(true);
  };

  const openEditPanelDrawer = (panel: ScheduledPanel) => {
    if (!isCoordinator) {
      return;
    }

    setEditingPanelId(panel.id);
    setDrawerMode("schedule");
    setIsDrawerOpen(true);
    setScheduleDate(panel.date);
    setEvaluationType(panel.title);
    setSelectedLevel(String(panel.level));
    setSelectedGroupId(String(panel.groupId));
    setSelectedSupervisorIds(
      panel.evaluators
        .map(
          (name) =>
            supervisors.find((supervisor) => supervisor.name === name)?.id,
        )
        .filter((id): id is number => typeof id === "number"),
    );
    setScheduleTime(panel.time);
    setDuration(panel.duration);
    setLocation(panel.location);
    setMeetingLink(panel.meetingLink);
    setNotes(panel.notes);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingPanelId(null);
  };

  const fetchSupervisors = async () => {
    setSupervisorsLoading(true);
    setSupervisorsError(null);

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const endpoints = [
      "http://localhost:5000/api/groups/supervisors",
      "http://localhost:5000/api/users?role=supervisor",
      "http://localhost:5000/api/users/supervisors",
      "http://localhost:5000/api/admin/supervisors",
    ];

    try {
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, { headers });
        if (!response.ok) continue;

        const data = await response.json();
        const list = normalizeList(data)
          .map((item) => {
            const id = typeof item.id === "number" ? item.id : Number(item.id);
            const name = String(
              item.name ?? item.full_name ?? item.fullName ?? "",
            ).trim();
            const email = String(item.email ?? "").trim();

            if (!Number.isFinite(id) || !name) return null;

            return { id, name, email };
          })
          .filter((item): item is SupervisorOption => item !== null);

        if (list.length > 0) {
          setSupervisors(list);
          return;
        }
      }

      throw new Error("No supervisors found from the available endpoints.");
    } catch (error) {
      setSupervisorsError(
        error instanceof Error ? error.message : "Failed to load supervisors.",
      );
      setSupervisors([]);
    } finally {
      setSupervisorsLoading(false);
    }
  };

  const fetchGroups = async (level: string, mode: DrawerMode = 'schedule') => {
    setGroupsLoading(true);
    setGroupsError(null);

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      const response = await fetch(
        `http://localhost:5000/api/groups/level/${level}?coordinatorId=${user?.id}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error(`Failed to load groups for level ${level}.`);
      }

      const data = await response.json();
      const list = normalizeList(data)
        .map((item) => {
          const id = item.group_id ?? item.id ?? item.groupId ?? item.groupID;
          const name = String(
            item.group_name ?? item.groupName ?? item.name ?? "",
          ).trim();
          const supervisor = String(
            item.supervisor_name ??
              item.supervisorName ??
              item.supervisor ??
              "Not assigned",
          ).trim();
          const memberCount = Number(
            item.member_count ??
              item.memberCount ??
              (Array.isArray(item.members) ? item.members.length : 0),
          );

          if (!name) return null;

          return {
            id: id ?? name,
            name,
            supervisor,
            memberCount: Number.isFinite(memberCount) ? memberCount : 0,
          };
        })
        .filter((item): item is GroupOption => item !== null);

      setGroups(list);

      if (mode === 'schedule') {
        setSelectedGroupId((current) => {
          if (list.some((group) => String(group.id) === current)) {
            return current;
          }
          return '';
        });
      } else {
        setFreezeGroupId((current) => {
          if (list.some((group) => String(group.id) === current)) {
            return current;
          }
          return '';
        });
      }
    } catch (error) {
      setGroupsError(
        error instanceof Error ? error.message : "Failed to load groups.",
      );
      setGroups([]);
      if (mode === 'schedule') {
        setSelectedGroupId('');
      } else {
        setFreezeGroupId('');
      }
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PANEL_STORAGE_KEY,
      JSON.stringify(scheduledPanels),
    );
    window.localStorage.setItem(
      FROZEN_STORAGE_KEY,
      JSON.stringify(frozenDates),
    );
  }, [frozenDates, scheduledPanels]);

  useEffect(() => {
    if (!isDrawerOpen || drawerMode !== "schedule") {
      return;
    }

    fetchGroups(selectedLevel, 'schedule');
  }, [drawerMode, isDrawerOpen, selectedLevel]);

  useEffect(() => {
    if (!isDrawerOpen || drawerMode !== 'freeze') {
      return;
    }

    if (!freezeLevel) {
      setGroups([]);
      setFreezeGroupId('');
      return;
    }

    fetchGroups(freezeLevel, 'freeze');
  }, [drawerMode, freezeLevel, isDrawerOpen]);

  const sortedPanels = useMemo(
    () =>
      [...scheduledPanels].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      ),
    [scheduledPanels],
  );

  const { cells, markerMap } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayCells: Array<number | null> = [];
    for (let i = 0; i < firstDayIndex; i += 1) dayCells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) dayCells.push(d);
    while (dayCells.length < 42) dayCells.push(null);

    const mapped = new Map<number, CalendarGridMarker>();

    scheduledPanels.forEach((panel) => {
      const panelDate = parseDateValue(panel.date);
      if (panelDate.getFullYear() !== year || panelDate.getMonth() !== month) {
        return;
      }

      const day = panelDate.getDate();
      const current = mapped.get(day);
      const existingPanels = current?.panels ?? 0;

      mapped.set(day, {
        day,
        type: "panel",
        panels: existingPanels + 1,
        label: panel.title,
      });
    });

    frozenDates.forEach((value) => {
      const frozenDate = parseDateValue(value.date);
      if (
        frozenDate.getFullYear() !== year ||
        frozenDate.getMonth() !== month
      ) {
        return;
      }

      mapped.set(frozenDate.getDate(), {
        day: frozenDate.getDate(),
        type: "frozen",
        label: "Frozen date",
      });
    });

    return { cells: dayCells, markerMap: mapped };
  }, [frozenDates, scheduledPanels, viewDate]);

  const handleScheduleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedGroup = groups.find(
      (group) => String(group.id) === selectedGroupId,
    );
    const selectedEvaluators = supervisors.filter((supervisor) =>
      selectedSupervisorIds.includes(supervisor.id),
    );

    if (!selectedGroup) {
      alert("Please select a group before scheduling a panel.");
      return;
    }

    if (!selectedEvaluators.length) {
      alert("Please select at least one evaluator.");
      return;
    }

    if (frozenDates.some((item) => item.date === scheduleDate)) {
      alert("That date is frozen. Please choose another day.");
      return;
    }

    const nextPanel: ScheduledPanel = {
      id: editingPanelId ?? `panel-${Date.now()}`,
      title: evaluationType,
      level: Number(selectedLevel),
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      date: scheduleDate,
      time: scheduleTime,
      duration,
      evaluators: selectedEvaluators.map((supervisor) => supervisor.name),
      location: location.trim() || "To be announced",
      meetingLink: meetingLink.trim(),
      notes: notes.trim(),
      kind: "Coordinator scheduled panel",
    };

    setScheduledPanels((current) =>
      editingPanelId
        ? current.map((panel) =>
            panel.id === editingPanelId ? nextPanel : panel,
          )
        : [nextPanel, ...current],
    );
    setDrawerMode("schedule");
    setIsDrawerOpen(false);
    setEditingPanelId(null);
    setSelectedSupervisorIds([]);
    setLocation("");
    setMeetingLink("");
    setNotes("");
  };

  const deletePanel = (panelId: string) => {
    if (!isCoordinator) {
      return;
    }

    const panel = scheduledPanels.find((item) => item.id === panelId);
    const confirmed = window.confirm(`Delete ${panel?.title ?? "this panel"}?`);
    if (!confirmed) {
      return;
    }

    setScheduledPanels((current) =>
      current.filter((item) => item.id !== panelId),
    );
    if (editingPanelId === panelId) {
      setIsDrawerOpen(false);
      setEditingPanelId(null);
    }
  };

  const handleFreezeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!freezeDate) {
      alert("Please choose a date to freeze.");
      return;
    }

    const trimmedReason = freezeReason.trim();
    setFrozenDates((current) =>
      current.some((item) => item.date === freezeDate)
        ? current.map((item) =>
            item.date === freezeDate
              ? { ...item, reason: trimmedReason }
              : item,
          )
        : [{ date: freezeDate, reason: trimmedReason }, ...current],
    );
    setIsDrawerOpen(false);
    setFreezeReason("");
  };

  const toggleSupervisor = (supervisorId: number) => {
    setSelectedSupervisorIds((current) =>
      current.includes(supervisorId)
        ? current.filter((value) => value !== supervisorId)
        : [...current, supervisorId],
    );
  };

  const onDayClick = (day: number) => {
    if (!isCoordinator) {
      return;
    }

    const dateValue = toDateValue(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), day),
    );
    openCreatePanelDrawer();
    setScheduleDate(dateValue);
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
            <div className="calendar-header-row">
              <div>
                <h2 className="calendar-page-title">Calendar</h2>
                <p className="calendar-page-subtitle">
                  Manage evaluation panels, frozen dates, and project schedules
                </p>
              </div>

              {(isCoordinator || userRole === "supervisor") && (
                <div className="calendar-action-row">
                  {isCoordinator && (
                    <>
                      <button
                        type="button"
                        className="freeze-date-btn ghost-btn"
                        onClick={() => openDrawer("freeze")}
                      >
                        <CalendarDays size={16} />
                        Freeze Date
                      </button>

                      <button
                        type="button"
                        className="freeze-date-btn"
                        onClick={openCreatePanelDrawer}
                      >
                        <Plus size={16} />
                        Schedule Panel
                      </button>
                    </>
                  )}

                  {/* Supervisor Tools! Both components are rendered here side-by-side */}
                  {userRole === "supervisor" && (
                    <>
                      <SupervisorTaskScheduler />
                      <SupervisorPartInCalendar />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="calendar-layout-grid">
              <CalendarGrid
                monthName={monthName}
                cells={cells}
                markerMap={markerMap}
                isCoordinator={isCoordinator}
                onPrevMonth={() =>
                  setViewDate(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
                onNextMonth={() =>
                  setViewDate(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
                onDayClick={onDayClick}
              />

              <aside
                className="calendar-right-card"
                aria-label="Upcoming panels"
              >
                <div className="calendar-side-header">
                  <h3>Upcoming Panels</h3>
                  <span className="calendar-side-count">
                    {scheduledPanels.length}
                  </span>
                </div>
                <div className="upcoming-list">
                  {sortedPanels.length === 0 ? (
                    <div className="empty-state-card">
                      <strong>No saved panels yet</strong>
                      <span>
                        Create a panel from the drawer and it will stay after
                        refresh.
                      </span>
                    </div>
                  ) : (
                    sortedPanels.map((panel) => (
                      <article key={panel.id} className="upcoming-item">
                        <div className="upcoming-date-chip">
                          {formatShortDate(panel.date)}
                        </div>
                        <div className="upcoming-copy">
                          <strong>{panel.title}</strong>
                          <span>
                            {panel.groupName} • Level {panel.level}
                          </span>
                          <span>{panel.kind}</span>
                          <span className="panel-time">
                            {panel.time} • {panel.duration}
                          </span>
                          {isCoordinator && (
                            <div className="panel-action-row">
                              <button
                                type="button"
                                className="panel-action-btn edit"
                                onClick={() => openEditPanelDrawer(panel)}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="panel-action-btn delete"
                                onClick={() => deletePanel(panel.id)}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {isDrawerOpen && isCoordinator && (
        <div
          className="drawer-overlay"
          role="presentation"
          onClick={closeDrawer}
        >
          <aside
            className="schedule-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Schedule panel drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-kicker">Coordinator tools</p>
                <h3>
                  {drawerMode === "schedule" ? "Schedule Panel" : "Freeze Date"}
                </h3>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-switcher">
              <button
                type="button"
                className={
                  drawerMode === "schedule"
                    ? "drawer-switch active"
                    : "drawer-switch"
                }
                onClick={() => setDrawerMode("schedule")}
              >
                <CalendarDays size={14} />
                Schedule Panel
              </button>
              <button
                type="button"
                className={
                  drawerMode === "freeze"
                    ? "drawer-switch active"
                    : "drawer-switch"
                }
                onClick={() => setDrawerMode("freeze")}
              >
                <CalendarDays size={14} />
                Freeze Date
              </button>
            </div>

            {drawerMode === "schedule" ? (
              <form className="drawer-form" onSubmit={handleScheduleSubmit}>
                <div className="drawer-summary-card">
                  <span className="drawer-summary-label">Selected date</span>
                  <strong>{formatLongDate(scheduleDate)}</strong>
                  <span>
                    {frozenDates.some((item) => item.date === scheduleDate)
                      ? "This date is currently frozen."
                      : "Date available for scheduling."}
                  </span>
                </div>

                <label className="drawer-field">
                  <span>Evaluation Type</span>
                  <select
                    value={evaluationType}
                    onChange={(event) => setEvaluationType(event.target.value)}
                  >
                    {evaluationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="drawer-field">
                  <span>Academic Level</span>
                  <select
                    value={selectedLevel}
                    onChange={(event) => setSelectedLevel(event.target.value)}
                  >
                    {levelOptions.map((level) => (
                      <option
                        key={level}
                        value={level}
                      >{`Level ${level}`}</option>
                    ))}
                  </select>
                </label>

                <label className="drawer-field">
                  <span>Select Group</span>
                  <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} disabled={groupsLoading || groups.length === 0}>
                    <option value="" disabled>{groupsLoading ? 'Loading groups...' : 'Choose a group'}</option>
                    {groups.map((group) => (
                      <option key={String(group.id)} value={String(group.id)}>
                        {group.name}{" "}
                        {group.supervisor ? `• ${group.supervisor}` : ""}
                      </option>
                    ))}
                  </select>
                  {groupsError && (
                    <span className="drawer-help error">{groupsError}</span>
                  )}
                </label>

                <label className="drawer-field">
                  <span>Selected Evaluators</span>
                  <div className="supervisor-picker">
                    {supervisorsLoading ? (
                      <div className="drawer-help">Loading supervisors...</div>
                    ) : supervisorsError ? (
                      <div className="drawer-help error">
                        {supervisorsError}
                      </div>
                    ) : supervisors.length === 0 ? (
                      <div className="drawer-help">
                        No supervisors available.
                      </div>
                    ) : (
                      supervisors.map((supervisor) => (
                        <button
                          key={supervisor.id}
                          type="button"
                          className={
                            selectedSupervisorIds.includes(supervisor.id)
                              ? "supervisor-chip active"
                              : "supervisor-chip"
                          }
                          onClick={() => toggleSupervisor(supervisor.id)}
                        >
                          <Users size={13} />
                          <span>{supervisor.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedSupervisorIds.length > 0 && (
                    <div className="selected-summary">
                      {selectedSupervisorIds.map((id) => {
                        const supervisor = supervisors.find(
                          (item) => item.id === id,
                        );
                        return supervisor ? (
                          <span key={id}>{supervisor.name}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                </label>

                <div className="drawer-inline-grid">
                  <label className="drawer-field">
                    <span>Date</span>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                    />
                  </label>
                  <label className="drawer-field">
                    <span>Time</span>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                    />
                  </label>
                </div>

                <label className="drawer-field">
                  <span>Duration</span>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  >
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                    <option value="60 min">60 min</option>
                    <option value="90 min">90 min</option>
                  </select>
                </label>

                <label className="drawer-field">
                  <span>Location / Meeting Link</span>
                  <input
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Room B-204 or https://meet.example.com/..."
                  />
                </label>

                <label className="drawer-field">
                  <span>Meeting Link (optional)</span>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(event) => setMeetingLink(event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <label className="drawer-field">
                  <span>Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add context for the panel..."
                  />
                </label>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="drawer-secondary-btn"
                    onClick={closeDrawer}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="drawer-primary-btn">
                    {editingPanelId ? "Update Panel" : "Save Panel"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="drawer-form" onSubmit={handleFreezeSubmit}>
                <div className="drawer-summary-card freeze-card">
                  <span className="drawer-summary-label">Freeze window</span>
                  <strong>{formatLongDate(freezeDate)}</strong>
                  <span>
                    Freezing a date blocks panel scheduling for that day.
                  </span>
                </div>

                <label className="drawer-field">
                  <span>Level (Optional)</span>
                  <select value={freezeLevel} onChange={(event) => { setFreezeLevel(event.target.value); setFreezeGroupId(''); }}>
                    <option value="">All Levels</option>
                    {levelOptions.map((level) => (
                      <option key={level} value={String(level)}>
                        Level {level}
                      </option>
                    ))}
                  </select>
                </label>

                {freezeLevel && (
                  <label className="drawer-field">
                    <span>Group (Optional)</span>
                    <select value={freezeGroupId} onChange={(event) => setFreezeGroupId(event.target.value)} disabled={groupsLoading || groups.length === 0}>
                      <option value="">{groupsLoading ? 'Loading groups...' : 'All Groups'}</option>
                      {groups.map((group) => (
                        <option key={String(group.id)} value={String(group.id)}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    {groupsError && <span className="drawer-help error">{groupsError}</span>}
                  </label>
                )}

                <label className="drawer-field">
                  <span>Freeze Date</span>
                  <input
                    type="date"
                    value={freezeDate}
                    onChange={(event) => setFreezeDate(event.target.value)}
                  />
                </label>

                <label className="drawer-field">
                  <span>Reason</span>
                  <textarea
                    value={freezeReason}
                    onChange={(event) => setFreezeReason(event.target.value)}
                    placeholder="Reason for freezing this date"
                  />
                </label>

                <div className="drawer-field frozen-preview">
                  <span>Frozen Dates</span>
                  <div className="frozen-list">
                    {frozenDates.map((value) => (
                      <span
                        key={value.date}
                        title={value.reason || "No reason added"}
                      >
                        {formatShortDate(value.date)}
                        {value.reason ? ` - ${value.reason}` : ""}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="drawer-secondary-btn"
                    onClick={closeDrawer}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="drawer-primary-btn">
                    Freeze Date
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
