import { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  LucideIcon
} from 'lucide-react';
import './Sidebar.css';

// --- TYPESCRIPT INTERFACES ---
interface SubMenuItem {
  path: string;
  label: string;
}

interface AcademicLevel {
  label: string;
  items: SubMenuItem[];
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

  const toggleMenu = (menuKey?: string) => {
    if (!collapsed && menuKey) {
      setExpandedMenus(prev => ({
        ...prev,
        [menuKey]: !prev[menuKey]
      }));
    }
  };

  const menuItems: MenuItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { 
      key: 'academicLevel',
      icon: UsersGroup, 
      label: 'Academic Level',
      hasSubmenu: true,
      submenu: [
        { 
          label: 'Level 1', 
          items: [
            { path: '/dashboard/level-1/proposal', label: 'Proposal' },
            { path: '/dashboard/level-1/interim', label: 'Interim' },
            { path: '/dashboard/level-1/final', label: 'Final Evaluation' },
            { path: '/dashboard/level-1/submission', label: 'File Submission' },
          ]
        },
        { 
          label: 'Level 2', 
          items: [
            { path: '/dashboard/level-2/proposal', label: 'Proposal' },
            { path: '/dashboard/level-2/interim', label: 'Interim' },
            { path: '/dashboard/level-2/code-review', label: 'Code Review' },
            { path: '/dashboard/level-2/final', label: 'Final Evaluation' },
            { path: '/dashboard/level-2/submission', label: 'File Submission' },
          ]
        },
        { 
          label: 'Level 3', 
          items: [
            { path: '/dashboard/level-3/proposal', label: 'Proposal' },
            { path: '/dashboard/level-3/interim', label: 'Interim' },
            { path: '/dashboard/level-3/final', label: 'Final Evaluation' },
            { path: '/dashboard/level-3/submission', label: 'File Submission' },
          ]
        },
        { 
          label: 'Level 4', 
          items: [
            { path: '/dashboard/level-4/proposal', label: 'Proposal' },
            { path: '/dashboard/level-4/interim', label: 'Interim' },
            { path: '/dashboard/level-4/final', label: 'Final Evaluation' },
            { path: '/dashboard/level-4/submission', label: 'File Submission' },
          ]
        },
      ]
    },
    { path: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
    { path: '/dashboard/communication', icon: MessageSquare, label: 'Communication' },
    { path: '/dashboard/announcements', icon: ClipboardList, label: 'Announcements' },
    { path: '/dashboard/project-groups', icon: FolderOpen, label: 'Project Groups' },
    { path: '/dashboard/guidelines', icon: UserCog, label: 'Guidelines' },
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
                        <div key={levelIndex} className="submenu-section">
                          <div className="submenu-title">{level.label}</div>
                          {level.items.map((subItem, subIndex) => (
                            <NavLink
                              key={subIndex}
                              to={subItem.path}
                              className={({ isActive }) =>
                                `submenu-item ${isActive ? 'active' : ''}`
                              }
                            >
                              {subItem.label}
                            </NavLink>
                          ))}
                        </div>
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