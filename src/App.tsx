import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import SignUpPage from './pages/SignUpPage';
import AdminDashboard from './pages/AdminPages/AdminDashboard';
import StudentDashboard from './pages/StudentPages/StudentDashboard';
import CoordinatorDashboard from './pages/CoordinatorPages/CoordinatorDashboard';
import SupervisorDashboard from './pages/SupervisorPages/SupervisorDashboard';
import MentorDashboard from './pages/MentorPages/MentorDashboard';
import Level1Page from './pages/CoordinatorPages/Level1Page';
import Level2Page from './pages/CoordinatorPages/Level2Page';
import Level3Page from './pages/CoordinatorPages/Level3Page';
import Level4Page from './pages/CoordinatorPages/Level4Page';
import Level1Student from './pages/StudentPages/Level1Student';
import Level2Student from './pages/StudentPages/Level2Student';
import Level3Student from './pages/StudentPages/Level3Student';
import Level4Student from './pages/StudentPages/Level4Student';
import SupervisorLevelPage from './pages/SupervisorPages/SupervisorLevelPage';
import AdminLevelPage from './pages/AdminPages/AdminLevelPage';
import Level2mentor from './pages/MentorPages/Level2mentor';
import Level4mentor from './pages/MentorPages/Level4mentor';
import GroupRequest from './components/student/GroupRequest';
import ProjectManagementPage from './pages/StudentPages/ProjectManagementPage';
import SupervisorApprovalPage from './pages/SupervisorPages/SupervisorApprovalPage';
import AnnouncementsPage from './pages/CoordinatorPages/AnnouncementsPage';
import SupervisorAnnouncementsPage from './pages/SupervisorPages/SupervisorAnnouncementsPage';
import MentorAnnouncementsPage from './pages/MentorPages/MentorAnnouncementsPage';
import AdminAnnouncements from './pages/AdminPages/AdminAnnouncements';
import SupervisorCommunicationPage from './pages/SupervisorPages/SupervisorCommunicationPage';
import CommunicationPage from './pages/shared/CommunicationPage';
import AdminCommunicationPage from './pages/AdminPages/AdminCommunicationPage'; 
import CalendarPage from './pages/CalendarPage';
import AdminCalendarPage from './pages/AdminPages/AdminCalendarPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import Level3mentor from './Pages/MentorPages/Level3mentor';
import MentorSidebarWrapper from './components/mentor/MentorSidebarWrapper';
import MentorLevel1Blocked from './pages/MentorPages/MentorLevel1Blocked';

function App() {
  const { user } = useAuth();
  const userObj = user as any; // Cast to bypass strict type check for designation field

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
          userObj?.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />
        }
      />

      <Route
        path="/student"
        element={
          userObj?.role === "student" ? <StudentDashboard /> : <Navigate to="/login" />
        }
      />

      <Route
        path="/coordinator"
        element={
          userObj?.role === "lecturer" && userObj?.designation === "coordinator" ? (
            <CoordinatorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor"
        element={
          userObj?.role === "lecturer" && userObj?.designation === "supervisor" ? (
            <SupervisorDashboard />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/mentor"
        element={
          userObj?.role === "mentor" ? <MentorDashboard /> : <Navigate to="/login" />
        }
      />

      {/* Dashboard redirect catch */}
      <Route
        path="/dashboard"
        element={
          userObj?.role === "student" ? (
            <StudentDashboard />
          ) : userObj?.role === "admin" ? (
            <AdminDashboard />
          ) : userObj?.role === "mentor" ? (
            <MentorDashboard />
          ) : userObj?.role === "lecturer" ? (
            userObj.designation === "coordinator" ? <CoordinatorDashboard /> : <SupervisorDashboard />
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
            userObj.designation === "coordinator" ? <Level1Page /> : <SupervisorLevelPage levelNumber={1} />
          ) : userObj?.role === "supervisor" ? (
            <SupervisorLevelPage levelNumber={1} />
          ) : userObj?.role === "admin" ? (
            <AdminLevelPage levelNumber={1} />
          ) : userObj?.role === "mentor" ? (
            <MentorLevel1Blocked />
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
            userObj.designation === "coordinator" ? <Level2Page /> : <SupervisorLevelPage levelNumber={2} />
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
            userObj.designation === "coordinator" ? <Level3Page /> : <SupervisorLevelPage levelNumber={3} />
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
            userObj.designation === "coordinator" ? <Level4Page /> : <SupervisorLevelPage levelNumber={4} />
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

      <Route path="/group-request" element={<GroupRequest />} />

      <Route
        path="/student/project-management"
        element={
          userObj?.role === "student" ? <ProjectManagementPage /> : <Navigate to="/login" />
        }
      />

      {/* Calendar Route */}
      <Route
        path="/dashboard/calendar"
        element={
          userObj?.role === "admin" ? (
            <AdminCalendarPage />
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
            userObj.designation === "coordinator" ? <AnnouncementsPage /> : <SupervisorAnnouncementsPage />
          ) : userObj?.role === "supervisor" ? (
            <SupervisorAnnouncementsPage />
          ) : userObj?.role === "mentor" ? (
            <MentorAnnouncementsPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Communication Routes */}
      <Route
        path="/dashboard/communication"
        element={
          userObj?.role === "admin" ? (
            <AdminCommunicationPage />
          ) :userObj?.role === "lecturer" && userObj?.designation === "supervisor" ? (
            <SupervisorCommunicationPage />
          ) : userObj ? (
            <CommunicationPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/approval"
        element={
          userObj?.role === "lecturer" && userObj?.designation === "supervisor" ? (
            <SupervisorApprovalPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/supervisor/communication"
        element={
          userObj?.role === "lecturer" && userObj?.designation === "supervisor" ? (
            <SupervisorCommunicationPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/profile-settings"
        element={userObj ? <ProfileSettingsPage /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;