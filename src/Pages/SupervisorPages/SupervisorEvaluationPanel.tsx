import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import "./SupervisorLevelPage.css";

interface GroupMember {
  student_id: number | string;
  student_name: string;
  student_email?: string;
  reg_number?: string;
  is_leader?: boolean;
  academic_unit?: string;
  marks?: number | string;
  total_marks?: number;
  feedback?: string;
  stage_avg_mark?: number | null;
  evaluator_count?: number;
}

interface GroupData {
  panel_id?: number | string;
  group_id: number | string;
  group_name: string;
  project_title: string;
  evaluation_type?: string;
  academic_level?: string | number;
  stage_id?: number | string;
  stage_name?: string;
  panel_date?: string;
  start_time?: string;
  duration?: string;
  location?: string;
  evaluators?: string;
  leader_name?: string;
  total_marks?: number;
  members: GroupMember[];
}

interface StudentSummary {
  student_id: number | string;
  student_name: string;
  university_id: string;
  group_name: string;
  is_leader: boolean;
  stages: {
    [stageId: string]: {
      stage_name: string;
      average_mark: number | null;
      evaluator_count: number;
      evaluators: Array<{ evaluator_name: string; mark: number; feedback: string }>;
    };
  };
  final_mark: number;
  stages_completed: number;
  total_stages: number;
}

const TOTAL_MARKS_PRESETS = [100, 50, 40, 30, 25, 20, 10];

const getPanelKey = (g: GroupData) => String(g.panel_id || `${g.group_id}_${g.stage_id || g.evaluation_type}`);

