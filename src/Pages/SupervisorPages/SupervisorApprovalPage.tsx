import React, { useEffect, useState } from "react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import "./SupervisorDashboard.css";
import "./SupervisorApprovalPage.css";

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

/**
 * Shape of a normalized request item displayed on the page.
 * Logic: Ensures the UI always works with a predictable object structure regardless of backend naming.
 */
type PendingRequest = {
  requestId: number;
  projectName: string;
  groupName: string;
  groupLeader: string;
  members: string;
  studentMessage: string;
  studentName: string;
  levelLabel: string;
  supervisorId: string;
  supervisorName: string;
};

/**
 * User structure as it appears in LocalStorage.
 * Logic: Account for various database naming conventions (snake_case vs camelCase).
 */
type StoredUser = {
  id?: number | string;
  user_id?: number | string;
  first_name?: string;
  firstname?: string;
  firstName?: string;
  last_name?: string;
  lastname?: string;
  lastName?: string;
  name?: string;
  full_name?: string;
  fullName?: string;
};

/** Simplified identity object used for ownership filtering logic. */
type ViewerIdentity = {
  idStr: string;
  name: string;
};

// ============================================================================
// 2. CONSTANTS & UTILITIES
// ============================================================================

const API_BASE = "http://localhost:5000/api/groups";

/**
 * LOGIC: Data Extraction
 * Safely extracts an array from various common API response wrappers (data, requests, results).
 */
const toArray = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const data = payload as {
      requests?: unknown[];
      results?: unknown[];
      data?: unknown[];
    };
    if (Array.isArray(data.requests))
      return data.requests as Record<string, unknown>[];
    if (Array.isArray(data.results))
      return data.results as Record<string, unknown>[];
    if (Array.isArray(data.data)) return data.data as Record<string, unknown>[];
  }
  return [];
};

/**
 * LOGIC: Key Normalization
 * Maps inconsistent backend JSON keys into a consistent PendingRequest object for the UI.
 */
const normalizeRequest = (item: Record<string, unknown>): PendingRequest => ({
  requestId: Number(item.request_id ?? item.requestId ?? item.id ?? 0),
  projectName: String(
    item.project_name ?? item.projectName ?? "Untitled Project",
  ),
  groupName: String(item.group_name ?? item.groupName ?? "Unknown Group"),
  groupLeader: String(item.group_leader ?? item.groupLeader ?? "N/A"),
  members: String(item.members_list ?? item.members ?? "N/A"),
  studentMessage: String(item.request_message ?? item.message ?? ""),
  studentName: String(item.student_name ?? item.studentName ?? "Student"),
  levelLabel: String(item.project_level ?? item.level ?? "1"),
  supervisorId: String(
    item.supervisor_id ??
      item.supervisorId ??
      item.assigned_supervisor_id ??
      "",
  ),
  supervisorName: String(
    item.supervisor_name ??
      item.supervisorName ??
      item.assigned_supervisor_name ??
      "",
  ),
});

/**
 * FUNCTION: Storage Parser
 * Retrieves and parses 'user' from localStorage with error handling to prevent app crashes.
 */
const parseUserFromStorage = (): StoredUser => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : {};
  } catch {
    return {};
  }
};

/**
 * LOGIC: Text Standardization
 * Converts strings to lowercase and removes redundant whitespace for reliable comparison.
 */
const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * FUNCTION: Identity Resolver
 * Constructs a ViewerIdentity from storage to identify the currently logged-in supervisor.
 */
const getViewerIdentity = (): ViewerIdentity => {
  const storedUser = parseUserFromStorage();
  const id = storedUser.id ?? storedUser.user_id ?? "";

  const firstName = String(
    storedUser.first_name ?? storedUser.firstname ?? storedUser.firstName ?? "",
  ).trim();
  const lastName = String(
    storedUser.last_name ?? storedUser.lastname ?? storedUser.lastName ?? "",
  ).trim();
  const fallbackName = String(
    storedUser.full_name ?? storedUser.fullName ?? storedUser.name ?? "",
  ).trim();
  const joinedName = `${firstName} ${lastName}`.trim();

  return {
    idStr: String(id),
    name: normalizeText(joinedName || fallbackName),
  };
};

