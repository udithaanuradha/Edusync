import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  pageTitle?: string;
}

const Header: React.FC<HeaderProps> = ({ pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="page-title">{pageTitle}</h1>
        </div>

        <div className="header-right">
          <span className="welcome-text">
            Welcome back, {user?.name || 'User'}
          </span>

          <div className="notification-wrapper">
            <Bell size={20} className="bell-icon" />
            <span className="notification-badge">2</span>
          </div>

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