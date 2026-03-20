import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import your pages (Double check these file paths match your folders!)
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import SignUpPage from './pages/SignUpPage';
import AdminDashboard from './pages/AdminPages/AdminDashboard';
import StudentDashboard from './pages/StudentPages/StudentDashboard';
import CoordinatorDashboard from './pages/CoordinatorPages/CoordinatorDashboard';
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

        {/* Add Supervisor and Mentor routes here following the same pattern */}

      </Routes>
    );
  }
  
  export default App;