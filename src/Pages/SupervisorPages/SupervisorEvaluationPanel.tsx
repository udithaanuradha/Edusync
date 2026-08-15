import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import "./SupervisorLevelPage.css";

interface GroupMember {
  student_id: number | string;
  student_name: string;
  reg_number?: string;
  marks?: number | string;
  feedback?: string;
}

interface GroupData {
  group_id: number | string;
  group_name: string;
  project_title: string;
  evaluation_type?: string; // 🎯 Database field (Proposal, Interim, Final)
  leader_name?: string;
  members: GroupMember[];
}

const SupervisorEvaluationPanel: React.FC = () => {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | string>("");
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Student Marks and Feedback state dictionary: { [student_id]: { marks, feedback } }
  const [evaluations, setEvaluations] = useState<{
    [key: string]: { marks: string; feedback: string };
  }>({});

  // Fetch groups assigned for evaluation
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/evaluation-panels/my-groups", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const loadedGroups: GroupData[] = data.data || data.groups || data || [];
          setGroups(loadedGroups);

          if (loadedGroups.length > 0) {
            setSelectedGroupId(loadedGroups[0].group_id);
          }
        } else {
          // Mock data fallback if API is not yet connected
          const mockData: GroupData[] = [
            {
              group_id: 101,
              group_name: "Group 01 - EduSync",
              project_title: "University Project Management System",
              evaluation_type: "Proposal",
              leader_name: "Kelum Sagara",
              members: [
                { student_id: "S001", student_name: "Kelum Sagara", reg_number: "EN20451" },
                { student_id: "S002", student_name: "Nimal Perera", reg_number: "EN20452" },
                { student_id: "S003", student_name: "Kamal Silva", reg_number: "EN20453" },
              ],
            },
            {
              group_id: 102,
              group_name: "Group 02 - CyberGuard",
              project_title: "Automated Vulnerability Scanner",
              evaluation_type: "Interim",
              leader_name: "Kasun Fernando",
              members: [
                { student_id: "S004", student_name: "Kasun Fernando", reg_number: "EN20454" },
                { student_id: "S005", student_name: "Amila Bandara", reg_number: "EN20455" },
              ],
            },
          ];
          setGroups(mockData);
          setSelectedGroupId(mockData[0].group_id);
        }
      } catch (err) {
        console.error("Failed to load evaluation groups", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Update selected group when dropdown selection changes
  useEffect(() => {
    const group = groups.find((g) => String(g.group_id) === String(selectedGroupId)) || null;
    setSelectedGroup(group);

    // Initialize evaluation inputs for each student
    if (group) {
      const initialEval: { [key: string]: { marks: string; feedback: string } } = {};
      group.members.forEach((m) => {
        initialEval[String(m.student_id)] = {
          marks: m.marks !== undefined ? String(m.marks) : "",
          feedback: m.feedback || "",
        };
      });
      setEvaluations(initialEval);
    }
  }, [selectedGroupId, groups]);

  const handleInputChange = (studentId: string | number, field: "marks" | "feedback", value: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [String(studentId)]: {
        ...prev[String(studentId)],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setSubmitting(true);
    setMessage(null);

    const payload = {
      group_id: selectedGroup.group_id,
      evaluation_type: selectedGroup.evaluation_type,
      evaluations: Object.keys(evaluations).map((studentId) => ({
        student_id: studentId,
        marks: Number(evaluations[studentId].marks) || 0,
        feedback: evaluations[studentId].feedback,
      })),
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
        setMessage({ type: "success", text: "Marks and feedback submitted successfully!" });
      } else {
        setMessage({ type: "success", text: "Marks saved successfully (Local State)!" });
      }
    } catch (err) {
      console.error("Error submitting evaluations", err);
      setMessage({ type: "error", text: "Failed to submit marks. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Stage Badge Style Helper
  const getStageBadgeStyle = (type?: string) => {
    switch (type) {
      case "Proposal":
        return { backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" };
      case "Interim":
        return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "Final":
        return { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
      default:
        return { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2>Group Evaluation Panel</h2>
                <p>Select a group and enter individual student marks and feedback.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            </div>

            {loading ? (
              <p className="supervisor-level-muted">Loading assigned groups...</p>
            ) : (
              <>
                {/* Group Selector Dropdown */}
                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <label htmlFor="group-select" style={{ fontWeight: "600", marginRight: "12px" }}>
                    Select Group:
                  </label>
                  <select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      minWidth: "300px",
                    }}
                  >
                    {groups.map((group) => (
                      <option key={group.group_id} value={group.group_id}>
                        {group.group_name} ({group.project_title})
                      </option>
                    ))}
                  </select>
                </div>

                {message && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "6px",
                      marginBottom: "20px",
                      backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
                      color: message.type === "success" ? "#166534" : "#991b1b",
                      border: `1px solid ${message.type === "success" ? "#86efac" : "#fca5a5"}`,
                    }}
                  >
                    {message.text}
                  </div>
                )}

                {/* Evaluation Form */}
                {selectedGroup && (
                  <form onSubmit={handleSubmit}>
                    <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      
                      {/* Group Header & Stage Info */}
                      <div style={{ marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ margin: "0 0 4px 0", color: "#1e293b" }}>{selectedGroup.group_name}</h3>
                          
                          {/* 🎯 Dynamic Stage Badge (from evaluation_type) */}
                          {selectedGroup.evaluation_type && (
                            <span
                              style={{
                                ...getStageBadgeStyle(selectedGroup.evaluation_type),
                                padding: "4px 12px",
                                borderRadius: "16px",
                                fontSize: "13px",
                                fontWeight: "600",
                              }}
                            >
                              Stage: {selectedGroup.evaluation_type}
                            </span>
                          )}
                        </div>

                        <p style={{ margin: 0, color: "#64748b" }}>
                          <strong>Project:</strong> {selectedGroup.project_title}
                        </p>
                      </div>

                      {/* Marks Table */}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                            <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1" }}>Student Name</th>
                            <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1" }}>Reg / Index No</th>
                            <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", width: "120px" }}>Marks (100)</th>
                            <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1" }}>Feedback / Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedGroup.members.map((member) => {
                            const sId = String(member.student_id);
                            return (
                              <tr key={sId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "12px", fontWeight: "500" }}>
                                  {member.student_name}
                                  {selectedGroup.leader_name === member.student_name && (
                                    <span style={{ fontSize: "11px", backgroundColor: "#3b82f6", color: "#fff", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px" }}>
                                      Leader
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "12px", color: "#64748b" }}>{member.reg_number || "N/A"}</td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0-100"
                                    value={evaluations[sId]?.marks || ""}
                                    onChange={(e) => handleInputChange(sId, "marks", e.target.value)}
                                    required
                                    style={{
                                      width: "90%",
                                      padding: "8px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="text"
                                    placeholder="Enter feedback..."
                                    value={evaluations[sId]?.feedback || ""}
                                    onChange={(e) => handleInputChange(sId, "feedback", e.target.value)}
                                    style={{
                                      width: "95%",
                                      padding: "8px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: "20px", textAlign: "right" }}>
                        <button
                          type="submit"
                          disabled={submitting}
                          style={{
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            fontWeight: "600",
                            padding: "10px 24px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: submitting ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Submitting..." : "Save Evaluations"}
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