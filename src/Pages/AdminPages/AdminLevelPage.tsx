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
  BookOpen
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

interface MentorInfo {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Group {
  groupId: number;
  groupName: string;
  supervisor: string;
  mentorName?: string;
  mentors?: MentorInfo[];
  mentorNames?: string[];
  leader: string;
  members: GroupMember[];
  status: string;
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

  // Stage Weights & Rubrics modal state
  const [isRubricsModalOpen, setIsRubricsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData(true);
    setIsAssignView(false); 
  }, [levelNumber]);

  const fetchAllData = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
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

      setGroups(groupData);
    } catch (err) {
      console.error('Error in fetchAllData:', err);
      setError('Connection to server failed');
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
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
                  <h2 className="overview-title" style={{ textAlign: 'left', margin: 0 }}>Level {levelNumber} Management</h2>
                  <p className="overview-subtitle" style={{ textAlign: 'left', margin: '4px 0 0 0' }}>
                    Administrative oversight, stage progression, group rosters, and grading results for Level {levelNumber}.
                  </p>
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

                  {/* Stage Weights & Rubrics Button */}
                  <button
                    type="button"
                    onClick={() => setIsRubricsModalOpen(true)}
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
                    <ClipboardList size={15} color="var(--eds-color-primary)" />
                    Stage Weights & Rubrics
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
                                            backgroundColor: 'var(--eds-color-primary-soft)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--eds-color-primary-soft-border)',
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
                                              color: 'var(--eds-color-primary)',
                                              textDecoration: 'none',
                                              fontSize: '14px',
                                              fontWeight: '500',
                                            }}
                                          >
                                            📄 {file.file_name}
                                          </a>

                                          <span
                                            style={{
                                              backgroundColor: degree === 'ITM' ? 'var(--eds-color-primary-soft-border)' : degree === 'AI' ? '#f3e8ff' : '#e0f2fe',
                                              color: degree === 'ITM' ? '#1e40af' : degree === 'AI' ? '#6b21a8' : '#0369a1',
                                              border: `1px solid ${degree === 'ITM' ? 'var(--eds-color-primary-soft-border)' : degree === 'AI' ? '#d8b4fe' : '#7dd3fc'}`,
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
                                <p style={{ color: 'var(--eds-color-text-faint)', fontSize: '14px', marginTop: '12px' }}>No documents uploaded</p>
                              )}
                            </div>
                            <div style={{ backgroundColor: 'var(--eds-color-primary-soft)', color: 'var(--eds-color-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                              View Only
                            </div>
                          </div>
                        </div>
                      );}) : <p>No stages found.</p>}
                    </div>
                  )}

                  {activeTab === 'groups' && (
                    <div>
                     <MentorImportPanel 
                       levelNumber={levelNumber} 
                       onSuccess={(toastMsg?: string) => {
                         if (toastMsg) {
                           setToastMessage(toastMsg);
                           setTimeout(() => setToastMessage(null), 5000);
                         }
                         fetchAllData(false);
                       }} 
                     />
                     
                    <div style={cardStyle}>
                      <h3 style={{ marginBottom: '20px', textAlign: 'left' }}>Level {levelNumber} Registered Groups</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--eds-color-border-soft)', color: 'var(--eds-color-text-muted)' }}>
                              <th style={{ padding: '12px' }}>Group Name</th>
                              <th style={{ padding: '12px' }}>Supervisor</th>
                              <th style={{ padding: '12px' }}>Assigned Mentor</th>
                              <th style={{ padding: '12px' }}>Members</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((group) => (
                              <tr key={group.groupId} style={{ borderBottom: '1px solid var(--eds-color-border-soft)' }}>
                                <td style={{ padding: '12px', fontWeight: '600', textAlign: 'left' }}>{group.groupName}</td>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{group.supervisor}</td>
                                <td style={{ padding: '12px', textAlign: 'left' }}>
                                  {group.mentors && group.mentors.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      {group.mentors.map((m) => (
                                        <span
                                          key={m.id}
                                          style={{
                                            backgroundColor: '#f3e8ff',
                                            color: '#7e22ce',
                                            border: '1px solid #e9d5ff',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {m.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : group.mentorName && group.mentorName !== 'Unassigned' ? (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      {group.mentorName.split(',').map((name, idx) => (
                                        <span
                                          key={idx}
                                          style={{
                                            backgroundColor: '#f3e8ff',
                                            color: '#7e22ce',
                                            border: '1px solid #e9d5ff',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {name.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--eds-color-text-faint)', fontStyle: 'italic' }}>Unassigned</span>
                                  )}
                                </td>

                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {group.members.map((m) => (
                                      <span key={m.id} style={{ backgroundColor: 'var(--eds-color-primary-soft)', color: 'var(--eds-color-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
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

                  {activeTab === 'marks' && (
                    <div style={{ width: '100%' }}>
                      <SupervisorReportPanel levelNumber={levelNumber} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage Weights & Rubrics Modal */}
          {isRubricsModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}>
              <div style={{
                backgroundColor: 'var(--eds-color-bg-surface)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '720px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--eds-color-border)',
                overflow: 'hidden',
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--eds-color-border-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--eds-color-bg-surface-soft)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      backgroundColor: '#e0f2fe', color: 'var(--eds-color-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--eds-color-primary-soft-border)',
                    }}>
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--eds-color-text-strong)' }}>
                        Level {levelNumber} Evaluation Scheme & Stage Weightages
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                        Marking weight allocations, evaluation criteria, and panel rubric breakdown.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRubricsModalOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--eds-color-text-faint)', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Top Stats Banner */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    padding: '14px 18px',
                    backgroundColor: 'var(--eds-color-bg-surface-soft)',
                    borderRadius: '12px',
                    border: '1px solid var(--eds-color-border)',
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--eds-color-text-muted)', textTransform: 'uppercase' }}>Configured Stages</span>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eds-color-text-strong)', marginTop: '2px' }}>
                        {stages.length} Active Stage{stages.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--eds-color-text-muted)', textTransform: 'uppercase' }}>Total Weightage</span>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eds-color-primary)', marginTop: '2px' }}>
                        100% Comprehensive
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--eds-color-text-muted)', textTransform: 'uppercase' }}>Evaluation Panel</span>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--eds-color-text-body)', marginTop: '4px' }}>
                        Supervisor (50%) + Panel (50%)
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Stage-wise Weightage Allocation */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: 'var(--eds-color-text-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent size={15} color="var(--eds-color-primary)" />
                      Stage-wise Weight Distribution (Level {levelNumber})
                    </h4>

                    <div style={{ border: '1px solid var(--eds-color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--eds-color-border-soft)', borderBottom: '1px solid var(--eds-color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--eds-color-text-muted)' }}>Stage Name</th>
                            <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--eds-color-text-muted)' }}>Degree Unit</th>
                            <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--eds-color-text-muted)' }}>Assessment Mode</th>
                            <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--eds-color-text-muted)', textAlign: 'right' }}>Weightage %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.length > 0 ? (
                            stages.map((st, idx) => {
                              const degree = getDegreeNameFromAcademicUnit(st.academic_unit);
                              const defaultWeight = Math.round(100 / stages.length);
                              return (
                                <tr key={st.stage_id} style={{ borderBottom: '1px solid var(--eds-color-border-soft)' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--eds-color-text-strong)' }}>
                                    {idx + 1}. {st.stage_name}
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span style={{
                                      backgroundColor: degree === 'ITM' ? 'var(--eds-color-primary-soft-border)' : degree === 'AI' ? '#f3e8ff' : '#e0f2fe',
                                      color: degree === 'ITM' ? '#1e40af' : degree === 'AI' ? '#6b21a8' : '#0369a1',
                                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700'
                                    }}>
                                      {degree || 'All Units'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 14px', color: 'var(--eds-color-text-muted)' }}>
                                    {st.stage_name.toLowerCase().includes('final') || st.stage_name.toLowerCase().includes('viva')
                                      ? 'Oral Viva & System Demo'
                                      : st.stage_name.toLowerCase().includes('interim') || st.stage_name.toLowerCase().includes('proposal')
                                      ? 'SRS & Architecture Review'
                                      : 'Code & Progress Evaluation'}
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: 'var(--eds-color-primary)' }}>
                                    {idx === stages.length - 1 ? 100 - defaultWeight * (stages.length - 1) : defaultWeight}%
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--eds-color-text-faint)' }}>
                                No stages configured for Level {levelNumber} yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Standard Marking Rubric Criteria */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: 'var(--eds-color-text-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Scale size={15} color="#7c3aed" />
                      Core Evaluation Criteria & Rubric Dimensions
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '12px 14px', border: '1px solid var(--eds-color-border)', borderRadius: '8px', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--eds-color-text-strong)' }}>1. System Architecture & Technical Rigor</span>
                          <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--eds-color-primary)' }}>30%</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                          Database schema, cloud deployment, security implementation, and API engineering.
                        </p>
                      </div>

                      <div style={{ padding: '12px 14px', border: '1px solid var(--eds-color-border)', borderRadius: '8px', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--eds-color-text-strong)' }}>2. Code Quality & Execution Completeness</span>
                          <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--eds-color-primary)' }}>25%</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                          Repository cleanliness, test coverage, functional MVP, and adherence to coding standards.
                        </p>
                      </div>

                      <div style={{ padding: '12px 14px', border: '1px solid var(--eds-color-border)', borderRadius: '8px', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--eds-color-text-strong)' }}>3. Problem Analysis & Requirement Spec</span>
                          <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--eds-color-primary)' }}>20%</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                          Scope clarity, SRS alignment, user stories, and literature/industry benchmark accuracy.
                        </p>
                      </div>

                      <div style={{ padding: '12px 14px', border: '1px solid var(--eds-color-border)', borderRadius: '8px', backgroundColor: 'var(--eds-color-bg-surface-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--eds-color-text-strong)' }}>4. Viva Presentation & Q&A Response</span>
                          <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--eds-color-primary)' }}>15%</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--eds-color-text-muted)' }}>
                          Individual understanding, defense of design choices, and confident articulation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Degree Focus Alignment */}
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--eds-color-primary-soft)', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: '700', fontSize: '12px', color: '#1e40af' }}>
                      <Award size={14} />
                      Degree-Specific Project Focus Areas (Level {levelNumber})
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: '#1e3a8a' }}>
                      <div><strong>IT:</strong> Full-Stack Systems, Cloud Infrastructure & DevOps</div>
                      <div><strong>ITM:</strong> Business Value, Enterprise Solutions & Process Optimization</div>
                      <div><strong>AI:</strong> Machine Learning Models, Data Pipelines & Analytics</div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '14px 24px',
                  backgroundColor: 'var(--eds-color-bg-surface-soft)',
                  borderTop: '1px solid var(--eds-color-border-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Stage Number', 'Stage Name', 'Degree Unit', 'Assessment Mode', 'Weightage'];
                      const rows = stages.map((st, idx) => {
                        const degree = getDegreeNameFromAcademicUnit(st.academic_unit) || 'All Units';
                        const defaultWeight = Math.round(100 / (stages.length || 1));
                        const w = idx === stages.length - 1 ? 100 - defaultWeight * (stages.length - 1) : defaultWeight;
                        return [
                          `"${idx + 1}"`,
                          `"${st.stage_name}"`,
                          `"${degree}"`,
                          `"Oral Viva & Assessment"`,
                          `"${w}%"`
                        ];
                      });

                      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `Level_${levelNumber}_Rubrics_Weightages_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      setToastMessage(`✅ Level ${levelNumber} Rubrics & Weightages Scheme exported!`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--eds-color-bg-surface)',
                      border: '1px solid var(--eds-color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--eds-color-text-body)',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={13} color="var(--eds-color-primary)" />
                    Export Scheme (CSV)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRubricsModalOpen(false)}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: 'var(--eds-color-primary)',
                      color: 'var(--eds-color-bg-surface)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Close Scheme
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLevelPage;