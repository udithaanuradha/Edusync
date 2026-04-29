import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import './AdminDashboard.css';

interface StageFile {
  file_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

interface Stage {
  stage_id: number;
  stage_name: string;
  description: string;
  deadline: string;
  level: number;
  created_at: string;
  files?: StageFile[];
}

interface GroupMember {
  id: number;
  name: string;
  university_id: string;
  is_leader: number;
}

interface Group {
  groupId: number;
  groupName: string;
  supervisor: string;
  leader: string;
  members: GroupMember[];
  status: string;
}

interface MarkReport {
  student_name: string;
  university_id: string;
  group_name: string;
  stage_name: string;
  marks: number;
  feedback: string;
}

interface AdminLevelPageProps {
  levelNumber: number;
}

const AdminLevelPage: React.FC<AdminLevelPageProps> = ({ levelNumber }) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'groups' | 'marks'>('stages');
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [marks, setMarks] = useState<MarkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [levelNumber]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const stageRes = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
      const stageData = await stageRes.json();
      if (stageData.success) setStages(stageData.data);

      const groupRes = await fetch(`http://localhost:5000/api/groups/level/${levelNumber}`);
      const groupData = await groupRes.json();
      if (Array.isArray(groupData)) setGroups(groupData);

      const marksRes = await fetch(`http://localhost:5000/api/marks/level/${levelNumber}`);
      const marksData = await marksRes.json();
      if (marksData.success) setMarks(marksData.data);

    } catch (err) {
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    // You can add your PDF generation or Export CSV logic here
    alert(`Generating marks report for Level ${levelNumber}...`);
  };

  const formatDate = (date: string) => {
    if (!date) return 'No deadline set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  const badgeStyle: React.CSSProperties = {
    width: '40px', height: '40px', borderRadius: '50%',
    backgroundColor: '#2563eb', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px', flexShrink: 0,
  };

  const fileLinkStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '8px',
    color: '#2563eb', textDecoration: 'none', fontSize: '14px', marginTop: '4px'
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-header-section">
            <h2 className="overview-title">Level {levelNumber} Management</h2>
            <p className="overview-subtitle">Manage and view project stages, groups, and marks for Level {levelNumber}.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => setActiveTab('stages')}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                backgroundColor: activeTab === 'stages' ? '#2563eb' : '#f3f4f6',
                color: activeTab === 'stages' ? 'white' : '#6b7280' }}>
              Project Stages
            </button>
            <button onClick={() => setActiveTab('groups')}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                backgroundColor: activeTab === 'groups' ? '#2563eb' : '#f3f4f6',
                color: activeTab === 'groups' ? 'white' : '#6b7280' }}>
              Project Groups
            </button>
            <button onClick={() => setActiveTab('marks')}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                backgroundColor: activeTab === 'marks' ? '#2563eb' : '#f3f4f6',
                color: activeTab === 'marks' ? 'white' : '#6b7280' }}>
              Marks Reports
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : (
            <>
              {activeTab === 'stages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {stages.length > 0 ? stages.map((stage, index) => (
                    <div key={stage.stage_id} style={cardStyle}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={badgeStyle}>{index + 1}</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>{stage.stage_name}</h3>
                          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                            <span style={{ color: '#374151', fontWeight: '500' }}>Description: </span>
                            <span style={{ color: '#6b7280' }}>{stage.description || 'No description'}</span>
                          </div>
                          <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                            <span style={{ color: '#374151', fontWeight: '500' }}>Deadline: </span>
                            <span style={{ color: stage.deadline ? '#dc2626' : '#9ca3af' }}>{formatDate(stage.deadline)}</span>
                          </div>
                          {stage.files && stage.files.length > 0 ? (
                            <div>
                              <p style={{ fontWeight: '500', fontSize: '14px', marginBottom: '8px' }}>Documents ({stage.files.length}):</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {stage.files.map((file) => (
                                  <a key={file.file_id} href={file.file_url} target="_blank" rel="noopener noreferrer" style={fileLinkStyle}>
                                    📄 {file.file_name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No documents uploaded</p>
                          )}
                        </div>
                        <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                          View Only
                        </div>
                      </div>
                    </div>
                  )) : <p>No stages found.</p>}
                </div>
              )}

              {activeTab === 'groups' && (
                <div style={cardStyle}>
                  <h3 style={{ marginBottom: '20px' }}>Level {levelNumber} Registered Groups</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6', color: '#6b7280' }}>
                          <th style={{ padding: '12px' }}>Group Name</th>
                          <th style={{ padding: '12px' }}>Supervisor</th>
                          <th style={{ padding: '12px' }}>Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((group) => (
                          <tr key={group.groupId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{group.groupName}</td>
                            <td style={{ padding: '12px' }}>{group.supervisor}</td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {group.members.map((m) => (
                                  <span key={m.id} style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                    {m.name} {m.is_leader ? '👑' : ''}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'marks' && (
                <div style={cardStyle}>
                  {/* Header section with Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Marks Report Generation</h3>
                    <button 
                      onClick={handleGenerateReport}
                      style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#fee2e2', // Light red background
                        color: '#991b1b', // Dark red text
                        border: '1px solid #fecaca',
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    >
                      Generate Marks Report
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6', color: '#6b7280' }}>
                          <th style={{ padding: '12px' }}>Student</th>
                          <th style={{ padding: '12px' }}>Group</th>
                          <th style={{ padding: '12px' }}>Stage</th>
                          <th style={{ padding: '12px' }}>Marks</th>
                          <th style={{ padding: '12px' }}>Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks.length > 0 ? marks.map((m, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: '600' }}>{m.student_name}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{m.university_id}</div>
                            </td>
                            <td style={{ padding: '12px' }}>{m.group_name}</td>
                            <td style={{ padding: '12px' }}>{m.stage_name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ 
                                backgroundColor: m.marks >= 40 ? '#dcfce7' : '#fee2e2', 
                                color: m.marks >= 40 ? '#166534' : '#991b1b',
                                padding: '4px 10px', borderRadius: '12px', fontWeight: '700'
                              }}>
                                {m.marks}%
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{m.feedback || 'No feedback'}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                              No marks found for this level.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLevelPage;