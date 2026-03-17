import React from 'react';
// 1. Cleaned up the import path (no .tsx)
import { useAuth } from '../../context/AuthContext';
import { Bell } from 'lucide-react'; 
import './Header.css';

const Header: React.FC = () => {
  // 2. We now grab BOTH the user data and the logout function!
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="page-title">Dashboard</h1>
        </div>

        <div className="header-right">
          {/* 3. The text now automatically updates based on who is logged in */}
          <span className="welcome-text">
            Welcome back, {user?.name || 'User'}
          </span>
          
          <div className="notification-wrapper">
            <Bell size={20} className="bell-icon" />
            <span className="notification-badge">2</span>
          </div>

          {/* 4. We even grab the first letter of their name for the Avatar circle! */}
          <div className="user-avatar-circle">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;