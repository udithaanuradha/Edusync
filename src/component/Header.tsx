import React from 'react';
import './Header.css';

interface HeaderProps {
  title?: string;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Supervisor Dashboard', userName = 'Admin' }) => (
  <header className="header">
    <div className="header-content">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
        <p className="welcome-text">Welcome back, {userName}</p>
      </div>
      <div className="header-right">
        <div className="user-avatar-circle">{userName.charAt(0).toUpperCase()}</div>
      </div>
    </div>
  </header>
);

export default Header;