/**
 * LOGIC: API Fallback Strategy
 * Returns an array of possible endpoints. The app will "ping" these until one works.
 */
const getPendingPaths = (viewer: ViewerIdentity): string[] => {
  const idPath = viewer.idStr ? `/${encodeURIComponent(viewer.idStr)}` : "";
  return [
    `/pending${idPath}`,
    `/pending?supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    "/pending-requests",
    "/pending-requests?status=pending",
    "/supervisor/pending-requests",
    `/supervisor/pending-requests${idPath}`,
    `/supervisor${idPath}/pending-requests`,
    `/supervisor/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    `/requests?status=pending&supervisor_id=${encodeURIComponent(viewer.idStr)}`,
    `/requests/supervisor${idPath}?status=pending`,
    "/supervisor/requests?status=pending",
  ];
};

/**
 * LOGIC: Ownership Validation
 * Ensures the supervisor only sees requests assigned to them (or unassigned requests).
 */
const belongsToViewer = (
  request: PendingRequest,
  viewer: ViewerIdentity,
): boolean => {
  const hasSupervisorRef = Boolean(
    request.supervisorId || request.supervisorName,
  );
  if (!hasSupervisorRef) return true; // Unassigned: Visible to all supervisors

  const reqSupervisorId = String(request.supervisorId || "").trim();
  const reqSupervisorName = normalizeText(request.supervisorName || "");
  const idMatch = Boolean(
    viewer.idStr && reqSupervisorId && viewer.idStr === reqSupervisorId,
  );
  const nameMatch = Boolean(
    viewer.name && reqSupervisorName && reqSupervisorName.includes(viewer.name),
  );
  return idMatch || nameMatch;
};

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

