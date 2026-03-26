import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Inside Sidebar.tsx
submenu: [
  { label: 'Level 1', path: '/studentDashboard/level-1' },
  { label: 'Level 2', path: '/studentDashboard/level-2' },
  { label: 'Level 3', path: '/studentDashboard/level-3' },
  { label: 'Level 4', path: '/studentDashboard/level-4' },
]


 
 
 

import {
  LayoutDashboard,
  Users as UsersGroup,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  FolderOpen,
  UserCog,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LucideIcon,
  Link
} from 'lucide-react';
import './Sidebar.css';

// --- TYPESCRIPT INTERFACES ---
interface SubMenuItem {
  path: string;
  label: string;
}

interface AcademicLevel {
  label: string;
  path: string;
}

interface MenuItem {
  path?: string;
  key?: string;
  icon: LucideIcon;
  label: string;
  hasSubmenu?: boolean;
  submenu?: AcademicLevel[] | SubMenuItem[];
}
// -----------------------------

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    academicLevel: false,
  });
  const { user } = useAuth();

  const toggleMenu = (menuKey?: string) => {
    if (!collapsed && menuKey) {
      setExpandedMenus(prev => ({
        ...prev,
        [menuKey]: !prev[menuKey]
      }));
    }
  };

  // Different routes based on user role
  const getAcademicLevelSubmenu = () => {
    if (user?.role === 'student') {
      return [
        { label: 'Level 1', path: '/studentDashboard/level-1' },
        { label: 'Level 2', path: '/studentDashboard/level-2' },
        { label: 'Level 3', path: '/studentDashboard/level-3' },
        { label: 'Level 4', path: '/studentDashboard/level-4' },
      ];
    } else {
      // For coordinator and other roles
      return [
        { label: 'Level 1', path: '/dashboard/level-1' },
        { label: 'Level 2', path: '/dashboard/level-2' },
        { label: 'Level 3', path: '/dashboard/level-3' },
        { label: 'Level 4', path: '/dashboard/level-4' },
      ];
    }
  };

  const menuItems: MenuItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { 
      key: 'academicLevel',
      icon: UsersGroup, 
      label: 'Academic Level',
      hasSubmenu: true,
      submenu: getAcademicLevelSubmenu()
    },
    { path: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
    { path: '/dashboard/communication', icon: MessageSquare, label: 'Communication' },
    { path: '/dashboard/announcements', icon: ClipboardList, label: 'Announcements' },
    { path: '/dashboard/project-groups', icon: FolderOpen, label: 'Project Groups' },
    { path: '/dashboard/project-delays', icon: AlertTriangle, label: 'Project Delays' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">E</div>
          {!collapsed && <span className="logo-text">EduSync</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <div key={item.key || item.path || index}>
            {item.hasSubmenu ? (
              <>
                <div 
                  className={`nav-item expandable ${item.key && expandedMenus[item.key] ? 'expanded' : ''}`}
                  onClick={() => toggleMenu(item.key)}
                >
                  <item.icon size={22} />
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      <ChevronDown 
                        size={18} 
                        className="expand-icon"
                        style={{ 
                          transform: item.key && expandedMenus[item.key] ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </>
                  )}
                </div>
                {!collapsed && item.key && expandedMenus[item.key] && item.submenu && (
                  <div className="submenu">
                    {item.key === 'academicLevel' ? (
                      (item.submenu as AcademicLevel[]).map((level, levelIndex) => (
                        <NavLink
                          key={levelIndex}
                          to={level.path}
                          className={({ isActive }) =>
                            `submenu-item ${isActive ? 'active' : ''}`
                          }
                        >
                          {level.label}
                        </NavLink>
                      ))
                    ) : (
                      (item.submenu as SubMenuItem[]).map((subItem, subIndex) => (
                        <NavLink
                          key={subIndex}
                          to={subItem.path}
                          className={({ isActive }) =>
                            `submenu-item ${isActive ? 'active' : ''}`
                          }
                        >
                          {subItem.label}
                        </NavLink>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path || '#'}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={22} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;