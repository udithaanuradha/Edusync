import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, ChevronDown, LogOut, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  pageTitle?: string;
}

const Header: React.FC<HeaderProps> = ({ pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleProfileSettings = () => {
    setIsMenuOpen(false);
    navigate('/profile-settings');
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {/* Page title removed - each page displays its own title below */}
        </div>

        <div className="header-right" ref={menuRef}>
          <span className="user-name-text" title={user?.name || 'User'}>
            {user?.name || 'User'}
          </span>

          <div className="notification-wrapper">
            <Bell size={20} className="bell-icon" />
            <span className="notification-badge">2</span>
          </div>

          <div className="account-menu-wrap">
            <button
              type="button"
              className="account-menu-trigger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Open account menu"
            >
              <span className="user-avatar-circle">{userInitial}</span>
              <ChevronDown size={16} className="account-menu-caret" />
            </button>

            {isMenuOpen && (
              <div className="account-dropdown" role="menu" aria-label="Account menu">
                <button type="button" className="account-dropdown-item" onClick={handleProfileSettings} role="menuitem">
                  <UserCog size={16} />
                  <span>Profile Settings</span>
                </button>
                <button type="button" className="account-dropdown-item danger" onClick={handleLogout} role="menuitem">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;