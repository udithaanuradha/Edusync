import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LandingPage from "./Pages/LandingPage";
import Login from "./Pages/auth/Login";
import SignUpPage from "./Pages/SignUpPage";
import AdminDashboard from "./Pages/AdminPages/AdminDashboard";
import StudentDashboard from "./Pages/StudentPages/StudentDashboard";
import CoordinatorDashboard from "./Pages/CoordinatorPages/CoordinatorDashboard";
import SupervisorDashboard from "./Pages/SupervisorPages/SupervisorDashboard";
import MentorDashboard from "./Pages/MentorPages/MentorDashboard";
import Level1Page from "./Pages/CoordinatorPages/Level1Page";
import Level2Page from "./Pages/CoordinatorPages/Level2Page";
import Level3Page from "./Pages/CoordinatorPages/Level3Page";
import Level4Page from "./Pages/CoordinatorPages/Level4Page";
import Level1Student from "./Pages/StudentPages/Level1Student";
import Level2Student from "./Pages/StudentPages/Level2Student";
import Level3Student from "./Pages/StudentPages/Level3Student";
import Level4Student from "./Pages/StudentPages/Level4Student";
import ProjectManagementPage from "./Pages/StudentPages/ProjectManagementPage";
import SupervisorLevelPage from "./Pages/SupervisorPages/SupervisorLevelPage";
import AdminLevelPage from "./Pages/AdminPages/AdminLevelPage";
import Level2mentor from "./Pages/MentorPages/Level2mentor";
import Level4mentor from "./Pages/MentorPages/Level4mentor";
import GroupRequest from "./components/student/GroupRequest";
import SupervisorApprovalPage from "./Pages/SupervisorPages/SupervisorApprovalPage";
import AnnouncementsPage from "./Pages/CoordinatorPages/AnnouncementsPage";
import SupervisorAnnouncementsPage from "./Pages/SupervisorPages/SupervisorAnnouncementsPage";
import SupervisorCommunicationPage from "./Pages/SupervisorPages/SupervisorCommunicationPage";
import CommunicationPage from "./Pages/CommunicationPage";

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/admin"
        element={
          user?.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />
        }
      />

      <Route
        path="/student"
        element={
          user?.role === "student" ? (
            <StudentDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/coordinator"
        element={
          user?.role === "coordinator" ? (
            <CoordinatorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor"
        element={
          user?.role === "supervisor" ? (
            <SupervisorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/mentor"
        element={
          user?.role === "mentor" ? (
            <MentorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Dashboard redirect */}
      <Route
        path="/dashboard"
        element={
          user?.role === "student" ? (
            <StudentDashboard />
          ) : user?.role === "coordinator" ? (
            <CoordinatorDashboard />
          ) : user?.role === "admin" ? (
            <AdminDashboard />
          ) : user?.role === "supervisor" ? (
            <SupervisorDashboard />
          ) : user?.role === "mentor" ? (
            <MentorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Level Routes */}
      <Route
        path="/dashboard/level-1"
        element={
          user?.role === "student" ? (
            <Level1Student />
          ) : user?.role === "coordinator" ? (
            <Level1Page />
          ) : user?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={1} />
          ) : user?.role === "admin" ? (
            <AdminLevelPage levelNumber={1} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-2"
        element={
          user?.role === "student" ? (
            <Level2Student />
          ) : user?.role === "coordinator" ? (
            <Level2Page />
          ) : user?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={2} />
          ) : user?.role === "admin" ? (
            <AdminLevelPage levelNumber={2} />
          ) : user?.role === "mentor" ? (
            <Level2mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-3"
        element={
          user?.role === "student" ? (
            <Level3Student />
          ) : user?.role === "coordinator" ? (
            <Level3Page />
          ) : user?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={3} />
          ) : user?.role === "admin" ? (
            <AdminLevelPage levelNumber={3} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/level-4"
        element={
          user?.role === "student" ? (
            <Level4Student />
          ) : user?.role === "coordinator" ? (
            <Level4Page />
          ) : user?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={4} />
          ) : user?.role === "admin" ? (
            <AdminLevelPage levelNumber={4} />
          ) : user?.role === "mentor" ? (
            <Level4mentor />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route path="/group-request" element={<GroupRequest />} />

      <Route
        path="/student/project-management"
        element={
          user?.role === "student" ? (
            <ProjectManagementPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/announcements"
        element={
          user?.role === "coordinator" ? (
            <AnnouncementsPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/announcements"
        element={
          user?.role === "supervisor" ? (
            <SupervisorAnnouncementsPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/approval"
        element={
          user?.role === "supervisor" ? (
            <SupervisorApprovalPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/communication"
        element={
          user?.role === "supervisor" ? (
            <SupervisorCommunicationPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/dashboard/communication"
        element={user ? <CommunicationPage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;
