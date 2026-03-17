 // src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Import Role Pages
import AdminPage from './Pages/AdminPages/AdminDashboard'; 
import SupervisorPage from './Pages/SupervisorPages/SupervisorDashboard';
import MentorPage from './Pages/MentorPages/MentorDashboard';
import CoordinatorPage from './Pages/CoordinatorPages/CoordinatorDashboard';
import StudentPage from './Pages/StudentPages/StudentDashboard';
import AdminDashboard from './Pages/AdminPages/AdminDashboard';

const App: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const RoleRedirector = () => {
    if (!role) return <Navigate to="/login" />;
    return <Navigate to={`/${role}`} replace />;
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<RoleRedirector />} />

      {/* FIXED: Added '/*' to all paths so internal dashboard routes work */}
      <Route path="/admin/*" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/supervisor/*" element={<ProtectedRoute><SupervisorPage /></ProtectedRoute>} />
      <Route path="/mentor/*" element={<ProtectedRoute><MentorPage /></ProtectedRoute>} />
      <Route path="/coordinator/*" element={<ProtectedRoute><CoordinatorPage /></ProtectedRoute>} />
      <Route path="/student/*" element={<ProtectedRoute><StudentPage /></ProtectedRoute>} />
      // Inside your Routes in App.tsx
     <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

      <Route path="/login" element={<div>Please Login</div>} />
      
      {/* Optional: Add a catch-all redirect to prevent staying on a blank page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;