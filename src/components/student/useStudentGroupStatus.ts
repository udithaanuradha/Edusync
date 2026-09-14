import { useEffect, useState } from "react";

const getStoredUser = (): { id: number } | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Lightweight "does this student have an actual formed group/individual
// project for this level yet" check, for the Individual Project side (see
// IndividualProjectPages.tsx). Hits the same /api/groups/student-group
// endpoint the Group Project side's "Groups" tab already uses (and that
// RequestSupervisor.tsx's own `activeGroup` check reads from) — that
// endpoint only ever returns rows once a group has actually been created
// (project_groups, hardcoded status "Active"), never a request that's
// still just pending, so a non-empty result here means "approved", not
// merely "requested".
export const useStudentGroupStatus = (levelNumber: number) => {
  const [hasGroup, setHasGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const user = getStoredUser();
    if (!user?.id) {
      setHasGroup(false);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/groups/student-group/${user.id}/${levelNumber}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (!response.ok) throw new Error(`Failed to load group status (${response.status})`);
        const data = await response.json();
        if (!cancelled) setHasGroup(Array.isArray(data) && data.length > 0);
      } catch (error) {
        console.error("Failed to load group status:", error);
        if (!cancelled) setHasGroup(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [levelNumber]);

  return { hasGroup, loading };
};
