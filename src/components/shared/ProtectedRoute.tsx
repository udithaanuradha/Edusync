import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// We added 'allowedRoles' to the interface
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; 
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  // 1. Check if they are logged in at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if they have the right "ID Badge" for this specific page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If a 'student' tries to access a 'coordinator' page, redirect them securely
    return <Navigate to="/unauthorized" replace />; 
  }

  return <>{children}</>;
};

export default ProtectedRoute;