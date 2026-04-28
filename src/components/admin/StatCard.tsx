import React from 'react';

// 1. Add your new color to the type
type ColorType = 'blue' | 'green' | 'purple' | 'amber' | 'red'; 

interface StatCardProps {
  title: string;
  value: string | number;
  color?: ColorType;
}

// 2. Define the styles for your new color
const colorStyles: Record<ColorType, React.CSSProperties> = {
  blue: { backgroundColor: '#eff6ff', color: '#2563eb' },
  green: { backgroundColor: '#f0fdf4', color: '#16a34a' },
  purple: { backgroundColor: '#faf5ff', color: '#9333ea' },
  amber: { backgroundColor: '#fffbeb', color: '#d97706' },
  red: { backgroundColor: '#fef2f2', color: '#dc2626' }, 
};

const StatCard: React.FC<StatCardProps> = ({ title, value, color = 'blue' }) => {
  return (
    <div style={{
      ...colorStyles[color],
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      width: '200px',
      minWidth: '150px',
    }}>
      <h3 style={{ 
        color: '#374151', 
        fontSize: '14px',
        fontWeight: '500',
        margin: '0',
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '30px', 
        fontWeight: '700', 
        marginTop: '12px',
        margin: '12px 0 0 0',
        color: colorStyles[color].color,
      }}>
        {value}
      </p>
    </div>
  );
};

export default StatCard;