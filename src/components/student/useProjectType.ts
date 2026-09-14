import { useEffect, useState } from "react";
import type { ProjectType } from "./ProjectTypeToggle";

const getStoredStudentId = (): number | null => {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return typeof user?.id === "number" ? user.id : Number(user?.id) || null;
  } catch {
    return null;
  }
};

// Loads the student's saved Group/Individual choice for one level (Level 3
// or Level 4 only — see ProjectTypeToggle). `projectType` is null while
// loading and stays null afterward if the student hasn't chosen yet; there
// is deliberately no client-side default.
export const useProjectType = (levelNumber: number) => {
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const studentId = getStoredStudentId();
    if (!studentId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/project-type/${studentId}/${levelNumber}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          },
        );
        if (!response.ok) throw new Error(`Failed to load project type (${response.status})`);
        const data = await response.json();
        if (!cancelled) {
          setProjectType(data?.projectType === "group" || data?.projectType === "individual" ? data.projectType : null);
        }
      } catch (error) {
        console.error("Failed to load project type selection:", error);
        if (!cancelled) setProjectType(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [levelNumber]);

  return { projectType, setProjectType, loading };
};