const SupervisorApprovalPage: React.FC = () => {
  // --- State Hooks ---
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  // --- Derived Values & Auth ---
  const viewer = getViewerIdentity();
  const hasViewerId = Boolean(viewer.idStr);
  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // --- API Methods ---

  /**
   * FUNCTION: Load Data
   * Logic: Executes the fallback loop across multiple paths until data is successfully loaded.
   */
  const loadPendingRequests = async () => {
    setLoading(true);
    setError("");

    if (!hasViewerId) {
      setError("Supervisor identity not found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      let loaded = false;
      const pendingPaths = getPendingPaths(viewer);

      for (const path of pendingPaths) {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: authHeaders,
        });
        if (!response.ok) continue; // Try next path if this one fails

        const data = await response.json();
        const normalized = toArray(data)
          .map(normalizeRequest)
          .filter((item) => item.requestId > 0);

        // Apply local filtering to ensure supervisor only sees their own tasks
        const filtered = normalized.filter((request) =>
          belongsToViewer(request, viewer),
        );

        setRequests(filtered);
        loaded = true;
        break; // Stop loop once successful
      }

      if (!loaded) {
        setError(
          "Unable to load pending requests. Please verify backend endpoints.",
        );
      }
    } catch (err) {
      setError("Server connection error while loading pending requests.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * FUNCTION: Shared Action Runner
   * Logic: Handles the network request for Approve/Reject.
   * Supports multiple endpoints per action to ensure compatibility with different backend versions.
   */
  const runAction = async (
    requestId: number,
    options: { path: string; method: "PUT" | "POST"; body?: string }[],
  ) => {
    setActionBusy(requestId); // Disable UI buttons for this specific card
    setError("");

    try {
      for (const option of options) {
        const response = await fetch(`${API_BASE}${option.path}`, {
          method: option.method,
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: option.body,
        });

        if (response.ok) {
          // Success logic: Optimistically remove from UI
          setRequests((prev) =>
            prev.filter((request) => request.requestId !== requestId),
          );
          return true;
        }
      }
      setError(
        "Action failed. Please verify backend approve/reject endpoints.",
      );
      return false;
    } catch (err) {
      setError("Server connection error while sending action.");
      return false;
    } finally {
      setActionBusy(null);
    }
  };

  /**
   * FUNCTION: Approve Logic
   * Maps UI click to the runAction helper with relevant endpoints.
   */
  const handleApprove = async (requestId: number) => {
    const body = JSON.stringify({
      request_id: requestId,
      supervisor_id: viewer.idStr,
    });
    await runAction(requestId, [
      { path: "/approve", method: "PUT", body },
      { path: `/requests/${requestId}/approve`, method: "PUT", body },
      { path: `/approve/${requestId}`, method: "PUT", body },
      { path: `/approve/${requestId}`, method: "POST", body },
    ]);
  };

  /**
   * FUNCTION: Reject Logic
   * Logic: Validates presence of a reason, then submits to the server.
   */
  const handleReject = async () => {
    if (!rejectingId) return;
    const trimmedReason = rejectReason.trim();

    if (!trimmedReason) {
      setError("Please enter a rejection reason before submitting.");
      return;
    }

    const body = JSON.stringify({
      request_id: rejectingId,
      rejection_reason: trimmedReason,
      supervisor_id: viewer.idStr,
    });

    const success = await runAction(rejectingId, [
      { path: "/reject", method: "PUT", body },
      { path: `/requests/${rejectingId}/reject`, method: "PUT", body },
      { path: `/reject/${rejectingId}`, method: "PUT", body },
      { path: `/reject/${rejectingId}`, method: "POST", body },
    ]);

    if (success) closeRejectModal();
  };

  // --- Modal Helpers ---
  const openRejectModal = (requestId: number) => {
    setRejectingId(requestId);
    setRejectReason("");
  };
  const closeRejectModal = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  // --- Lifecycle Hook ---
  useEffect(() => {
    loadPendingRequests();
  }, []);

  // --- Rendering ---
  return (
    <div className="app-layout supervisor-shell">
      {/* Side Navigation Stack */}
      <div className="supervisor-side-stack">
        <Sidebar />
        <SupervisorSidebar compact />
      </div>

      <div className="main-viewport">
        <Header pageTitle="Approval Requests" />

        <main className="content-container supervisor-content-container">
          <section className="supervisor-approval-page">
            <div className="approval-page-head">
              <h2>Pending Group Requests</h2>
              <button
                type="button"
                className="approval-refresh-btn"
                onClick={loadPendingRequests}
              >
                Refresh
              </button>
            </div>

            {/* Status Feedback Logic */}
            {error && <p className="approval-error">{error}</p>}
            {loading && (
              <p className="approval-muted">Loading pending requests...</p>
            )}
            {!loading && requests.length === 0 && !error && (
              <p className="approval-muted">No pending requests right now.</p>
            )}

            {/* Request Cards Grid */}
            <div className="approval-request-grid">
              {requests.map((request) => (
                <article
                  className="approval-request-card"
                  key={request.requestId}
                >
                  <div className="approval-card-head">
                    <h3>{request.projectName}</h3>
                    <span className="approval-level-badge">
                      Level {request.levelLabel}
                    </span>
                  </div>

                  <p>
                    <strong>Group:</strong> {request.groupName}
                  </p>
                  <p>
                    <strong>Leader:</strong> {request.groupLeader}
                  </p>
                  <p>
                    <strong>Student:</strong> {request.studentName}
                  </p>
                  <p>
                    <strong>Members:</strong> {request.members}
                  </p>
                  {request.studentMessage && (
                    <p>
                      <strong>Message:</strong> {request.studentMessage}
                    </p>
                  )}

                  <div className="approval-actions">
                    <button
                      type="button"
                      className="approval-btn approve"
                      onClick={() => handleApprove(request.requestId)}
                      disabled={actionBusy === request.requestId}
                    >
                      {actionBusy === request.requestId
                        ? "Processing..."
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      className="approval-btn reject"
                      onClick={() => openRejectModal(request.requestId)}
                      disabled={actionBusy === request.requestId}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Logic: Conditional Modal Rendering for Rejection Reason */}
      {rejectingId && (
        <div
          className="approval-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div className="approval-modal">
            <h3>Reject Request</h3>
            <p>Tell the student why this request was rejected.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Write the rejection reason..."
              rows={4}
            />
            <div className="approval-modal-actions">
              <button
                type="button"
                className="approval-btn reject"
                onClick={handleReject}
              >
                Submit Reject
              </button>
              <button
                type="button"
                className="approval-btn ghost"
                onClick={closeRejectModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorApprovalPage;
