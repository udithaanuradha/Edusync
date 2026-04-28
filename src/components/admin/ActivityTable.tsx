import React from 'react';

interface ActivityRow {
  username: string;
  role: string;
  roleColor: string;
  action: string;
  time: string;
}

const ActivityTable: React.FC = () => {

  const activities: ActivityRow[] = [
    {
      username: 'pererahav.23',
      role: 'Student',
      roleColor: '#2563eb',
      action: 'Uploaded level-2 interim report',
      time: '2 minutes ago',
    },
    {
      username: 'nimaljk_IT.62',
      role: 'Coordinator',
      roleColor: '#16a34a',
      action: 'Created new level-1 project group',
      time: '10 minutes ago',
    },
    {
      username: 'jayalathwp_IT.88',
      role: 'Supervisor',
      roleColor: '#9333ea',
      action: 'Approved level-1 proposal submissions',
      time: '40 minutes ago',
    },
    {
      username: 'dissana_codegen.126',
      role: 'Mentor',
      roleColor: '#db2777',
      action: 'Wrote feedback',
      time: '45 minutes ago',
    },
    {
      username: 'samanthiks.21',
      role: 'Student',
      roleColor: '#2563eb',
      action: 'Submitted final project documentation',
      time: '55 minutes ago',
    },
  ];

  return (
    <div style={{
      background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
      marginTop: '32px',
      padding: '24px',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    }}>

      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '16px',
        color: '#374151',
      }}>
        Recent Activity
      </h2>

      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>

        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '8px' }}>Username</th>
            <th style={{ padding: '8px' }}>Role</th>
            <th style={{ padding: '8px' }}>Action</th>
            <th style={{ padding: '8px' }}>Time</th>
          </tr>
        </thead>

        <tbody style={{ color: '#4b5563' }}>
          {activities.map((activity: ActivityRow, index: number) => (
            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px 8px' }}>{activity.username}</td>
              <td style={{ 
                padding: '12px 8px', 
                fontWeight: '600',
                color: activity.roleColor 
              }}>
                {activity.role}
              </td>
              <td style={{ padding: '12px 8px' }}>{activity.action}</td>
              <td style={{ padding: '12px 8px' }}>{activity.time}</td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
};

export default ActivityTable;