import React from 'react';
import styles from './BaseCard.module.css';

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

/**
 * Generic surface container — the foundation every other card-shaped shared
 * component (StatCard, etc.) is built on. Styled purely from theme/tokens.css
 * so it automatically stays in sync with the rest of the design system.
 */
const BaseCard: React.FC<BaseCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  onClick,
}) => {
  const paddingClass =
    padding === 'none' ? '' : styles[`padding-${padding}` as keyof typeof styles];

  return (
    <div
      className={[styles.card, paddingClass, hoverable ? styles.hoverable : '', className]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default BaseCard;
