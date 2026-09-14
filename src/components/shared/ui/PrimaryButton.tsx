import React from 'react';
import styles from './PrimaryButton.module.css';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * One button component for all 5 roles, replacing the scattered
 * .btn-primary / .btn-secondary / .danger-btn class names that were
 * independently (and sometimes conflictingly) defined per role folder.
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  variant = 'primary',
  icon,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      className={[styles.button, styles[variant], fullWidth ? styles.fullWidth : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
};

export default PrimaryButton;
