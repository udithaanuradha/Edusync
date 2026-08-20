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
    bg: '#ffffff',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    subColor: '#2563eb',
  },
  green: {
    bg: '#ffffff',
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    subColor: '#16a34a',
  },
  amber: {
    bg: '#ffffff',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    subColor: '#d97706',
  },
  purple: {
    bg: '#ffffff',
    iconBg: '#faf5ff',
    iconColor: '#9333ea',
    subColor: '#9333ea',
  },
  red: {
    bg: '#ffffff',
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    subColor: '#dc2626',
  },
};

const defaultIcons: Record<string, React.ReactNode> = {
  'Total Users': <Users size={22} color="#2563eb" />,
  'Students': <GraduationCap size={22} color="#16a34a" />,
  'Coordinators': <UserCheck size={22} color="#d97706" />,
  'Supervisors': <Award size={22} color="#9333ea" />,
  'Industry Mentors': <Briefcase size={22} color="#dc2626" />,
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
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
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
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = '#e2e8f0';
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
            color: '#0f172a',
            lineHeight: '1.1',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
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