import React, { useState, useEffect } from 'react';

interface LoginRow {
  username: string;
  role: string;
  time: string;
}

const LoginTable: React.FC = () => {
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#e11d48'; 
      case 'student': return '#2563eb'; 
      case 'coordinator': return '#059669'; 
      case 'supervisor': return '#7c3aed'; 
      default: return '#64748b';
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
      backgroundColor: '#ffffff',
      marginTop: '32px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
      
      {/* Title Header: Clean White */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
          Recent System Access
        </h2>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
          TIMEZONE: IST (SL)
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={columnHeaderStyle}>User Identity</th>
              <th style={columnHeaderStyle}>Security Role</th>
              <th style={columnHeaderStyle}>Access Time</th>
              <th style={{ ...columnHeaderStyle, textAlign: 'right' }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Syncing access logs...</td></tr>
            ) : (
              logins.map((login, index) => (
                <tr 
                  key={index} 
                  className="pro-table-row" 
                  style={{ 
                    borderBottom: '1px solid #f8fafc',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc' 
                  }}
                >
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px', 
                        backgroundColor: '#eff6ff', color: '#2563eb', // Light blue icon bg
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '700', fontSize: '10px', border: '1px solid #dbeafe'
                      }}>
                        {login.username.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600', color: '#1e293b' }}>{login.username}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '6px', height: '6px', borderRadius: '50%', 
                        backgroundColor: getRoleColor(login.role) 
                      }} />
                      <span style={{ color: '#475569', fontWeight: '500', textTransform: 'capitalize' }}>
                        {login.role}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 24px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(login.time).toLocaleString('en-GB', { 
                      timeZone: 'Asia/Colombo',
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true 
                    })}
                  </td>

                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                       <span className="pulse-dot"></span>
                       <span style={{ color: '#059669', fontSize: '11px', fontWeight: '700' }}>ONLINE</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <style>{`
        .pro-table-row { transition: background-color 0.1s ease; }
        .pro-table-row:hover { background-color: #f0f7ff !important; } /* Light blue hover */
        
        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          position: relative;
        }

        .pulse-dot::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const columnHeaderStyle: React.CSSProperties = {
  padding: '12px 24px',
  backgroundColor: '#f0f7ff', // Soft Blue Background for the header row
  color: '#2563eb',          // Vibrant Blue Text
  fontWeight: '700',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid #dbeafe'
};

export default LoginTable;