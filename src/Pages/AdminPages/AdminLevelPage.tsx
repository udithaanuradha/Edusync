import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import AssignCoordinatorPage from './AssignCoordinatorPage'; // අලුත් පිටුව Import කිරීම
import './AdminDashboard.css';
import { MentorImportPanel } from '../../components/mentor/MentorImportPanel';

interface StageFile {
  file_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by?: number;
  uploader_name?: string;
  academic_unit?: string;
}

interface Stage {
  stage_id: number;
  stage_name: string;
  description: string;
  deadline: string;
  level: number;
  created_at: string;
  created_by?: number;
  creator_name?: string;
  academic_unit?: string;
  mentor_details_url?: string;
  resource_links?: string; // 💡 ඩේටාබේස් එකෙන් එන ලින්ක් එක සඳහා එකතු කලා
  files?: StageFile[];
}

const getDegreeNameFromAcademicUnit = (unit?: string | null): string => {
  if (!unit) return '';
  const clean = unit.trim().toUpperCase();
  if (clean === 'IDS' || clean === 'ITM') return 'ITM';
  if (clean === 'IT') return 'IT';
  if (clean === 'CM' || clean === 'AI') return 'AI';
  return clean;
};

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
  mentorName?: string;
  leader: string;
  members: GroupMember[];
  status: string;
}

interface AdminLevelPageProps {
  levelNumber: number;
}

