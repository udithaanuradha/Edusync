import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';
import AssignCoordinatorPage from './AssignCoordinatorPage';
import SupervisorReportPanel from '../../components/coordinator/SupervisorReportPanel';
import './AdminDashboard.css';
import { MentorImportPanel } from '../../components/mentor/MentorImportPanel';
import { 
  Download, 
  CheckCircle2, 
  Layers, 
  Users, 
  BarChart3, 
  X, 
  UserPlus,
  ClipboardList,
  Scale,
  Percent,
  Award,
  BookOpen,
  Trash2,
  User,
  UserCheck,
  Briefcase
} from 'lucide-react';

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
  resource_links?: string;
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
  department?: string;
  academic_unit?: string;
}

interface AdminLevelPageProps {
  levelNumber: number;
}

const AdminLevelPage: React.FC<AdminLevelPageProps> = ({ levelNumber }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stages' | 'groups' | 'marks'>('stages');
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAssignView, setIsAssignView] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<number | null>(null);

  const handleDeleteStage = async (stageId: number, stageName: string) => {
    try {
      setDeletingStageId(stageId);
      const response = await fetch(`http://localhost:5000/api/projects/delete/${stageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success || response.ok) {
        setStages(prev => prev.filter(s => s.stage_id !== stageId));
        setToastMessage(`✅ Stage "${stageName}" deleted successfully.`);
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        throw new Error(result.message || 'Failed to delete stage');
      }
    } catch (err) {
      console.error('❌ Error deleting stage:', err);
      setToastMessage(`❌ Failed to delete stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setDeletingStageId(null);
    }
  };

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
    backgroundColor: 'var(--eds-color-bg-surface)',
    border: '1px solid var(--eds-color-border)',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    width: '100%'
  };

  const badgeStyle: React.CSSProperties = {
    width: '40px', height: '40px', borderRadius: '50%',
    backgroundColor: 'var(--eds-color-primary)', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px', flexShrink: 0,
  };

  const fileLinkStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', backgroundColor: 'var(--eds-color-primary-soft)', borderRadius: '8px',
    color: 'var(--eds-color-primary)', textDecoration: 'none', fontSize: '14px', marginTop: '4px'
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
    color: 'var(--eds-color-primary)',
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
        <main className="content-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
          
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
              
              {/* Toast Message */}
              {toastMessage && (
                <div style={{
                  padding: '12px 18px',
                  backgroundColor: 'var(--eds-color-success-bg)',
                  border: '1px solid var(--eds-color-success-solid)',
                  borderRadius: '10px',
                  color: 'var(--eds-color-success-text)',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <CheckCircle2 size={16} color="var(--eds-color-success-solid)" />
                  <span>{toastMessage}</span>
                </div>
              )}

              <div className="dashboard-header-section" style={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                textAlign: 'left',
                marginBottom: '28px'
              }}>
                <div>
                  <h2 className="overview-title" style={{ textAlign: 'left', margin: 0, wordSpacing: '3px', letterSpacing: '0.2px' }}>Level {levelNumber} Management</h2>
                </div>

                {/* Multiple Admin Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  
                  {/* Export Level Report Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const stageSummary = stages.map(s => `Stage: ${s.stage_name} (Deadline: ${s.deadline || 'None'}, Unit: ${s.academic_unit || 'All'})`).join('; ');
                      const headers = ['Group ID', 'Group Name', 'Supervisor', 'Mentor', 'Leader', 'Members Count', 'Members List', 'Level Stages Overview'];
                      const rows = groups.map(g => [
                        `"${g.groupId}"`,
                        `"${g.groupName}"`,
                        `"${g.supervisor}"`,
                        `"${g.mentorName || 'Unassigned'}"`,
                        `"${g.leader}"`,
                        `"${g.members.length}"`,
                        `"${g.members.map(m => m.name + (m.is_leader ? ' [Leader]' : '')).join(', ')}"`,
                        `"${stageSummary}"`
                      ]);

                      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `Level_${levelNumber}_Master_Report_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      setToastMessage(`✅ Level ${levelNumber} Master Report exported successfully!`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 14px',
                      backgroundColor: 'var(--eds-color-bg-surface)',
                      color: 'var(--eds-color-text-body)',
                      border: '1px solid var(--eds-color-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--eds-color-bg-surface-soft)';
                      e.currentTarget.style.borderColor = 'var(--eds-color-text-faint)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--eds-color-bg-surface)';
                      e.currentTarget.style.borderColor = 'var(--eds-color-border)';
                    }}
                  >
                    <Download size={15} color="var(--eds-color-primary)" />
                    Export Level Report
                  </button>

                  {/* + Add Coordinators Button */}
                  <button 
                    onClick={() => setIsAssignView(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      backgroundColor: 'var(--eds-color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--eds-color-primary-hover)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--eds-color-primary)';
                    }}
                  >
                    <UserPlus size={15} />
                    + Add Coordinators
                  </button>
                </div>
              </div>

              {/* Tabs buttons — underline style, matching Coordinator's
                  .level-tabs-wrap / .level-tab-btn (see CoordinatorLevelPage.css) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--eds-color-border)', padding: '0 4px' }}>
                <button onClick={() => setActiveTab('stages')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '13px 16px 12px', borderRadius: '8px 8px 0 0', border: 'none',
                    borderBottom: activeTab === 'stages' ? '3px solid var(--eds-color-primary)' : '3px solid transparent',
                    cursor: 'pointer', fontWeight: activeTab === 'stages' ? 700 : 600, fontSize: '13px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'stages' ? 'var(--eds-color-primary-hover)' : 'var(--eds-color-text-muted)'
                  }}>
                  <Layers size={16} />
                  Project Stages ({stages.length})
                </button>

                <button onClick={() => setActiveTab('groups')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '13px 16px 12px', borderRadius: '8px 8px 0 0', border: 'none',
                    borderBottom: activeTab === 'groups' ? '3px solid var(--eds-color-primary)' : '3px solid transparent',
                    cursor: 'pointer', fontWeight: activeTab === 'groups' ? 700 : 600, fontSize: '13px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'groups' ? 'var(--eds-color-primary-hover)' : 'var(--eds-color-text-muted)'
                  }}>
                  <Users size={16} />
                  Project Groups ({groups.length})
                </button>

                <button onClick={() => setActiveTab('marks')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '13px 16px 12px', borderRadius: '8px 8px 0 0', border: 'none',
                    borderBottom: activeTab === 'marks' ? '3px solid var(--eds-color-primary)' : '3px solid transparent',
                    cursor: 'pointer', fontWeight: activeTab === 'marks' ? 700 : 600, fontSize: '13px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'marks' ? 'var(--eds-color-primary-hover)' : 'var(--eds-color-text-muted)'
                  }}>
                  <BarChart3 size={16} />
                  Student Marksheet & Results
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
                                      backgroundColor: stageDegree === 'ITM' ? 'var(--eds-color-primary-soft-border)' : stageDegree === 'AI' ? '#f3e8ff' : '#e0f2fe',
                                      color: stageDegree === 'ITM' ? '#1e40af' : stageDegree === 'AI' ? '#6b21a8' : '#0369a1',
                                      border: `1px solid ${stageDegree === 'ITM' ? 'var(--eds-color-primary-soft-border)' : stageDegree === 'AI' ? '#d8b4fe' : '#7dd3fc'}`,
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
                                <span style={{ color: 'var(--eds-color-text-body)', fontWeight: '500' }}>Description: </span>
                                <span style={{ color: 'var(--eds-color-text-muted)' }}>{stage.description || 'No description'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                                <span style={{ fontWeight: '500', color: 'var(--eds-color-text-body)' }}>Deadline:</span>
                                <span style={{ color: stage.deadline ? 'var(--eds-color-danger-solid)' : 'var(--eds-color-text-faint)' }}>
                                  {formatDate(stage.deadline)}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
                                <span style={{ fontWeight: '500', color: 'var(--eds-color-text-body)' }}>Created:</span>
                                <span style={{ color: 'var(--eds-color-text-muted)' }}>{formatDate(stage.created_at)}</span>
                              </div>

                              {/* 💡 මෙන්න මේ හරියෙන් තමයි Resource Link එක පෙන්වන්නේ */}
                              {stage.resource_links && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '500', color: 'var(--eds-color-text-body)', minWidth: '100px' }}>Resource Link:</span>
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
                                  <span style={{ fontWeight: '500', color: 'var(--eds-color-text-body)', minWidth: '100px' }}>Mentor Sheet:</span>
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
                                  <p style={{ fontWeight: '500', color: 'var(--eds-color-text-body)', fontSize: '14px', marginBottom: '8px' }}>
                                    Documents ({stage.files.length}):
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {stage.files.map((file) => {
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
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              📄 {file.file_name}
                                            </a>
                                          </div>

                                          {/* Green Download Button */}
                                          <a
                                            href={file.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={file.file_name}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              backgroundColor: '#16a34a',
                                              color: '#ffffff',
                                              padding: '6px 14px',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              fontWeight: '600',
                                              textDecoration: 'none',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                              transition: 'background-color 0.15s ease',
                                              whiteSpace: 'nowrap',
                                              flexShrink: 0,
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
                                            title={`Download ${file.file_name}`}
                                          >
                                            <Download size={13} />
                                            Download
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ color: 'var(--eds-color-text-faint)', fontSize: '14px', marginTop: '12px' }}>No documents uploaded</p>
                              )}
                            </div>

                            {/* Admin Delete Stage Action */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(stage.stage_id, stage.stage_name)}
                              disabled={deletingStageId === stage.stage_id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: deletingStageId === stage.stage_id ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0,
                              }}
                              onMouseOver={(e) => {
                                if (deletingStageId !== stage.stage_id) {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                  e.currentTarget.style.borderColor = '#fca5a5';
                                  e.currentTarget.style.color = '#b91c1c';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (deletingStageId !== stage.stage_id) {
                                  e.currentTarget.style.backgroundColor = '#fef2f2';
                                  e.currentTarget.style.borderColor = '#fecaca';
                                  e.currentTarget.style.color = '#dc2626';
                                }
                              }}
                              title={`Delete ${stage.stage_name}`}
                            >
                              <Trash2 size={13} />
                              {deletingStageId === stage.stage_id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      );}) : <p>No stages found.</p>}
                    </div>
                  )}

                  {activeTab === 'groups' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <MentorImportPanel levelNumber={levelNumber} />
                     
                      {/* Registered Groups Card */}
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '20px',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '14px',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: '#eff6ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#2563eb'
                            }}>
                              <Users size={18} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a', textAlign: 'left' }}>
                                Level {levelNumber} Registered Groups
                              </h3>
                            </div>
                          </div>

                          <span style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '4px 12px',
                            borderRadius: '20px'
                          }}>
                            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'} Enrolled
                          </span>
                        </div>

                        {groups.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                            <Users size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No registered project groups found for Level {levelNumber}.</p>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Group Name</th>
                                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Supervisor</th>
                                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Assigned Mentor</th>
                                  <th style={{ padding: '14px 18px', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Team Members</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groups.map((group) => (
                                  <tr 
                                    key={group.groupId} 
                                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    {/* Group Name & Badge */}
                                    <td style={{ padding: '14px 18px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                                        <div style={{
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '8px',
                                          backgroundColor: '#eef2ff',
                                          color: '#4f46e5',
                                          fontWeight: '700',
                                          fontSize: '14px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                        }}>
                                          {group.groupName ? group.groupName.charAt(0).toUpperCase() : 'G'}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                            {group.groupName}
                                          </div>
                                          {(group.department || group.academic_unit) && (() => {
                                            const rawDept = group.department || group.academic_unit || '';
                                            const normDept = getDegreeNameFromAcademicUnit(rawDept);
                                            let deptColor = '#64748b';
                                            if (normDept === 'ITM') {
                                              deptColor = '#16a34a'; // Green (කොළ)
                                            } else if (normDept === 'AI') {
                                              deptColor = '#dc2626'; // Red (රතු)
                                            } else if (normDept === 'IT') {
                                              deptColor = '#7c3aed'; // Purple / Dam (දම්)
                                            }
                                            return (
                                              <div 
                                                style={{ 
                                                  fontSize: '11px', 
                                                  color: deptColor, 
                                                  fontWeight: '700', 
                                                  whiteSpace: 'nowrap' 
                                                }}
                                              >
                                                {rawDept}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Supervisor */}
                                    <td style={{ padding: '14px 18px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                        <UserCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
                                        <span style={{ whiteSpace: 'nowrap' }}>{group.supervisor || 'Unassigned'}</span>
                                      </div>
                                    </td>

                                    {/* Assigned Mentor */}
                                    <td style={{ padding: '14px 18px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                      {group.mentorName ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          fontSize: '12.5px',
                                          fontWeight: '600',
                                          color: '#b45309',
                                          backgroundColor: '#fffbeb',
                                          border: '1px solid #fde68a',
                                          padding: '3px 10px',
                                          borderRadius: '6px',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          <Briefcase size={13} color="#d97706" style={{ flexShrink: 0 }} />
                                          {group.mentorName}
                                        </span>
                                      ) : (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          fontSize: '12px',
                                          color: '#94a3b8',
                                          backgroundColor: '#f1f5f9',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          fontStyle: 'italic',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Unassigned
                                        </span>
                                      )}
                                    </td>

                                    {/* Members */}
                                    <td style={{ padding: '14px 18px', textAlign: 'left' }}>
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                        {group.members.map((m) => (
                                          m.is_leader ? (
                                            <span 
                                              key={m.id} 
                                              style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                backgroundColor: '#ecfdf5', 
                                                color: '#065f46', 
                                                border: '1px solid #a7f3d0',
                                                padding: '3px 9px', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                              }}
                                            >
                                              <span style={{ 
                                                backgroundColor: '#059669', 
                                                color: '#ffffff', 
                                                fontSize: '9px', 
                                                fontWeight: '800', 
                                                padding: '1px 5px', 
                                                borderRadius: '3px',
                                                letterSpacing: '0.02em',
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                Leader
                                              </span>
                                              {m.name}
                                            </span>
                                          ) : (
                                            <span 
                                              key={m.id} 
                                              style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                backgroundColor: '#eff6ff', 
                                                color: '#1d4ed8', 
                                                border: '1px solid #dbeafe',
                                                padding: '3px 9px', 
                                                borderRadius: '6px', 
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                              }}
                                            >
                                              <User size={12} color="#60a5fa" />
                                              {m.name}
                                            </span>
                                          )
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>  
                  )}

                  {activeTab === 'marks' && (
                    <div style={{ width: '100%' }}>
                      <SupervisorReportPanel levelNumber={levelNumber} />
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