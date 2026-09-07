import React, { useState } from "react";
import "./ProjectTypeToggle.css";

export type ProjectType = "group" | "individual";

interface ProjectTypeToggleProps {
  levelNumber: number;
  value: ProjectType | null;
  onChange: (next: ProjectType) => void;
}

const getStoredStudentId = (): number | null => {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return typeof user?.id === "number" ? user.id : Number(user?.id) || null;
  } catch {
    return null;
  }
};

// Group Project / Individual Project switch for the Level 3 and Level 4
// page headers. Persists the choice server-side (student_project_type,
// keyed by student + level) so it survives refreshes and follows the
// student across devices instead of resetting every session.
//
// Locking rule (deliberately minimal — the prompt that introduced this
// flagged the *exact* rules as an open question rather than something to
// decide silently here): switching away from Group Project while the
// student already has an approved/formed group for this level asks for a
// plain confirmation first, so a stray click can't silently orphan a real
// group. It does not otherwise block or gate the switch.
const ProjectTypeToggle: React.FC<ProjectTypeToggleProps> = ({
  levelNumber,
  value,
  onChange,
}) => {
  const [saving, setSaving] = useState(false);

  const persist = async (next: ProjectType) => {
    const studentId = getStoredStudentId();
    if (!studentId) return;

    setSaving(true);
    try {
      const response = await fetch("http://localhost:5000/api/project-type", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ studentId, level: levelNumber, projectType: next }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save project type (${response.status})`);
      }
      onChange(next);
    } catch (error) {
      console.error("Failed to save project type selection:", error);
      alert("Couldn't save your selection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = async (next: ProjectType) => {
    if (saving || next === value) return;

    // Only the Group -> Individual direction risks orphaning something real.
    if (value === "group" && next === "individual") {
      const studentId = getStoredStudentId();
      if (studentId) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/groups/student-group/${studentId}/${levelNumber}`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            },
          );
          const data = response.ok ? await response.json() : [];
          const hasApprovedGroup = Array.isArray(data) && data.length > 0;
          if (hasApprovedGroup) {
            const confirmed = window.confirm(
              "You already have an approved group for this level. Switching to Individual Project won't delete it, but you'll stop seeing the Group Project tabs. Continue?",
            );
            if (!confirmed) return;
          }
        } catch (error) {
          // If the check itself fails, don't block the switch on it — just
          // proceed without the extra confirmation rather than getting the
          // student stuck.
          console.error("Failed to check for an approved group before switching:", error);
        }
      }
    }

    void persist(next);
  };

  return (
    <div className="project-type-toggle" role="group" aria-label="Project type">
      <button
        type="button"
        className={`project-type-toggle-segment ${value === "group" ? "active" : ""}`}
        onClick={() => handleSelect("group")}
        disabled={saving}
        aria-pressed={value === "group"}
      >
        Group Project
      </button>
      <button
        type="button"
        className={`project-type-toggle-segment ${value === "individual" ? "active" : ""}`}
        onClick={() => handleSelect("individual")}
        disabled={saving}
        aria-pressed={value === "individual"}
      >
        Individual Project
      </button>
    </div>
  );
};

export default ProjectTypeToggle;
