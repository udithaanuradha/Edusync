import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import your pages (Double check these file paths match your folders!)
import LandingPage from './Pages/LandingPage';
import Login from './Pages/auth/Login';
import SignUpPage from './Pages/SignUpPage';
import AdminDashboard from './Pages/AdminPages/AdminDashboard';
import StudentDashboard from './Pages/StudentPages/StudentDashboard';
import CoordinatorDashboard from './Pages/CoordinatorPages/CoordinatorDashboard';
import SupervisorDashboard from './Pages/SupervisorPages/SupervisorDashboard';
import Level1Page from './Pages/CoordinatorPages/Level1Page';
import Level2Page from './Pages/CoordinatorPages/Level2Page';
import Level3Page from './Pages/CoordinatorPages/Level3Page';
import Level4Page from './Pages/CoordinatorPages/Level4Page';
import Level1Student from './Pages/StudentPages/Level1Student';
import Level2Student from './Pages/StudentPages/Level2Student';
import Level3Student from './Pages/StudentPages/Level3Student';
import Level4Student from './Pages/StudentPages/Level4Student';
import SupervisorLevelPage from './Pages/SupervisorPages/SupervisorLevelPage';
// Add Supervisor and Mentor imports here too...

function App() {
  const { user } = useAuth();

  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected Dashboard Routes */}
        {/* If user role matches, show dashboard. If not, send them back to login */}
        
        <Route 
          path="/admin" 
          element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/student" 
          element={user?.role === 'student' ? <StudentDashboard /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/coordinator" 
          element={user?.role === 'coordinator' ? <CoordinatorDashboard /> : <Navigate to="/login" />} 
        />

        <Route
          path="/supervisor"
          element={user?.role === 'supervisor' ? <SupervisorDashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/dashboard"
          element={
            user?.role === 'student' ? (
              <StudentDashboard />
            ) : user?.role === 'coordinator' ? (
              <CoordinatorDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route 
          path="/dashboard/level-1" 
          element={
            user?.role === 'student' ? <Level1Student /> : 
            user?.role === 'coordinator' ? <Level1Page /> :
            user?.role === 'supervisor' ? <SupervisorLevelPage levelNumber={1} /> : <Navigate to="/login" />
          } 
        />

        <Route 
          path="/dashboard/level-2" 
          element={
            user?.role === 'student' ? <Level2Student /> : 
            user?.role === 'coordinator' ? <Level2Page /> :
            user?.role === 'supervisor' ? <SupervisorLevelPage levelNumber={2} /> : <Navigate to="/login" />
          } 
        />

        <Route 
          path="/dashboard/level-3" 
          element={
            user?.role === 'student' ? <Level3Student /> : 
            user?.role === 'coordinator' ? <Level3Page /> :
            user?.role === 'supervisor' ? <SupervisorLevelPage levelNumber={3} /> : <Navigate to="/login" />
          } 
        />

        <Route 
          path="/dashboard/level-4" 
          element={
            user?.role === 'student' ? <Level4Student /> : 
            user?.role === 'coordinator' ? <Level4Page /> :
            user?.role === 'supervisor' ? <SupervisorLevelPage levelNumber={4} /> : <Navigate to="/login" />
          } 
        />

        {/* Add Supervisor and Mentor routes here following the same pattern */}

      </Routes>
    );
  }
  
  export default App;