const AdminLevelPage: React.FC<AdminLevelPageProps> = ({ levelNumber }) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'groups'>('stages');
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAssignView, setIsAssignView] = useState(false);

  useEffect(() => {
    fetchAllData();
    setIsAssignView(false); 
  }, [levelNumber]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const stageRes = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);
      if (stageRes.ok) {
        const stageData = await stageRes.json();
        if (stageData.success) {
          setStages(stageData.data || []);
        } else if (Array.isArray(stageData)) {
          setStages(stageData);
        }
      } else {
        setStages([]);
      }

      const groupRes = await fetch(`http://localhost:5000/api/groups/level/${levelNumber}`);
      let groupData = [];
      if (groupRes.ok) {
        const rawGroup = await groupRes.json();
        groupData = Array.isArray(rawGroup) ? rawGroup : (rawGroup.data || []);
      }

      // Fetch mentors list to map mentor names to their assigned groups
      try {
        const mentorRes = await fetch(`http://localhost:5000/api/users?role=mentor`);
        if (mentorRes.ok) {
          const mentorData = await mentorRes.json();
          if (Array.isArray(groupData)) {
            const enrichedGroups = groupData.map((group: any) => {
              const assignedMentor = Array.isArray(mentorData) 
                ? mentorData.find((m: any) => Number(m.id) === Number(group.mentor_id || group.mentorId))
                : null;

              return {
                ...group,
                mentorName: assignedMentor ? assignedMentor.name : (group.mentorName || null)
              };
            });
            setGroups(enrichedGroups);
          } else {
            setGroups(groupData);
          }
        } else {
          setGroups(groupData);
        }
      } catch {
        setGroups(groupData);
      }

    } catch (err) {
      console.error('Error in fetchAllData:', err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
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
    width: '100%'
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

  const mentorLinkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#ecfeff',
    borderRadius: '8px',
    color: '#0f766e',
    textDecoration: 'none',
    fontSize: '14px',
  };

  // 💡 Resource Link එක සඳහා ලස්සන ස්ටයිල් එකක් හැදුවා
  const resourceLinkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'text-decoration 0.2s'
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          
          {isAssignView ? (
            <AssignCoordinatorPage 
              levelNumber={levelNumber}
              onBack={() => setIsAssignView(false)}
              onSuccess={() => {
                setIsAssignView(false);
                fetchAllData(); 
              }}
            />
          ) : (
            <div style={{ width: '100%' }}>
              <div className="dashboard-header-section" style={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                textAlign: 'left',
                marginBottom: '32px'
              }}>
                <div>
                  <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>Level {levelNumber} Management</h2>
                  <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>
                    Manage and view project stages, groups, and marks for Level {levelNumber}.
                  </p>
                </div>

                {/* + Add Coordinators Button */}
                <button 
                  onClick={() => setIsAssignView(true)}
                  style={{
                    padding: '10px 20px', backgroundColor: '#2563eb', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
                  }}
                >
                  + Add Coordinators
                </button>
              </div>

              {/* Tabs buttons */}
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
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', width: '100%' }}>Loading...</div>
              ) : (
                <div style={{ width: '100%' }}>
                  {activeTab === 'stages' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      {stages.length > 0 ? stages.map((stage, index) => {
                        const stageDegree = getDegreeNameFromAcademicUnit(stage.academic_unit);
                        return (
                        <div key={stage.stage_id} style={cardStyle}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={badgeStyle}>{index + 1}</div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{stage.stage_name}</h3>
                                {stageDegree && (
                                  <span
                                    style={{
                                      backgroundColor: stageDegree === 'ITM' ? '#dbeafe' : stageDegree === 'AI' ? '#f3e8ff' : '#e0f2fe',
                                      color: stageDegree === 'ITM' ? '#1e40af' : stageDegree === 'AI' ? '#6b21a8' : '#0369a1',
                                      border: `1px solid ${stageDegree === 'ITM' ? '#93c5fd' : stageDegree === 'AI' ? '#d8b4fe' : '#7dd3fc'}`,
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {stageDegree}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <span style={{ color: '#374151', fontWeight: '500' }}>Description: </span>
                                <span style={{ color: '#6b7280' }}>{stage.description || 'No description'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                                <span style={{ fontWeight: '500', color: '#374151' }}>Deadline:</span>
                                <span style={{ color: stage.deadline ? '#dc2626' : '#9ca3af' }}>
                                  {formatDate(stage.deadline)}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                                <span style={{ fontWeight: '500', color: '#374151' }}>Created:</span>
                                <span style={{ color: '#6b7280' }}>{formatDate(stage.created_at)}</span>
                              </div>

                              {/* 💡 මෙන්න මේ හරියෙන් තමයි Resource Link එක පෙන්වන්නේ */}
                              {stage.resource_links && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '500', color: '#374151', minWidth: '100px' }}>Resource Link:</span>
                                  <a
                                    href={stage.resource_links}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={resourceLinkStyle}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    🔗 View attached resource
                                  </a>
                                </div>
                              )}

                              {stage.mentor_details_url && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '500', color: '#374151', minWidth: '100px' }}>Mentor Sheet:</span>
                                  <a
                                    href={stage.mentor_details_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={mentorLinkStyle}
                                  >
                                    Open industry mentor details
                                  </a>
                                </div>
                              )}

                              {stage.files && stage.files.length > 0 ? (
                                <div style={{ marginTop: '12px' }}>
                                  <p style={{ fontWeight: '500', color: '#374151', fontSize: '14px', marginBottom: '8px' }}>
                                    Documents ({stage.files.length}):
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {stage.files.map((file) => {
                                      const degree = getDegreeNameFromAcademicUnit(file.academic_unit);
                                      const badgeLabel = degree ? degree : (file.uploader_name ? file.uploader_name : 'General');
                                      return (
                                        <div
                                          key={file.file_id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            backgroundColor: '#eff6ff',
                                            borderRadius: '8px',
                                            border: '1px solid #dbeafe',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                          }}
                                        >
                                          <a
                                            href={file.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              color: '#2563eb',
                                              textDecoration: 'none',
                                              fontSize: '14px',
                                              fontWeight: '500',
                                            }}
                                          >
                                            📄 {file.file_name}
                                          </a>

                                          <span
                                            style={{
                                              backgroundColor: degree === 'ITM' ? '#dbeafe' : degree === 'AI' ? '#f3e8ff' : '#e0f2fe',
                                              color: degree === 'ITM' ? '#1e40af' : degree === 'AI' ? '#6b21a8' : '#0369a1',
                                              border: `1px solid ${degree === 'ITM' ? '#93c5fd' : degree === 'AI' ? '#d8b4fe' : '#7dd3fc'}`,
                                              fontSize: '12px',
                                              fontWeight: '700',
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {badgeLabel}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '12px' }}>No documents uploaded</p>
                              )}
                            </div>
                            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                              View Only
                            </div>
                          </div>
                        </div>
                      );}) : <p>No stages found.</p>}
                    </div>
                  )}

                  {activeTab === 'groups' && (
                    <div>
                     {/* 1.  puts the onboarding box right above your groups card */}        
                     <MentorImportPanel levelNumber={levelNumber} />
                     
                    <div style={cardStyle}>
                      <h3 style={{ marginBottom: '20px', textAlign: 'left' }}>Level {levelNumber} Registered Groups</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6', color: '#6b7280' }}>
                              <th style={{ padding: '12px' }}>Group Name</th>
                              <th style={{ padding: '12px' }}>Supervisor</th>
                              <th style={{ padding: '12px' }}>Assigned Mentor</th>
                              <th style={{ padding: '12px' }}>Members</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((group) => (
                              <tr key={group.groupId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px', fontWeight: '600', textAlign: 'left' }}>{group.groupName}</td>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{group.supervisor}</td>
                                {/* 💡 Display Mentor Status */}
                                <td style={{ padding: '12px', textAlign: 'left' }}>
                                  {group.mentorName ? (
                                    <span style={{ color: '#059669', fontWeight: '600' }}>👤 {group.mentorName}</span>
                                   ) : (
                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</span>
                                   )}
                                  </td>

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
                  </div>  
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLevelPage;