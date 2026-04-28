import React, { useState, useEffect } from 'react';

// Define the interface for the data coming from your database
interface ActivityRow {
  username: string;
  role: string;
  roleColor: string;
  action: string;
  time: string;
}

const ActivityTable: React.FC = () => {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real data on component mount
  useEffect(() => {
    fetch('http://localhost:5000/api/admin/recent-activity')
      .then((res) => res.json())
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching activity:", err);
        setLoading(false);
      });
  }, []);

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
          {loading ? (
            <tr>
              <td colSpan={4} style={{ padding: '12px', textAlign: 'center' }}>Loading activities...</td>
            </tr>
          ) : (
            activities.map((activity, index) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTable;