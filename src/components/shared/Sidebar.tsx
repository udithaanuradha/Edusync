import { useState, type FC } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersGroup,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

interface SubMenuItem {
  path: string;
  label: string;
}

interface AcademicLevel {
  label: string;
  path: string;
}

export interface MenuItem {
  path?: string;
  key?: string;
  icon: LucideIcon;
  label: string;
  hasSubmenu?: boolean;
  submenu?: AcademicLevel[] | SubMenuItem[];
}

interface SidebarProps {
  /** Optional, role-driven nav item list — e.g. passed by AppShell. When
   * omitted, Sidebar falls back to its original hardcoded list exactly as
   * before, so every existing direct `<Sidebar />` usage is unaffected. */
  navItems?: MenuItem[];
}

// Coordinator-only nav list: same as the default sidebar but without
// "Project Delays" — that route isn't implemented for the coordinator role
// (it redirects straight back to /dashboard), so the link was dead weight.
// Kept separate from `defaultMenuItems` so Student and any other role still
// falling back to the default list are completely unaffected.
//
// Lists all four levels regardless of which one this coordinator is
// assigned to — the sidebar itself isn't the access boundary. What each
// level route actually renders IS: App.tsx redirects a coordinator away
// from a /dashboard/level-N whose data they're not assigned to, back to
// their own level, so clicking another level here never reveals its real
// submissions/marksheet.
export const coordinatorMenuItems: MenuItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  {
    key: "academicLevel",
    icon: UsersGroup,
    label: "Academic Level",
    hasSubmenu: true,
    submenu: [
      { label: "Level 1", path: "/dashboard/level-1" },
      { label: "Level 2", path: "/dashboard/level-2" },
      { label: "Level 3", path: "/dashboard/level-3" },
      { label: "Level 4", path: "/dashboard/level-4" },
    ],
  },
  { path: "/dashboard/calendar", icon: CalendarDays, label: "Calendar" },
  {
    path: "/dashboard/communication",
    icon: MessageSquare,
    label: "Communication",
  },
  { path: "/dashboard/announcements", icon: ClipboardList, label: "Announcements" },
];

// Shared with pages outside CoordinatorPages/ (CalendarPage, CommunicationPageV2)
// that render Sidebar/AppShell for every role from one place — lets them opt a
// coordinator into coordinatorMenuItems without affecting any other role.
export const isCoordinatorUser = (userObj: any): boolean => {
  const effectiveRole = String(
    userObj?.effectiveRole || userObj?.designation || userObj?.role || ""
  ).toLowerCase();
  return userObj?.role === "lecturer" && effectiveRole === "coordinator";
};

const Sidebar: FC<SidebarProps> = ({ navItems }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { user } = useAuth();
  const userObj = user as any; // Cast to bypass strict type check for designation field
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    academicLevel: false,
  });

  const isSupervisorUser =
    userObj?.role === "supervisor" ||
    (userObj?.role === "lecturer" &&
      (userObj?.designation === "supervisor" || !userObj?.designation));

  const announcementsPath = isSupervisorUser
    ? "/supervisor/announcements"
    : "/dashboard/announcements";

  const toggleMenu = (menuKey?: string) => {
    if (!collapsed && menuKey) {
      setExpandedMenus((prev) => ({
        ...prev,
        [menuKey]: !prev[menuKey],
      }));
    }
  };

  const defaultMenuItems: MenuItem[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      key: "academicLevel",
      icon: UsersGroup,
      label: "Academic Level",
      hasSubmenu: true,
      submenu: [
        { label: "Level 1", path: "/dashboard/level-1" },
        { label: "Level 2", path: "/dashboard/level-2" },
        { label: "Level 3", path: "/dashboard/level-3" },
        { label: "Level 4", path: "/dashboard/level-4" },
      ],
    },
    { path: "/dashboard/calendar", icon: CalendarDays, label: "Calendar" },
    {
      path: "/dashboard/communication",
      icon: MessageSquare,
      label: "Communication",
    },
    // "Communication (V2)" link removed — both routes render the same chat
    // now (see App.tsx), so a second nav entry was pure duplication. The
    // /dashboard/communication-v2 route itself is untouched, just unlinked.
    { path: announcementsPath, icon: ClipboardList, label: "Announcements" },
    // Supervisor gets a separate "Approval" nav (rendered via SupervisorSidebar
    // alongside this one) and has no use for Project Delays, so the link is
    // dropped just for that role below — every other role falling back to
    // this default list keeps it.
    {
      path: "/dashboard/project-delays",
      icon: AlertTriangle,
      label: "Project Delays",
    },
  ].filter((item) => !(isSupervisorUser && item.label === "Project Delays"));

  const menuItems = navItems ?? defaultMenuItems;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <img 
            src="/edusync-logo.svg" 
            alt="EduSync Logo" 
            style={{ width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0 }} 
          />
          {!collapsed && <span className="logo-text">EduSync</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                  className={`nav-item expandable ${item.key && expandedMenus[item.key] ? "expanded" : ""}`}
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
                          transform:
                            item.key && expandedMenus[item.key]
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    </>
                  )}
                </div>
                {!collapsed &&
                  item.key &&
                  expandedMenus[item.key] &&
                  item.submenu && (
                    <div className="submenu">
                      {item.key === "academicLevel"
                        ? (item.submenu as AcademicLevel[]).map(
                            (level, levelIndex) => (
                              <NavLink
                                key={levelIndex}
                                to={level.path}
                                className={({ isActive }) =>
                                  `submenu-item ${isActive ? "active" : ""}`
                                }
                              >
                                {level.label}
                              </NavLink>
                            ),
                          )
                        : (item.submenu as SubMenuItem[]).map(
                            (subItem, subIndex) => (
                              <NavLink
                                key={subIndex}
                                to={subItem.path}
                                className={({ isActive }) =>
                                  `submenu-item ${isActive ? "active" : ""}`
                                }
                              >
                                {subItem.label}
                              </NavLink>
                            ),
                          )}
                    </div>
                  )}
              </>
            ) : (
              <NavLink
                to={item.path || "#"}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
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