const SupervisorEvaluationPanel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialLevel = searchParams.get("level") ? Number(searchParams.get("level")) : 2;
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel || 2);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedPanelKey, setSelectedPanelKey] = useState<string>(() => {
    const pId = searchParams.get("panelId");
    return pId ? String(pId) : "";
  });
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  // Dynamic Total / Maximum Marks setting (out of 100, 50, 40, 30, etc.)
  const [totalMaxMarks, setTotalMaxMarks] = useState<number>(100);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Summary state for showing combined stage marks and student final marks
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [levelSummary, setLevelSummary] = useState<StudentSummary[]>([]);
  const [stagesList, setStagesList] = useState<Array<{ stage_id: number; stage_name: string }>>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Student Marks and Feedback state dictionary: { [student_id]: { marks, feedback } }
  const [evaluations, setEvaluations] = useState<{
    [key: string]: { marks: string; feedback: string };
  }>({});

  // Resolve current user / supervisor identity
  const currentEvaluator = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return { name: "", id: "" };
      const u = JSON.parse(raw);
      const joinedName = [u.first_name, u.last_name].filter(Boolean).join(" ");
      return {
        name: u.name || u.full_name || joinedName || "",
        id: u.id || u.user_id || "",
      };
    } catch {
      return { name: "", id: "" };
    }
  }, []);

  // Fetch groups assigned for evaluation
  const fetchAssignedGroups = async (levelNum: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      const url = `http://localhost:5000/api/evaluation-panels/my-groups?level=${levelNum}&evaluatorName=${encodeURIComponent(
        currentEvaluator.name
      )}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const loadedGroups: GroupData[] = data.data || [];
        setGroups(loadedGroups);

        if (loadedGroups.length > 0) {
          const urlPanelId = searchParams.get("panelId");
          const urlGroupId = searchParams.get("groupId");

          let chosenGroup: GroupData | undefined;
          if (urlPanelId) {
            chosenGroup = loadedGroups.find((g) => String(g.panel_id) === String(urlPanelId));
          }
          if (!chosenGroup && urlGroupId) {
            chosenGroup = loadedGroups.find((g) => String(g.group_id) === String(urlGroupId));
          }
          if (!chosenGroup && selectedPanelKey) {
            chosenGroup = loadedGroups.find((g) => getPanelKey(g) === String(selectedPanelKey));
          }
          if (!chosenGroup) {
            chosenGroup = loadedGroups[0];
          }

          const chosenKey = getPanelKey(chosenGroup);
          setSelectedPanelKey(chosenKey);
          setSelectedGroup(chosenGroup);
          if (chosenGroup.total_marks) {
            setTotalMaxMarks(Number(chosenGroup.total_marks));
          }
        } else {
          setSelectedPanelKey("");
          setSelectedGroup(null);
        }
      } else {
        setGroups([]);
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error("Failed to load evaluation groups", err);
      setMessage({ type: "error", text: "Failed to connect to backend server." });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch marks summary (aggregates evaluators -> stage marks -> final marks)
  const fetchLevelSummary = async (levelNum: number) => {
    setLoadingSummary(true);
    try {
      const response = await fetch(`http://localhost:5000/api/marks/summary/level/${levelNum}`);
      if (response.ok) {
        const resData = await response.json();
        setLevelSummary(resData.data || []);
        setStagesList(resData.stages || []);
      }
    } catch (err) {
      console.error("Failed to fetch marks summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchAssignedGroups(selectedLevel);
  }, [selectedLevel]);

  // Update selected group when dropdown selection or groups change
  useEffect(() => {
    if (!groups.length) {
      setSelectedGroup(null);
      return;
    }
    const group = groups.find((g) => getPanelKey(g) === String(selectedPanelKey)) || groups[0] || null;
    setSelectedGroup(group);

    // Initialize evaluation inputs for each student
    if (group && group.members) {
      if (group.total_marks) {
        setTotalMaxMarks(Number(group.total_marks));
      }

      const initialEval: { [key: string]: { marks: string; feedback: string } } = {};
      group.members.forEach((m) => {
        const rawFeedback = m.feedback || "";
        // Clean out test dummy feedback if present
        const cleanFeedback = rawFeedback.toLowerCase().includes("good progress") ? "" : rawFeedback;
        initialEval[String(m.student_id)] = {
          marks: m.marks !== undefined && m.marks !== null && m.marks !== "" ? String(m.marks) : "",
          feedback: cleanFeedback,
        };
      });
      setEvaluations(initialEval);
    }
  }, [selectedPanelKey, groups]);

  const handleInputChange = (
    studentId: string | number,
    field: "marks" | "feedback",
    value: string
  ) => {
    if (field === "marks") {
      const numVal = Number(value);
      const effectiveMax = totalMaxMarks > 0 ? Math.min(100, totalMaxMarks) : 100;
      if (value !== "" && (numVal < 0 || numVal > effectiveMax)) {
        return; // Prevent values outside 0 - effectiveMax
      }
    }

    setEvaluations((prev) => ({
      ...prev,
      [String(studentId)]: {
        ...prev[String(studentId)],
        [field]: value,
      },
    }));
  };

  const handleTotalMaxMarksChange = (newMax: number) => {
    // Hard cap at 100 maximum
    const cappedMax = Math.min(100, Math.max(0, newMax));
    setTotalMaxMarks(cappedMax);

    if (cappedMax > 0) {
      // Adjust any existing inputs that exceed new max marks
      setEvaluations((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (updated[id]?.marks && Number(updated[id].marks) > cappedMax) {
            updated[id].marks = String(cappedMax);
          }
        });
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    // Collect only students who have marks entered
    const validEvaluations = (selectedGroup.members || [])
      .filter((m) => {
        const sId = String(m.student_id);
        const evalData = evaluations[sId];
        return evalData && evalData.marks !== "" && evalData.marks !== undefined && evalData.marks !== null;
      })
      .map((m) => {
        const sId = String(m.student_id);
        const evalData = evaluations[sId];
        return {
          student_id: m.student_id,
          marks: Number(evalData.marks),
          feedback: evalData.feedback || "",
        };
      });

    if (validEvaluations.length === 0) {
      setMessage({
        type: "error",
        text: "Please enter marks for at least one student before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      panel_id: selectedGroup.panel_id,
      group_id: selectedGroup.group_id,
      stage_id: selectedGroup.stage_id,
      evaluation_type: selectedGroup.evaluation_type,
      academic_level: selectedLevel,
      evaluator_name: currentEvaluator.name,
      marked_by: currentEvaluator.id,
      total_marks: totalMaxMarks || 100,
      evaluations: validEvaluations,
    };

    try {
      const response = await fetch("http://localhost:5000/api/evaluation-panels/submit-marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Marks and feedback for ${selectedGroup.group_name} (${selectedGroup.evaluation_type || "Stage"}) saved successfully out of ${totalMaxMarks}!`,
        });
        // Re-fetch groups to update the calculated stage averages
        fetchAssignedGroups(selectedLevel);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: errorData.message || "Failed to submit marks. Please try again.",
        });
      }
    } catch (err) {
      console.error("Error submitting evaluations", err);
      setMessage({ type: "error", text: "Server connection error. Failed to save marks." });
    } finally {
      setSubmitting(false);
    }
  };

  // Stage Badge Style Helper
  const getStageBadgeStyle = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("proposal")) {
      return { backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" };
    }
    if (t.includes("interim")) {
      return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
    }
    if (t.includes("final")) {
      return { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    }
    return { backgroundColor: "#f3e8ff", color: "#6b21a8", border: "1px solid #e9d5ff" };
  };

  // Parse evaluator names safely
  const parseEvaluatorsList = (evalStr?: string): string[] => {
    if (!evalStr) return [];
    try {
      const parsed = JSON.parse(evalStr);
      if (Array.isArray(parsed)) return parsed;
      return [String(evalStr)];
    } catch {
      return [String(evalStr)];
    }
  };

  return (
    <div className="app-layout supervisor-shell">
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header />

        <main className="content-container supervisor-content-container">
          <div className="supervisor-level-page">
            {/* Page Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ margin: 0, color: "#0f172a" }}>Evaluation Panel Marks Entry</h2>
                  <span
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Level {selectedLevel}
                  </span>
                </div>
                <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
                  Evaluate assigned project groups and assign individual marks & feedback for each student.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/calendar")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#94a3b8";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                >
                  ← Back to Calendar
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {message && (
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: message.type === "success" ? "#15803d" : "#b91c1c",
                  border: `1px solid ${message.type === "success" ? "#86efac" : "#fca5a5"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                <span>{message.type === "success" ? "✅ " : "⚠️ "}{message.text}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "16px",
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
                <p style={{ color: "#64748b", margin: 0, fontWeight: "500" }}>
                  Loading assigned evaluation panels for Level {selectedLevel}...
                </p>
              </div>
            ) : groups.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>
                  No Evaluation Panels Assigned
                </h3>
                <p style={{ color: "#64748b", maxWidth: "500px", margin: "0 auto 16px auto", fontSize: "14px" }}>
                  You are currently not listed as an active evaluator in any evaluation panel for Level {selectedLevel}.
                  Please select another level or contact the coordinator if you should be assigned.
                </p>
                <button
                  type="button"
                  onClick={() => fetchAssignedGroups(selectedLevel)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  🔄 Refresh Status
                </button>
              </div>
            ) : (
              <>
                {/* Group Selector & Panel Info Banner */}
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "18px 20px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <label htmlFor="group-select" style={{ fontWeight: "600", color: "#1e293b", fontSize: "14px" }}>
                      Assigned Group:
                    </label>
                    <select
                      id="group-select"
                      value={selectedPanelKey}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setSelectedPanelKey(newKey);
                        const target = groups.find((g) => getPanelKey(g) === newKey);
                        if (target) {
                          setSearchParams({
                            level: String(selectedLevel),
                            groupId: String(target.group_id),
                            panelId: String(target.panel_id || ""),
                          });
                        }
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        minWidth: "320px",
                        backgroundColor: "#ffffff",
                        fontWeight: "500",
                        color: "#0f172a",
                      }}
                    >
                      {groups.map((group) => {
                        const key = getPanelKey(group);
                        return (
                          <option key={key} value={key}>
                            {group.group_name} — {group.evaluation_type || group.stage_name || "Evaluation"}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedGroup && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      {selectedGroup.evaluation_type && (
                        <span
                          style={{
                            ...getStageBadgeStyle(selectedGroup.evaluation_type),
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          Stage: {selectedGroup.evaluation_type}
                        </span>
                      )}

                      {selectedGroup.panel_date && (
                        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
                          📅 {new Date(selectedGroup.panel_date).toLocaleDateString()}
                          {selectedGroup.start_time ? ` at ${selectedGroup.start_time}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Main Evaluation Form */}
                {selectedGroup && (
                  <form onSubmit={handleSubmit}>
                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        padding: "24px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* Group Header & Evaluator Context */}
                      <div
                        style={{
                          marginBottom: "20px",
                          borderBottom: "1px solid #f1f5f9",
                          paddingBottom: "16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <h3 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "18px" }}>
                            {selectedGroup.group_name}
                          </h3>
                          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                            <strong>Leader:</strong> {selectedGroup.leader_name || "N/A"} •{" "}
                            <strong>Members:</strong> {selectedGroup.members?.length || 0} students
                          </p>
                        </div>

                        {/* Panel Evaluators pill */}
                        <div
                          style={{
                            backgroundColor: "#f1f5f9",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: "#334155",
                          }}
                        >
                          <strong>Panel Evaluators:</strong>{" "}
                          {parseEvaluatorsList(selectedGroup.evaluators).join(", ") || "Assigned Panel"}
                        </div>
                      </div>


                      {/* Marks Table */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", color: "#475569", fontSize: "13px" }}>
                              <th style={{ padding: "12px 14px", borderBottom: "2px solid #e2e8f0" }}>Student Details</th>
                              <th style={{ padding: "12px 14px", borderBottom: "2px solid #e2e8f0" }}>Reg / Index No</th>
                              <th style={{ padding: "12px 14px", borderBottom: "2px solid #e2e8f0", minWidth: "190px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span>Your Mark</span>
                                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>(/</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={totalMaxMarks || ""}
                                    onChange={(e) => {
                                      const rawVal = e.target.value === "" ? 0 : Number(e.target.value);
                                      const val = Math.min(100, rawVal);
                                      handleTotalMaxMarksChange(val);
                                    }}
                                    onBlur={() => {
                                      if (!totalMaxMarks || totalMaxMarks <= 0) {
                                        handleTotalMaxMarksChange(100);
                                      } else if (totalMaxMarks > 100) {
                                        handleTotalMaxMarksChange(100);
                                      }
                                    }}
                                    title="Type total marks (Maximum 100, e.g. 100, 50, 40, 30, 20)"
                                    placeholder="100"
                                    style={{
                                      width: "55px",
                                      padding: "3px 6px",
                                      borderRadius: "6px",
                                      border: "1.5px solid #2563eb",
                                      backgroundColor: "#eff6ff",
                                      color: "#1d4ed8",
                                      fontWeight: "700",
                                      fontSize: "13px",
                                      textAlign: "center",
                                      cursor: "pointer",
                                    }}
                                  />
                                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>)</span>
                                </div>
                              </th>
                              <th style={{ padding: "12px 14px", borderBottom: "2px solid #e2e8f0", width: "180px" }}>
                                Stage Average (All Evaluators)
                              </th>
                              <th style={{ padding: "12px 14px", borderBottom: "2px solid #e2e8f0" }}>Feedback & Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedGroup.members || []).map((member) => {
                              const sId = String(member.student_id);
                              const currentMarkVal = evaluations[sId]?.marks || "";
                              const currentNum = Number(currentMarkVal);
                              const currentPercent = currentMarkVal !== "" && totalMaxMarks > 0 
                                ? Math.round((currentNum / totalMaxMarks) * 100) 
                                : null;

                              return (
                                <tr key={sId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  {/* Student Name */}
                                  <td style={{ padding: "14px", verticalAlign: "middle" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "14px" }}>
                                        {member.student_name}
                                      </span>
                                      {member.is_leader && (
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            backgroundColor: "#2563eb",
                                            color: "#fff",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          Leader
                                        </span>
                                      )}
                                    </div>
                                    {member.student_email && (
                                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                                        {member.student_email}
                                      </div>
                                    )}
                                  </td>

                                  {/* Reg / University ID */}
                                  <td style={{ padding: "14px", color: "#64748b", fontSize: "13px", verticalAlign: "middle" }}>
                                    {member.reg_number || "N/A"}
                                  </td>

                                  {/* Your Marks Input */}
                                  <td style={{ padding: "14px", verticalAlign: "middle" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input
                                          type="number"
                                          min="0"
                                          max={Math.min(100, totalMaxMarks || 100)}
                                          placeholder={`0-${Math.min(100, totalMaxMarks || 100)}`}
                                          value={evaluations[sId]?.marks || ""}
                                          onChange={(e) => handleInputChange(sId, "marks", e.target.value)}
                                          style={{
                                            width: "85px",
                                            padding: "8px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            color: "#0f172a",
                                            textAlign: "center",
                                          }}
                                        />
                                        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                                          /{Math.min(100, totalMaxMarks || 100)}
                                        </span>
                                      </div>

                                      {currentPercent !== null && (
                                        <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600" }}>
                                          = {currentPercent}%
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Stage Average Display */}
                                  <td style={{ padding: "14px", verticalAlign: "middle" }}>
                                    {member.stage_avg_mark !== null && member.stage_avg_mark !== undefined ? (
                                      <div>
                                        <span
                                          style={{
                                            fontWeight: "700",
                                            fontSize: "14px",
                                            color: (member.stage_avg_mark / totalMaxMarks) >= 0.5 ? "#16a34a" : "#dc2626",
                                            backgroundColor: (member.stage_avg_mark / totalMaxMarks) >= 0.5 ? "#dcfce7" : "#fee2e2",
                                            padding: "3px 8px",
                                            borderRadius: "6px",
                                          }}
                                        >
                                          {member.stage_avg_mark} /{totalMaxMarks} ({Math.round((member.stage_avg_mark / totalMaxMarks) * 100)}%)
                                        </span>
                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                                          {member.evaluator_count || 1} evaluator{(member.evaluator_count || 1) > 1 ? "s" : ""}
                                        </div>
                                      </div>
                                    ) : (
                                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>Pending evaluation</span>
                                    )}
                                  </td>

                                  {/* Feedback Input */}
                                  <td style={{ padding: "14px", verticalAlign: "middle" }}>
                                    <input
                                      type="text"
                                      placeholder="Feedback, comments..."
                                      value={evaluations[sId]?.feedback || ""}
                                      onChange={(e) => handleInputChange(sId, "feedback", e.target.value)}
                                      style={{
                                        width: "96%",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        color: "#1e293b",
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Action Footer */}
                      <div
                        style={{
                          marginTop: "24px",
                          paddingTop: "16px",
                          borderTop: "1px solid #f1f5f9",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          Logged in as evaluator: <strong>{currentEvaluator.name || "Supervisor"}</strong>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            fontWeight: "600",
                            padding: "10px 28px",
                            borderRadius: "8px",
                            border: "none",
                            cursor: submitting ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            if (!submitting) e.currentTarget.style.backgroundColor = "#15803d";
                          }}
                          onMouseOut={(e) => {
                            if (!submitting) e.currentTarget.style.backgroundColor = "#16a34a";
                          }}
                        >
                          {submitting ? "Saving to Database..." : "Save & Submit Marks"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorEvaluationPanel;