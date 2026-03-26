 import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import your pages (Double check these file paths match your folders!)
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
import Level1Student from './Pages/StudentPages/Level1Student';
import Level2Student from './Pages/StudentPages/Level2Student';
import Level3Student from './Pages/StudentPages/Level3Student';
import Level4Student from './Pages/StudentPages/Level4Student';

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
          path="/mentor" 
          element={user?.role === 'mentor' ? <MentorDashboard /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/dashboard/level-1" 
          element={user?.role === 'coordinator' ? <Level1Page /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/dashboard/level-2" 
          element={user?.role === 'coordinator' ? <Level2Page /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/dashboard/level-3" 
          element={user?.role === 'coordinator' ? <Level3Page /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/dashboard/level-4" 
          element={user?.role === 'coordinator' ? <Level4Page /> : <Navigate to="/login" />} 
        />
 <Route 
  path="/studentDashboard/level-1" 
  element={user?.role?.toLowerCase() === 'student' ? <Level1Student /> : <Navigate to="/login" />} 
/>

<Route 
  path="/studentDashboard/level-2" 
  element={user?.role?.toLowerCase() === 'student' ? <Level2Student /> : <Navigate to="/login" />} 
/>

<Route 
  path="/studentDashboard/level-3" 
  element={user?.role?.toLowerCase() === 'student' ? <Level3Student /> : <Navigate to="/login" />} 
/>

<Route 
  path="/studentDashboard/level-4" 
  element={user?.role?.toLowerCase() === 'student' ? <Level4Student /> : <Navigate to="/login" />} 
/>

{/* Repeat for Level 3 and 4... */}

      </Routes>
    );
  }
  
  export default App;