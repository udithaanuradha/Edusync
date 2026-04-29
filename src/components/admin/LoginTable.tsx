import React, { useState, useEffect } from 'react';

interface LoginRow {
  username: string;
  role: string;
  time: string;
  status?: string; // Optional: can be hardcoded or from API
}

const LoginTable: React.FC = () => {
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Define role colors for consistent branding
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'student': return '#2563eb';
      case 'coordinator': return '#16a34a';
      case 'supervisor': return '#9333ea';
      case 'mentor': return '#0d9488'; // Teal for Industry Mentors
      default: return '#4b5563';
    }
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/admin/recent-logins')
      .then((res) => res.json())
      .then((data) => {
        setLogins(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching login data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(to right, #ffffff, #f8fafc)',
      marginTop: '32px',
      padding: '24px',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0'
    }}>

      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '16px',
        color: '#1e293b',
      }}>
        Recent Logins
      </h2>

      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
            <th style={{ padding: '12px 8px', color: '#64748b', fontSize: '14px' }}>Username</th>
            <th style={{ padding: '12px 8px', color: '#64748b', fontSize: '14px' }}>Role</th>
            <th style={{ padding: '12px 8px', color: '#64748b', fontSize: '14px' }}>Login Time</th>
            <th style={{ padding: '12px 8px', color: '#64748b', fontSize: '14px' }}>Status</th>
          </tr>
        </thead>

        <tbody style={{ color: '#334155' }}>
          {loading ? (
            <tr>
              <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Loading logins...</td>
            </tr>
          ) : logins.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>No recent logins found.</td>
            </tr>
          ) : (
            logins.map((login: LoginRow, index: number) => (
              <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 8px', fontWeight: '500' }}>{login.username}</td>
                <td style={{ 
                  padding: '16px 8px', 
                  fontWeight: '600',
                  color: getRoleColor(login.role) 
                }}>
                  {login.role}
                </td>
                <td style={{ padding: '16px 8px', color: '#64748b' }}>
                  {/* Formats the DB timestamp into a readable string */}
                  {new Date(login.time).toLocaleString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}
                </td>
                <td style={{ padding: '16px 8px' }}>
                  <span style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Success
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LoginTable;