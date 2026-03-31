import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Auth context type
interface AuthContextType {
  user: { name: string; role: string } | null;
  login: (userData: { name: string; role: string }) => void;
  switchRole: (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => void;
  logout: () => void;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('✅ User loaded from localStorage:', parsedUser);
      }
    } catch (err) {
      console.error('❌ Error loading user from localStorage:', err);
    }
    setIsLoading(false);
  }, []);

  // Login function (ONLY ONE)
  const login = (userData: { name: string; role: string }) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ User logged in and saved to localStorage:', userData);
  };

  // Switch role
  const switchRole = (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => {
    setUser(prev => {
      const updated = prev ? { ...prev, role: newRole } : null;
      if (updated) {
        localStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    console.log('✅ User logged out and cleared from localStorage');
  };

  return (
    <AuthContext.Provider value={{ user, login, switchRole, logout }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};