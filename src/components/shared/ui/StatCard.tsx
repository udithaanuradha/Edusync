import React from 'react';
import BaseCard from './BaseCard';
import styles from './StatCard.module.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  /** Drives the icon-wrapper color. Replaces each role's own separate
   * colorClass/iconBgClass system (see audit: components/admin/StatCard.tsx,
   * coordinator/StatCards.tsx, mentor/StatCard.tsx, student/StatCard.tsx all
   * had a different, incompatible prop shape for this). */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * One unified stat-card component for all 5 roles. Replaces:
 *   - components/admin/StatCard.tsx
 *   - components/coordinator/StatCards.tsx
 *   - components/mentor/StatCard.tsx (was dead code / unused)
 *   - components/student/StatCard.tsx (was dead code / unused)
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon, tone = 'primary' }) => {
  return (
    <BaseCard className={styles.statCard} padding="md">
      <div className={`${styles.iconWrap} ${styles[tone]}`}>{icon}</div>
      <div className={styles.details}>
        <h3 className={styles.value}>{value}</h3>
        <p className={styles.title}>{title}</p>
        {subtext && <p className={styles.subtext}>{subtext}</p>}
      </div>
    </BaseCard>
  );
};

export default StatCard;
