import React from 'react';
import Sidebar, { type MenuItem } from '../Sidebar';
import Header from '../Header';
import styles from './AppShell.module.css';

interface AppShellProps {
  /** Role-specific nav items. Omit to use Sidebar's original default list. */
  navItems?: MenuItem[];
  pageTitle?: string;
  showFeedbackBadge?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps Sidebar + Header + the main content area in one place, replacing the
 * 5 different hand-rolled layout patterns found across the role dashboards
 * (redundant inline styles on Coordinator/Admin, a wrapper component on
 * Mentor, a second sidebar on Supervisor). Sidebar/Header themselves stay at
 * their existing location/import path — this only wraps them.
 */
const AppShell: React.FC<AppShellProps> = ({ navItems, pageTitle, showFeedbackBadge, children }) => {
  return (
    <div className={styles.shell}>
      <Sidebar navItems={navItems} />
      <div className={styles.main}>
        <Header pageTitle={pageTitle} showFeedbackBadge={showFeedbackBadge} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
