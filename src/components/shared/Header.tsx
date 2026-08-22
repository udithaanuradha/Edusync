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
  const [feedbackCount, setFeedbackCount] = useState(0);

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  // Red notification badge — count of unseen supervisor feedback on the
  // student's own group milestones. Students only; other roles never see
  // this badge since there's nothing to fetch for them.
  useEffect(() => {
    if (!user?.id || user.role !== 'student') {
      setFeedbackCount(0);
      return;
    }

    let cancelled = false;

    const loadFeedbackCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/milestones/feedback/unseen-count/${user.id}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
            'X-User-Id': String(user.id),
            'X-User-Role': user.role,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success) {
          setFeedbackCount(Number(data.count) || 0);
        }
      } catch {
        // Silently ignore — the badge just stays at its last known count.
      }
    };

    loadFeedbackCount();
    // Poll periodically in case feedback arrives while the header is mounted.
    const intervalId = setInterval(loadFeedbackCount, 60000);
    // Also refresh immediately when ProjectManagementPage marks feedback seen,
    // so the badge clears without waiting for the next poll.
    window.addEventListener('supervisor-feedback-seen', loadFeedbackCount);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('supervisor-feedback-seen', loadFeedbackCount);
    };
  }, [user?.id, user?.role]);

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

          <div className="notification-wrapper" title={feedbackCount > 0 ? 'New supervisor feedback' : undefined}>
            <Bell size={20} className="bell-icon" />
            {feedbackCount > 0 && (
              <span className="notification-badge notification-badge-feedback">
                {feedbackCount > 9 ? '9+' : feedbackCount}
              </span>
            )}
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