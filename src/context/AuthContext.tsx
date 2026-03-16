 import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { name: string; role: string } | null;
  switchRole: (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initial state
  const [user, setUser] = useState<{ name: string; role: string } | null>({ 
    name: 'User Name', 
    role: 'student' // Start as coordinator
  });

  // This function updates the role
  const switchRole = (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => {
    setUser(prev => prev ? { ...prev, role: newRole } : null);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};