import type { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/auth/Login";
import SignUpPage from "./pages/SignUpPage";
import AdminDashboard from "./pages/AdminPages/AdminDashboard";
import StudentDashboard from "./pages/StudentPages/StudentDashboard";
import CoordinatorDashboard from "./pages/CoordinatorPages/CoordinatorDashboard";
import SupervisorDashboard from "./pages/SupervisorPages/SupervisorDashboard";
import MentorDashboard from "./pages/MentorPages/MentorDashboard";
import Level1Page from "./pages/CoordinatorPages/Level1Page";
import Level2Page from "./pages/CoordinatorPages/Level2Page";
import Level3Page from "./pages/CoordinatorPages/Level3Page";
import Level4Page from "./pages/CoordinatorPages/Level4Page";
import Level1Student from "./pages/StudentPages/Level1Student";
import Level2Student from "./pages/StudentPages/Level2Student";
import Level3Student from "./pages/StudentPages/Level3Student";
import Level4Student from "./pages/StudentPages/Level4Student";
import SupervisorLevelPage from "./pages/SupervisorPages/SupervisorLevelPage";
import AdminLevelPage from "./pages/AdminPages/AdminLevelPage";
import Level2mentor from "./pages/MentorPages/Level2mentor";
import Level4mentor from "./pages/MentorPages/Level4mentor";
import GroupRequest from "./components/student/GroupRequest";
import ProjectManagementPage from "./pages/StudentPages/ProjectManagementPage";
import SupervisorApprovalPage from "./pages/SupervisorPages/SupervisorApprovalPage";
import AnnouncementsPage from "./pages/CoordinatorPages/AnnouncementsPage";
import SupervisorAnnouncementsPage from "./pages/SupervisorPages/SupervisorAnnouncementsPage";
import MentorAnnouncementsPage from "./pages/MentorPages/MentorAnnouncementsPage";
import AdminAnnouncements from "./pages/AdminPages/AdminAnnouncements";
import StudentAnnouncementsPage from "./pages/StudentPages/StudentAnnouncementsPage";
import CommunicationPageV2 from "./pages/shared/CommunicationPageV2";
import CalendarPage from "./pages/CalendarPage";
import AdminCalendarPage from "./pages/AdminPages/AdminCalendarPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import Level3mentor from "./pages/MentorPages/Level3mentor";
import Level1mentor from "./pages/MentorPages/Level1mentor";
import MentorSetupForm from "./pages/auth/MentorSetupForm";
import ResetPasswordForm from "./pages/auth/ResetPasswordForm";
import MentorProjectDelaysPage from "./pages/MentorPages/MentorProjectDelaysPage";
import MentorCalendarPage from "./pages/MentorPages/MentorCalendarPage";
import MentorCommunicationPage from "./pages/MentorPages/MentorCommunicationPage";
import SupervisorEvaluationPanel from "./pages/SupervisorPages/SupervisorEvaluationPanel";
import AdminProjectDelaysPage from "./pages/AdminPages/AdminProjectDelaysPage";

// A supervisor account can be shaped either as a plain `role: 'supervisor'`
// user or as `role: 'lecturer'` with `designation: 'supervisor'`. Lecturers
// with no designation set yet also land on the supervisor dashboard — this
// mirrors the exact fallback Login.tsx already uses to pick the post-login
// redirect target, so the route guard here doesn't reject a user Login.tsx
// just sent to this path.
const isSupervisorUser = (u: any) =>
  u?.role === "supervisor" ||
  (u?.role === "lecturer" &&
    (u?.designation === "supervisor" || !u?.designation));

function App() {
  const { user } = useAuth();
  const userObj = user as any; // Cast to bypass strict type check for designation field
  const effectiveRole = String(userObj?.effectiveRole || userObj?.designation || userObj?.role || '').toLowerCase();

  // A coordinator's assigned level (assignCoordinator sets users.level to
  // the level they coordinate) gates which /dashboard/level-N page they may
  // actually view. Without this, Level1Page/Level2Page/etc. below rendered
  // for ANY coordinator regardless of level — so a coordinator assigned to
  // Level 2 could navigate straight to /dashboard/level-1 (via the sidebar,
  // which still lists every level, or by typing the URL) and see another
  // coordinator's real submissions and marksheet. Redirect them back to
  // their own level instead; leave access unrestricted if the account has
  // no valid level on it yet, so that edge case doesn't lock anyone out.
  const coordinatorAssignedLevel = Number(userObj?.level);
  const hasKnownCoordinatorLevel =
    Number.isFinite(coordinatorAssignedLevel) &&
    coordinatorAssignedLevel >= 1 &&
    coordinatorAssignedLevel <= 4;
  const renderCoordinatorLevelPage = (levelNumber: number, page: ReactElement) =>
    hasKnownCoordinatorLevel && coordinatorAssignedLevel !== levelNumber ? (
      <Navigate to={`/dashboard/level-${coordinatorAssignedLevel}`} />
    ) : (
      page
    );

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route path="/mentor-setup/:token" element={<MentorSetupForm />} />
      <Route path="/reset-password/:token" element={<ResetPasswordForm />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/admin"
        element={
          userObj?.role === "admin" ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/student"
        element={
          userObj?.role === "student" ? (
            <StudentDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/coordinator"
        element={
          userObj?.role === "lecturer" &&
          (userObj?.designation === "coordinator" || effectiveRole === "coordinator") ? (
            <CoordinatorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor"
        element={
          isSupervisorUser(userObj) ? (
            <SupervisorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/mentor/*"
        element={
          userObj?.role === "mentor" ? (
            <MentorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Dashboard redirect catch */}
      <Route
        path="/dashboard/*"
        element={
          userObj?.role === "student" ? (
            <StudentDashboard />
          ) : userObj?.role === "admin" ? (
            <AdminDashboard />
          ) : userObj?.role === "mentor" ? (
            <MentorDashboard />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              <CoordinatorDashboard />
            ) : (
              <SupervisorDashboard />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Level Routes */}
      <Route
        path="/dashboard/level-1"
        element={
          userObj?.role === "student" ? (
            <Level1Student />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              renderCoordinatorLevelPage(1, <Level1Page />)
            ) : (
              <SupervisorLevelPage levelNumber={1} />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={1} />
          ) : userObj?.role === "admin" ? (
            <AdminLevelPage levelNumber={1} />
          ) : userObj?.role === "mentor" ? (
            <Level1mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-2"
        element={
          userObj?.role === "student" ? (
            <Level2Student />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              renderCoordinatorLevelPage(2, <Level2Page />)
            ) : (
              <SupervisorLevelPage levelNumber={2} />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={2} />
          ) : userObj?.role === "admin" ? (
            <AdminLevelPage levelNumber={2} />
          ) : userObj?.role === "mentor" ? (
            <Level2mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-3"
        element={
          userObj?.role === "student" ? (
            <Level3Student />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              renderCoordinatorLevelPage(3, <Level3Page />)
            ) : (
              <SupervisorLevelPage levelNumber={3} />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={3} />
          ) : userObj?.role === "admin" ? (
            <AdminLevelPage levelNumber={3} />
          ) : userObj?.role === "mentor" ? (
            <Level3mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-4"
        element={
          userObj?.role === "student" ? (
            <Level4Student />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              renderCoordinatorLevelPage(4, <Level4Page />)
            ) : (
              <SupervisorLevelPage levelNumber={4} />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={4} />
          ) : userObj?.role === "admin" ? (
            <AdminLevelPage levelNumber={4} />
          ) : userObj?.role === "mentor" ? (
            <Level4mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/group-request"
        element={<GroupRequest levelNumber={userObj?.level || 2} />}
      />

      <Route
        path="/student/project-management"
        element={
          userObj?.role === "student" ? (
            <ProjectManagementPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Calendar Route */}
      <Route
        path="/dashboard/calendar"
        element={
          userObj?.role === "admin" ? (
            <AdminCalendarPage />
          ) : userObj?.role === "mentor" ? (
            <MentorCalendarPage />
          ) : userObj ? (
            <CalendarPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Announcement Route */}
      <Route
        path="/dashboard/announcements"
        element={
          userObj?.role === "admin" ? (
            <AdminAnnouncements />
          ) : userObj?.role === "lecturer" ? (
            (userObj.designation === "coordinator" || effectiveRole === "coordinator") ? (
              <AnnouncementsPage />
            ) : (
              <SupervisorAnnouncementsPage />
            )
          ) : userObj?.role === "supervisor" ? (
            <SupervisorAnnouncementsPage />
          ) : userObj?.role === "mentor" ? (
            <MentorAnnouncementsPage />
          ) : userObj?.role === "student" ? (
            <StudentAnnouncementsPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/announcements"
        element={
          isSupervisorUser(userObj) ? (
            <SupervisorAnnouncementsPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Communication Routes — the old per-role pages (AdminCommunicationPage/
          SupervisorCommunicationPage/CommunicationPage) are gone; every role
          now lands on the same real-time V2 chat /dashboard/communication-v2
          already used. */}
      <Route
        path="/communication"
        element={
          userObj?.role === "mentor" || userObj?.role === "industry mentor" ? (
            <MentorCommunicationPage />
          ) : userObj ? (
            <CommunicationPageV2 />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/communication"
        element={
          userObj?.role === "mentor" || userObj?.role === "industry mentor" ? (
            <MentorCommunicationPage />
          ) : userObj ? (
            <CommunicationPageV2 />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/communication-v2"
        element={
          userObj?.role === "mentor" || userObj?.role === "industry mentor" ? (
            <MentorCommunicationPage />
          ) : userObj ? (
            <CommunicationPageV2 />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/communication-v2"
        element={
          userObj?.role === "mentor" || userObj?.role === "industry mentor" ? (
            <MentorCommunicationPage />
          ) : userObj ? (
            <CommunicationPageV2 />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/approval"
        element={
          userObj?.role === "lecturer" &&
          (userObj?.designation === "supervisor" || effectiveRole === "supervisor") ? (
            <SupervisorApprovalPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/communication"
        element={
          userObj?.role === "lecturer" &&
          (userObj?.designation === "supervisor" || effectiveRole === "supervisor") ? (
            <CommunicationPageV2 />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/evaluation-panel"
        element={
          isSupervisorUser(userObj) || userObj?.role === "admin" || userObj?.role === "lecturer" ? (
            <SupervisorEvaluationPanel />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/profile-settings"
        element={userObj ? <ProfileSettingsPage /> : <Navigate to="/login" />}
      />

      {/* Project Delays Routes */}
      <Route
        path="/dashboard/project-delays"
        element={
          userObj?.role === "admin" ? (
            <AdminProjectDelaysPage />
          ) : userObj?.role === "mentor" ? (
            <MentorProjectDelaysPage />
          ) : userObj ? (
            <Navigate to="/dashboard" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/admin/project-delays"
        element={
          userObj?.role === "admin" ? (
            <AdminProjectDelaysPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;
