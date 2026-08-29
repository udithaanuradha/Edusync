import React from 'react';
import { Users, GraduationCap, UserCheck, Award, Briefcase } from 'lucide-react';

export type ColorType = 'blue' | 'green' | 'purple' | 'amber' | 'red';

interface StatCardProps {
  title: string;
  value: string | number;
  color?: ColorType;
  subtitle?: string;
  icon?: React.ReactNode;
}

const colorConfig: Record<
  ColorType,
  { bg: string; iconBg: string; iconColor: string; subColor: string }
> = {
  blue: {
    bg: 'var(--eds-color-bg-surface)',
    iconBg: 'var(--eds-color-primary-soft)',
    iconColor: 'var(--eds-color-primary)',
    subColor: 'var(--eds-color-primary)',
  },
  green: {
    bg: 'var(--eds-color-bg-surface)',
    iconBg: 'var(--eds-color-success-bg)',
    iconColor: 'var(--eds-color-success-solid)',
    subColor: 'var(--eds-color-success-solid)',
  },
  amber: {
    bg: 'var(--eds-color-bg-surface)',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    subColor: '#d97706',
  },
  purple: {
    bg: 'var(--eds-color-bg-surface)',
    iconBg: '#faf5ff',
    iconColor: '#9333ea',
    subColor: '#9333ea',
  },
  red: {
    bg: 'var(--eds-color-bg-surface)',
    iconBg: 'var(--eds-color-danger-bg)',
    iconColor: 'var(--eds-color-danger-solid)',
    subColor: 'var(--eds-color-danger-solid)',
  },
};

const defaultIcons: Record<string, React.ReactNode> = {
  'Total Users': <Users size={22} color="var(--eds-color-primary)" />,
  'Students': <GraduationCap size={22} color="var(--eds-color-success-solid)" />,
  'Coordinators': <UserCheck size={22} color="#d97706" />,
  'Supervisors': <Award size={22} color="#9333ea" />,
  'Industry Mentors': <Briefcase size={22} color="var(--eds-color-danger-solid)" />,
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  color = 'blue',
  subtitle,
  icon,
}) => {
  const cfg = colorConfig[color] || colorConfig.blue;
  const renderedIcon = icon || defaultIcons[title] || <Users size={22} color={cfg.iconColor} />;

  return (
    <div
      style={{
        backgroundColor: 'var(--eds-color-bg-surface)',
        border: '1px solid var(--eds-color-border)',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '200px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = 'var(--eds-color-border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = 'var(--eds-color-border)';
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: cfg.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {renderedIcon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--eds-color-text-strong)',
            lineHeight: '1.1',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--eds-color-text-muted)',
            marginTop: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: cfg.subColor,
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;