import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocketV2 } from '../../hooks/useSocketV2';
import { fetchUnreadMessageCountV2 } from '../../utils/apiV2';
import { Bell, ChevronDown, LogOut, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  pageTitle?: string;
  /** Optional override for whether the feedback-bell badge can show. When
   * omitted, falls back to the original behavior (student role only) — so
   * every existing direct `<Header />` usage is unaffected. */
  showFeedbackBadge?: boolean;
}

const Header: React.FC<HeaderProps> = ({ pageTitle = 'Dashboard', showFeedbackBadge }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { subscribeToMessages, subscribeToGroupMessages } = useSocketV2();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  // 1. Red notification badge — count of unseen supervisor feedback on the
  // student's own group milestones (Students only).
  useEffect(() => {
    const canShowBadge = showFeedbackBadge ?? (user?.role === 'student');
    if (!user?.id || !canShowBadge) {
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
        // Silently ignore
      }
    };

    loadFeedbackCount();
    const intervalId = setInterval(loadFeedbackCount, 60000);
    window.addEventListener('supervisor-feedback-seen', loadFeedbackCount);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('supervisor-feedback-seen', loadFeedbackCount);
    };
  }, [user?.id, user?.role, showFeedbackBadge]);

  // 2. Real-time Unread Communication Chat Messages (All Roles)
  const refreshUnreadChatCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await fetchUnreadMessageCountV2(user.id);
      setUnreadChatCount(count);
    } catch {
      // Silently ignore
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadChatCount(0);
      return;
    }

    refreshUnreadChatCount();

    // Poll periodically in case messages arrive while idle
    const intervalId = setInterval(refreshUnreadChatCount, 15000);

    // Subscribe to real-time 1:1 messages
    const unsubscribe1 = subscribeToMessages((msg) => {
      if (user && msg.sender_id !== user.id) {
        refreshUnreadChatCount();
      }
    });

    // Subscribe to real-time group messages
    const unsubscribe2 = subscribeToGroupMessages((msg) => {
      if (user && msg.sender_id !== user.id) {
        refreshUnreadChatCount();
      }
    });

    // Window events for immediate clearance when user reads messages
    window.addEventListener('chat-messages-read', refreshUnreadChatCount);
    window.addEventListener('chat-unread-updated', refreshUnreadChatCount);

    return () => {
      clearInterval(intervalId);
      unsubscribe1();
      unsubscribe2();
      window.removeEventListener('chat-messages-read', refreshUnreadChatCount);
      window.removeEventListener('chat-unread-updated', refreshUnreadChatCount);
    };
  }, [user?.id, refreshUnreadChatCount, subscribeToMessages, subscribeToGroupMessages]);

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

  const totalNotifications = feedbackCount + unreadChatCount;

  const handleBellClick = () => {
    if (unreadChatCount > 0) {
      navigate('/dashboard/communication');
    } else if (feedbackCount > 0 && user?.role === 'student') {
      navigate('/project-management');
    } else {
      navigate('/dashboard/communication');
    }
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

          <div
            className="notification-wrapper"
            title={
              unreadChatCount > 0
                ? `${unreadChatCount} new chat message${unreadChatCount > 1 ? 's' : ''}${feedbackCount > 0 ? `, ${feedbackCount} milestone feedback` : ''}`
                : feedbackCount > 0
                ? `${feedbackCount} new supervisor feedback`
                : 'Communication & Messages'
            }
            onClick={handleBellClick}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleBellClick();
            }}
            aria-label="Notifications"
          >
            <Bell size={20} className="bell-icon" />
            {totalNotifications > 0 && (
              <span className="notification-badge notification-badge-feedback">
                {totalNotifications > 9 ? '9+' : totalNotifications}
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