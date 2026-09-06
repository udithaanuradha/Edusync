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
  User,
  UserCheck,
  Briefcase,
  Edit3,
  Mail,
  Building2,
  Phone,
  AlertCircle,
  History,
  Search
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
  company?: string;
}

interface Group {
  groupId: number;
  groupName: string;
  supervisor: string;
  mentorName?: string;
  mentorEmail?: string;
  mentorPhone?: string;
  mentorCompany?: string;
  mentors?: MentorInfo[];
  mentorNames?: string[];
  leader: string;
  members: GroupMember[];
  status: string;
  department?: string;
  academic_unit?: string;
}

interface MentorHistoryRecord {
  id: number;
  group_id: number;
  group_name: string;
  level: number;
  academic_unit?: string;
  mentor_id?: number | null;
  mentor_name: string;
  mentor_email: string;
  mentor_phone?: string;
  mentor_company?: string;
  new_mentor_name?: string;
  new_mentor_email?: string;
  reassigned_by?: number | null;
  reassigned_by_name?: string;
  reassigned_by_email?: string;
  reassigned_reason?: string;
  unassigned_at: string;
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

  // Mentor Assignment History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<MentorHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const fetchMentorHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/mentors/history/level/${levelNumber}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      } else {
        setHistoryList([]);
      }
    } catch (err) {
      console.error('Error fetching mentor history:', err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = () => {
    setShowHistoryModal(true);
    setHistorySearch('');
    fetchMentorHistory();
  };

  // Reassign / Change Mentor Modal States
  const [reassignModalGroup, setReassignModalGroup] = useState<any | null>(null);
  const [reassignTargetMentor, setReassignTargetMentor] = useState<any | null>(null);
  const [reassignForm, setReassignForm] = useState({
    newMentorName: '',
    newMentorEmail: '',
    newMentorCompany: '',
    newMentorPhone: '',
    sendAppreciation: true
  });
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const handleOpenReassignModal = (group: any, targetMentor: any | null = null) => {
    setReassignModalGroup(group);
    setReassignTargetMentor(targetMentor);
    setReassignForm({
      newMentorName: '',
      newMentorEmail: '',
      newMentorCompany: '',
      newMentorPhone: '',
      sendAppreciation: true
    });
    setReassignError(null);
  };

  const handleCloseReassignModal = () => {
    setReassignModalGroup(null);
    setReassignTargetMentor(null);
    setReassignError(null);
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignForm.newMentorName.trim() || !reassignForm.newMentorEmail.trim()) {
      setReassignError("Mentor name and email are required.");
      return;
    }

    setIsReassigning(true);
    setReassignError(null);

    try {
      let currentAdminId: number | null = null;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          currentAdminId = parsed.id ?? parsed.user_id ?? null;
        }
      } catch (e) {
        console.warn('Could not parse user from localStorage:', e);
      }

      const oldMentorId = reassignTargetMentor?.id || null;
      const oldMentorEmail = reassignTargetMentor?.email || (reassignModalGroup.mentors && reassignModalGroup.mentors[0]?.email) || reassignModalGroup.mentorEmail || '';
      const oldMentorName = reassignTargetMentor?.name || (reassignModalGroup.mentors && reassignModalGroup.mentors[0]?.name) || reassignModalGroup.mentorName || '';
      const oldMentorPhone = reassignTargetMentor?.phone || (reassignModalGroup.mentors && reassignModalGroup.mentors[0]?.phone) || reassignModalGroup.mentorPhone || null;
      const oldMentorCompany = reassignTargetMentor?.company || (reassignModalGroup.mentors && reassignModalGroup.mentors[0]?.company) || reassignModalGroup.mentorCompany || null;

      const res = await fetch('http://localhost:5000/api/admin/mentors/reassign-group-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: reassignModalGroup.groupId,
          groupName: reassignModalGroup.groupName,
          level: levelNumber,
          academicUnit: reassignModalGroup.academic_unit || reassignModalGroup.department || 'ITM',
          oldMentorId,
          oldMentorName,
          oldMentorEmail,
          oldMentorPhone,
          oldMentorCompany,
          reassignedBy: currentAdminId,
          sendAppreciation: reassignForm.sendAppreciation,
          newMentorName: reassignForm.newMentorName.trim(),
          newMentorEmail: reassignForm.newMentorEmail.trim(),
          newMentorCompany: reassignForm.newMentorCompany.trim(),
          newMentorPhone: reassignForm.newMentorPhone.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(`✅ Mentor reassigned for "${reassignModalGroup.groupName}"! Setup invite dispatched.`);
        setTimeout(() => setToastMessage(null), 5000);
        handleCloseReassignModal();
        fetchAllData(false);
      } else {
        setReassignError(data.error || 'Failed to reassign mentor.');
      }
    } catch (err: any) {
      setReassignError('Network error during mentor reassignment.');
    } finally {
      setIsReassigning(false);
    }
  };

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
              
              {/* Floating Toast Message */}
              {toastMessage && (
                <div style={{
                  position: 'fixed',
                  top: '24px',
                  right: '32px',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  backgroundColor: '#166534',
                  color: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  border: '1px solid #22c55e'
                }}>
                  <CheckCircle2 size={18} color="#86efac" style={{ flexShrink: 0 }} />
                  <span>{toastMessage}</span>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#86efac',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.8
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    title="Close notification"
                  >
                    <X size={16} />
                  </button>
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

                  {/* Mentor History Button */}
                  <button
                    type="button"
                    onClick={handleOpenHistoryModal}
                    title="View past mentor changes and assignment audit log"
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
                    <History size={15} color="#d97706" />
                    Mentor History
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
                          </div>
                        </div>
                      );}) : <p>No stages found.</p>}
                    </div>
                  )}

                  {activeTab === 'groups' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <MentorImportPanel 
                        levelNumber={levelNumber} 
                        registeredGroups={groups}
                        onSuccess={(toastMsg?: string) => {
                          if (toastMsg) {
                            setToastMessage(toastMsg);
                            setTimeout(() => setToastMessage(null), 5000);
                          }
                          fetchAllData(false);
                        }} 
                      />
                     
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
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {group.mentors && group.mentors.length > 0 ? (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {group.mentors.map((m: any, idx: number) => (
                                              <div key={idx} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                backgroundColor: '#fffbeb',
                                                border: '1px solid #fde68a',
                                                padding: '3px 6px 3px 10px',
                                                borderRadius: '7px',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                <span style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '5px',
                                                  fontSize: '12.5px',
                                                  fontWeight: '600',
                                                  color: '#b45309'
                                                }}>
                                                  <Briefcase size={13} color="#d97706" style={{ flexShrink: 0 }} />
                                                  {m.name}
                                                </span>

                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenReassignModal(group, m)}
                                                  title={`Change / Reassign mentor ${m.name} for ${group.groupName}`}
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '2px 7px',
                                                    backgroundColor: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '5px',
                                                    color: '#2563eb',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                  }}
                                                  onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#dbeafe';
                                                    e.currentTarget.style.borderColor = '#93c5fd';
                                                  }}
                                                  onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#eff6ff';
                                                    e.currentTarget.style.borderColor = '#bfdbfe';
                                                  }}
                                                >
                                                  <Edit3 size={10} />
                                                  Change
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : group.mentorName && group.mentorName !== 'Unassigned' && group.mentorName.trim() !== '' ? (
                                          <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            backgroundColor: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            padding: '3px 6px 3px 10px',
                                            borderRadius: '7px',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '5px',
                                              fontSize: '12.5px',
                                              fontWeight: '600',
                                              color: '#b45309'
                                            }}>
                                              <Briefcase size={13} color="#d97706" style={{ flexShrink: 0 }} />
                                              {group.mentorName}
                                            </span>

                                            <button
                                              type="button"
                                              onClick={() => handleOpenReassignModal(group, { name: group.mentorName, email: group.mentorEmail })}
                                              title={`Change / Reassign mentor ${group.mentorName} for ${group.groupName}`}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                padding: '2px 7px',
                                                backgroundColor: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '5px',
                                                color: '#2563eb',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                              }}
                                              onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                                e.currentTarget.style.borderColor = '#93c5fd';
                                              }}
                                              onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                                e.currentTarget.style.borderColor = '#bfdbfe';
                                              }}
                                            >
                                              <Edit3 size={10} />
                                              Change
                                            </button>
                                          </div>
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
                                      </div>
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

      {/* Change / Reassign Mentor Modal */}
      {reassignModalGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    Reassign Industry Mentor
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Group: <strong>{reassignModalGroup.groupName}</strong> (Level {levelNumber})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseReassignModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmReassign} style={{ padding: '24px' }}>
              {/* Current Mentor Summary */}
              {reassignTargetMentor ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: '#92400e' }}>
                      Mentor to Replace: <strong>{reassignTargetMentor.name}</strong>
                    </span>
                    <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      Will be unlinked
                    </span>
                  </div>

                  {/* Co-mentors note if multiple mentors exist */}
                  {reassignModalGroup.mentors && reassignModalGroup.mentors.filter((m: any) => m.id !== reassignTargetMentor.id && m.name !== reassignTargetMentor.name).length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                      <span>
                        Co-mentor <strong>{reassignModalGroup.mentors.filter((m: any) => m.id !== reassignTargetMentor.id && m.name !== reassignTargetMentor.name).map((m: any) => m.name).join(', ')}</strong> will remain active with this group.
                      </span>
                    </div>
                  )}
                </div>
              ) : (reassignModalGroup.mentorName && reassignModalGroup.mentorName !== 'Unassigned' && reassignModalGroup.mentorName.trim() !== '') ? (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px'
                }}>
                  <span style={{ color: '#92400e' }}>
                    Mentor to Replace: <strong>{reassignModalGroup.mentorName}</strong>
                  </span>
                  <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    Will be unlinked
                  </span>
                </div>
              ) : null}

              {reassignError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} />
                  <span>{reassignError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                    New Mentor Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samantha Perera"
                    value={reassignForm.newMentorName}
                    onChange={(e) => setReassignForm({ ...reassignForm, newMentorName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                    New Mentor Work Email <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samantha.mentor@company.com"
                    value={reassignForm.newMentorEmail}
                    onChange={(e) => setReassignForm({ ...reassignForm, newMentorEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Virtusa / IFS"
                      value={reassignForm.newMentorCompany}
                      onChange={(e) => setReassignForm({ ...reassignForm, newMentorCompany: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +94771234567"
                      value={reassignForm.newMentorPhone}
                      onChange={(e) => setReassignForm({ ...reassignForm, newMentorPhone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Option to send thank you / transition email to old mentor */}
                {(reassignTargetMentor?.name || (reassignModalGroup.mentorName && reassignModalGroup.mentorName !== 'Unassigned')) && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '6px',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <input
                      type="checkbox"
                      checked={reassignForm.sendAppreciation}
                      onChange={(e) => setReassignForm({ ...reassignForm, sendAppreciation: e.target.checked })}
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
                      Send official <strong>Appreciation & Transition Notice</strong> email to previous mentor (<strong>{reassignTargetMentor?.name || reassignModalGroup.mentorName}</strong>).
                    </span>
                  </label>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={handleCloseReassignModal}
                  disabled={isReassigning}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isReassigning ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isReassigning}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: isReassigning ? '#93c5fd' : '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isReassigning ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isReassigning ? 'Dispatching Invites...' : 'Confirm & Dispatch Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentor History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '860px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <History size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    Mentor Assignment History
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Audit log of previous mentor changes and unlinks for Level {levelNumber}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Record ID', 'Group Name', 'Level', 'Academic Unit', 'Previous Mentor Name', 'Previous Mentor Email', 'Previous Mentor Phone', 'Previous Mentor Company', 'Replaced By (New Mentor)', 'New Mentor Email', 'Reassigned By Admin', 'Reason', 'Unassigned Date'];
                      const rows = historyList.map(h => [
                        `"${h.id}"`,
                        `"${h.group_name}"`,
                        `"Level ${h.level}"`,
                        `"${h.academic_unit || 'ITM'}"`,
                        `"${h.mentor_name}"`,
                        `"${h.mentor_email}"`,
                        `"${h.mentor_phone || '-'}"`,
                        `"${h.mentor_company || '-'}"`,
                        `"${h.new_mentor_name || '-'}"`,
                        `"${h.new_mentor_email || '-'}"`,
                        `"${h.reassigned_by_name || (h.reassigned_by ? 'Admin #' + h.reassigned_by : 'Admin')}"`,
                        `"${h.reassigned_reason || 'Reassigned / Changed'}"`,
                        `"${h.unassigned_at ? new Date(h.unassigned_at).toLocaleString() : '-'}"`
                      ]);

                      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `Level_${levelNumber}_Mentor_History_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      setToastMessage(`✅ Level ${levelNumber} Mentor History exported successfully!`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={13} color="#2563eb" />
                    Export CSV
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter by group name or mentor name..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Modal Body / Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  Loading mentor history records...
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <History size={36} style={{ marginBottom: '10px', opacity: 0.4 }} />
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                    No Mentor Reassignment History Yet
                  </p>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                    When industry mentors are replaced or reassigned for Level {levelNumber}, the previous mentor details will be automatically archived and displayed here.
                  </p>
                </div>
              ) : (() => {
                const filtered = historyList.filter(h => 
                  !historySearch.trim() ||
                  h.group_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                  h.mentor_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                  (h.new_mentor_name && h.new_mentor_name.toLowerCase().includes(historySearch.toLowerCase()))
                );

                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
                      No history matches "{historySearch}".
                    </div>
                  );
                }

                return (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Target Group</th>
                          <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Previous Mentor</th>
                          <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Replaced By</th>
                          <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Action Details</th>
                          <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Unassigned At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((record) => (
                          <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a', verticalAlign: 'top' }}>
                              <div>{record.group_name}</div>
                              {record.academic_unit && (
                                <span style={{
                                  display: 'inline-block',
                                  marginTop: '4px',
                                  padding: '2px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: '600',
                                  borderRadius: '4px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0284c7'
                                }}>
                                  {record.academic_unit}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: '600', color: '#b45309' }}>{record.mentor_name}</div>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>{record.mentor_email}</div>
                              {record.mentor_phone && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {record.mentor_phone}</div>
                              )}
                              {record.mentor_company && (
                                <div style={{ fontSize: '11px', color: '#0284c7' }}>🏢 {record.mentor_company}</div>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              {record.new_mentor_name ? (
                                <div>
                                  <div style={{ fontWeight: '600', color: '#15803d' }}>{record.new_mentor_name}</div>
                                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>{record.new_mentor_email}</div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                                {record.reassigned_by_name ? `By: ${record.reassigned_by_name}` : 'By: Administrator'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {record.reassigned_reason || 'Reassigned'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              <span style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '500'
                              }}>
                                {record.unassigned_at ? new Date(record.unassigned_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLevelPage;