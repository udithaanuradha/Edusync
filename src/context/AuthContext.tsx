import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. Added 'login' to the interface so the app knows it exists
interface AuthContextType {
  user: { name: string; role: string } | null;
  login: (userData: { name: string; role: string }) => void;
  switchRole: (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 2. Changed this to 'null' so the app starts at the Login screen!
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  // 3. Created the login function to save the data from your Node backend
  const login = (userData: { name: string; role: string }) => {
    setUser(userData);
  };

  const switchRole = (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => {
    setUser(prev => prev ? { ...prev, role: newRole } : null);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    // 4. Added 'login' to the Provider so other pages can use it
    <AuthContext.Provider value={{ user, login, switchRole, logout }}>
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