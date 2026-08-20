import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  designation?: string;
  effectiveRole?: string;
  level?: number;
  academic_unit?: string;
}

const normalizeUserData = (userData: User): User => {
  const role = String(userData?.role || '').trim().toLowerCase();
  const designation = String(userData?.designation || '').trim().toLowerCase();
  const effectiveRole = String(userData?.effectiveRole || '').trim().toLowerCase();

  const resolvedDesignation = designation || (role === 'lecturer' ? effectiveRole : '');
  const resolvedEffectiveRole =
    effectiveRole ||
    (role === 'lecturer' && resolvedDesignation ? resolvedDesignation : '') ||
    (role === 'coordinator' ? 'coordinator' : '') ||
    role;

  return {
    ...userData,
    role: role === 'coordinator' ? 'lecturer' : role,
    designation: resolvedDesignation || undefined,
    effectiveRole: resolvedEffectiveRole || undefined,
  };
};

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  switchRole: (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Persist user across page refresh
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData: User) => {
    const normalizedUser = normalizeUserData(userData);
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const switchRole = (newRole: 'admin' | 'supervisor' | 'mentor' | 'coordinator' | 'student') => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, role: newRole };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
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