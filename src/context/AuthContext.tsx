 import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// 1. Added 'login' to the interface so the app knows it exists
interface AuthContextType {
  user: { name: string; role: string } | null;
  login: (userData: { name: string; role: string }) => void;
  switchRole: (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state - will be set by useEffect
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        console.log('✅ User loaded from localStorage:', JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('❌ Error loading user from localStorage:', err);
    }
    setIsLoading(false);
  }, []);

  // This function updates the role
  const switchRole = (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => {
    setUser(prev => {
      const updated = prev ? { ...prev, role: newRole } : null;
      if (updated) {
        localStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const login = (userData: { name: string; role: string }) => {
    setUser(userData);
    // Save to localStorage so user stays logged in after page refresh
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ User logged in and saved to localStorage:', userData);
  };

  const logout = () => {
    setUser(null);
    // Clear from localStorage
    localStorage.removeItem('user');
    console.log('✅ User logged out and cleared from localStorage');
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