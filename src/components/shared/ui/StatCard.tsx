import React from 'react';
import { ChevronDown } from 'lucide-react';
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
  /** Makes the whole card clickable — e.g. to toggle a detail panel the
   * caller renders elsewhere (a stat-card grid cell is usually too narrow
   * to host that panel itself). Adds a hover affordance and a chevron so
   * the card reads as interactive; any StatCard can opt into this, it
   * isn't specific to one card. Omit for a plain, static card exactly as
   * before. */
  onClick?: () => void;
  /** Whether the thing this card toggles is currently open. Purely
   * presentational (flips the chevron) — the caller owns the actual
   * open/closed state and whatever it renders as a result. */
  expanded?: boolean;
}

/**
 * One unified stat-card component for all 5 roles. Replaces:
 *   - components/admin/StatCard.tsx
 *   - components/coordinator/StatCards.tsx
 *   - components/mentor/StatCard.tsx (was dead code / unused)
 *   - components/student/StatCard.tsx (was dead code / unused)
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  tone = 'primary',
  onClick,
  expanded = false,
}) => {
  return (
    <BaseCard className={styles.statCard} padding="md" hoverable={Boolean(onClick)} onClick={onClick}>
      <div className={`${styles.iconWrap} ${styles[tone]}`}>{icon}</div>
      <div className={styles.details}>
        <h3 className={styles.value}>{value}</h3>
        <p className={styles.title}>{title}</p>
        {subtext && <p className={styles.subtext}>{subtext}</p>}
      </div>
      {onClick && (
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
      )}
    </BaseCard>
  );
};

export default StatCard;
