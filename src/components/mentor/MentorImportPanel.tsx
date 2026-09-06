// src/components/mentor/MentorImportPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  UploadCloud, 
  CheckCircle2, 
  Send, 
  AlertCircle, 
  FileSpreadsheet, 
  Briefcase, 
  Trash2,
  Check,
  Lock,
  MessageSquare,
  Clock,
  X
} from 'lucide-react';

interface MentorRow {
  groupNo: string;
  groupName: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  groupId?: number | null;
  groupMatched?: boolean;
  isAlreadyAssigned?: boolean;
  currentMentorName?: string | null;
  currentMentorEmail?: string | null;
}

interface UnfilledGroup {
  id: number;
  groupName: string;
  status: string;
}

interface MentorImportPanelProps {
  academicUnit?: string;
  levelNumber: number;
  registeredGroups?: any[];
  onSuccess?: (toastMsg?: string) => void;
}

export const MentorImportPanel: React.FC<MentorImportPanelProps> = ({ 
  academicUnit = 'ITM', 
  levelNumber,
  registeredGroups,
  onSuccess 
}) => {
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [unfilledGroups, setUnfilledGroups] = useState<UnfilledGroup[]>([]);
  const [allGroupsCovered, setAllGroupsCovered] = useState<boolean>(false);
  const [totalLevelGroups, setTotalLevelGroups] = useState<number>(0);
  const [missingGroupNames, setMissingGroupNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info' | 'warning' | ''; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isJustSent, setIsJustSent] = useState(false);

  // Persistent tracking across page navigation/refresh for this Level
  const storageKey = `edusync_mentor_invites_sent_level_${levelNumber}`;
  const [hasStoredDispatched, setHasStoredDispatched] = useState<boolean>(() => {
    return localStorage.getItem(`edusync_mentor_invites_sent_level_${levelNumber}`) === 'true';
  });

  useEffect(() => {
    setHasStoredDispatched(localStorage.getItem(`edusync_mentor_invites_sent_level_${levelNumber}`) === 'true');
  }, [levelNumber]);

  // Compute live onboarding state from current registered groups in DB
  const totalRegisteredGroupsCount = registeredGroups ? registeredGroups.length : 0;
  const assignedGroupsCount = registeredGroups 
    ? registeredGroups.filter(g => (g.mentors && g.mentors.length > 0) || (g.mentorName && g.mentorName !== 'Unassigned' && String(g.mentorName).trim() !== '')).length 
    : 0;
  const unassignedGroups = registeredGroups
    ? registeredGroups.filter(g => !((g.mentors && g.mentors.length > 0) || (g.mentorName && g.mentorName !== 'Unassigned' && String(g.mentorName).trim() !== '')))
    : [];
  const pendingGroupNames = unassignedGroups.map(g => g.groupName || g.group_name || `Group #${g.groupId || g.id}`);
  const isLevelFullyOnboarded = totalRegisteredGroupsCount > 0 && assignedGroupsCount === totalRegisteredGroupsCount;
  const isLevelPartiallyOnboarded = totalRegisteredGroupsCount > 0 && assignedGroupsCount > 0 && assignedGroupsCount < totalRegisteredGroupsCount;
  const hasDispatchedInvites = isJustSent || (hasStoredDispatched && !isLevelFullyOnboarded);
  const isAlreadyActive = isLevelFullyOnboarded || isLevelPartiallyOnboarded || hasDispatchedInvites;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current logged-in user (admin/coordinator) ID
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id || null;

  // Parse CSV File inside browser
  const processFile = (file: File) => {
    setFileName(file.name);
    setStatusMessage(null);

    // Reset states
    setMentors([]);
    setUnfilledGroups([]);
    setAllGroupsCovered(false);
    setMissingGroupNames([]);
    setIsJustSent(false);
    setStatusMessage({ type: 'info', text: `Checking CSV against registered Level ${levelNumber} groups...` });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data as any[];
        const formattedData: MentorRow[] = rawData.map(row => {
          const cleanRow: Record<string, string> = {};
          Object.keys(row).forEach(key => {
            cleanRow[key.trim().toLowerCase()] = String(row[key] ?? '').trim();
          });

          return {
            groupNo: cleanRow['group no.'] || cleanRow['group no'] || cleanRow['group_no'] || '',
            groupName: cleanRow['group name'] || cleanRow['group_name'] || cleanRow['group'] || '',
            name: cleanRow['mentor name'] || cleanRow['mentor_name'] || cleanRow['name'] || '',
            company: cleanRow['mentor\'s company'] || cleanRow['mentors company'] || cleanRow['company'] || '',
            email: cleanRow['mentor\'s mail'] || cleanRow['mentors mail'] || cleanRow['mentor_email'] || cleanRow['email'] || '',
            phone: cleanRow['mentor\'s phone no.'] || cleanRow['mentor\'s phone no'] || cleanRow['phone'] || '',
          };
        }).filter(m => m.email && m.name);

        if (formattedData.length === 0) {
          setStatusMessage({ 
            type: 'error', 
            text: 'No valid rows found with Name and Email. Please ensure CSV headers include Group Name, Mentor Name, and Email.' 
          });
          return;
        }

        // Send to backend preview endpoint to match groups
        try {
          const response = await fetch('http://localhost:5000/api/admin/mentors/preview-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentors: formattedData, level: levelNumber }),
          });
          const resData = await response.json();
          if (resData.success) {
            setMentors(resData.data || []);
            setUnfilledGroups(resData.unfilledGroups || []);
            setAllGroupsCovered(Boolean(resData.allGroupsCovered));
            setTotalLevelGroups(resData.totalLevelGroups || 0);
            setMissingGroupNames(resData.missingGroups || []);
            setStatusMessage(null);
          } else {
            setStatusMessage({ type: 'error', text: resData.error || 'Failed to match groups with database.' });
          }
        } catch (err) {
          setStatusMessage({ type: 'error', text: 'Failed to connect to backend server.' });
        }
      },
      error: (error) => {
        setStatusMessage({ type: 'error', text: `CSV Parsing error: ${error.message}` });
      }
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      processFile(file);
    } else {
      setStatusMessage({ type: 'error', text: 'Please drop a valid .csv file.' });
    }
  };

  const handleReset = () => {
    setMentors([]);
    setUnfilledGroups([]);
    setAllGroupsCovered(false);
    setMissingGroupNames([]);
    setFileName('');
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Broadcast transactional invitations to all filled group mentors
  const handleSendInvites = async () => {
    const validFilledMentors = mentors.filter(m => m.groupMatched && m.email && m.name && m.email.toLowerCase() !== 'pending submission');
    
    if (validFilledMentors.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'No valid filled group mentors found in the CSV to dispatch invitations.'
      });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: 'info', text: 'Sending onboarding invitations...' });

    try {
      const response = await fetch('http://localhost:5000/api/admin/mentors/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentors: validFilledMentors, academicUnit, level: levelNumber }),
      });

      const resData = await response.json();
      if (response.ok) {
        const successMsg = resData.message || '🚀 Mentor onboarding invitations dispatched successfully!';
        setIsJustSent(true);
        try {
          localStorage.setItem(storageKey, 'true');
          setHasStoredDispatched(true);
        } catch (e) {
          console.warn('Could not persist mentor invites dispatched flag in storage:', e);
        }
        setStatusMessage(null);
        setMentors([]);
        setUnfilledGroups([]);
        setAllGroupsCovered(false);
        setMissingGroupNames([]);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onSuccess) {
          onSuccess(successMsg);
        }
      } else {
        setStatusMessage({ type: 'error', text: resData.error || 'Failed to send invites.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to send invitations due to network error.' });
    } finally {
      setIsSending(false);
    }
  };

  const matchedCount = mentors.filter(m => m.groupMatched).length;

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      borderRadius: '16px', 
      border: '1px solid #e2e8f0', 
      padding: '24px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Panel Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <Briefcase size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: 0, textAlign: 'left' }}>
              Onboard Industry Mentors
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', textAlign: 'left' }}>
              Map external industry mentors to Level {levelNumber} project groups. All registered groups must be updated before upload.
            </p>
          </div>
        </div>

        {/* Hidden global file input */}
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef}
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
        />

        {/* Sync / Upload Master CSV Button (Available when onboarding is already active) */}
        {isAlreadyActive && mentors.length === 0 && unfilledGroups.length === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#2563eb',
              fontSize: '12.5px',
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
            <UploadCloud size={14} />
            Upload / Sync Master CSV
          </button>
        )}
      </div>

      {/* Top Status Alert / Feedback Message */}
      {statusMessage && statusMessage.text && (
        <div style={{ 
          padding: '12px 18px', 
          borderRadius: '10px', 
          fontSize: '13.5px', 
          fontWeight: '500',
          marginBottom: '18px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: statusMessage.type === 'success' 
            ? '#f0fdf4' 
            : statusMessage.type === 'error' 
              ? '#fef2f2' 
              : '#eff6ff',
          color: statusMessage.type === 'success' 
            ? '#166534' 
            : statusMessage.type === 'error' 
              ? '#991b1b' 
              : '#1e40af',
          border: statusMessage.type === 'success' 
            ? '1px solid #86efac' 
            : statusMessage.type === 'error' 
              ? '1px solid #fecaca' 
              : '1px solid #bfdbfe',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            ) : (
              <Clock size={18} color="#2563eb" style={{ flexShrink: 0 }} />
            )}
            <span style={{ lineHeight: '1.4' }}>{statusMessage.text}</span>
          </div>

          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: statusMessage.type === 'success' ? '#166534' : statusMessage.type === 'error' ? '#991b1b' : '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              opacity: 0.75
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '0.75'; }}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Live Level Onboarding Status Indicator (when no fresh CSV is actively being previewed) */}
      {mentors.length === 0 && unfilledGroups.length === 0 && (
        <>
          {isLevelFullyOnboarded ? (
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13.5px', color: '#166534', fontWeight: '600' }}>
                All {totalRegisteredGroupsCount} project groups have assigned Industry Mentors.
              </span>
            </div>
          ) : isLevelPartiallyOnboarded || hasDispatchedInvites ? (
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <Clock size={18} color="#2563eb" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13.5px', color: '#1e40af', fontWeight: '600' }}>
                {assignedGroupsCount} of {totalRegisteredGroupsCount} groups assigned
              </span>
              {pendingGroupNames.length > 0 && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde047',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '600'
                }}>
                  Pending: {pendingGroupNames.join(', ')}
                </span>
              )}
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px 18px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13.5px', color: '#92400e', fontWeight: '600' }}>
                  No Industry Mentors assigned yet. Upload a Master CSV to begin.
                </span>
              </div>

              {/* Upload Drop Area (Only visible when initial onboarding is pending) */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                  backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
                  borderRadius: '12px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />

                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={24} />
                </div>

                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                    Click to select or drag & drop CSV file
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Headers required: Group Name, Mentor Name, Email, Company
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* 2. File Header Card (Only visible when a fresh CSV has been uploaded and is being reviewed) */}
      {(mentors.length > 0 || unfilledGroups.length > 0) && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <FileSpreadsheet size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '600', color: '#1e40af', fontSize: '13.5px' }}>
              {fileName || 'Level Mentor Mapping CSV'}
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
              {mentors.length} mentor assignment records loaded
            </div>
          </div>
        </div>
      )}

      {/* Clean Amber Pending Notice with 1-Click Reminder */}
      {!allGroupsCovered && missingGroupNames.length > 0 && (
        <div style={{ 
          padding: '12px 18px', 
          borderRadius: '10px', 
          fontSize: '14px', 
          margin: '16px 0',
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          backgroundColor: '#fffbeb',
          color: '#92400e',
          border: '1px solid #fde047'
        }}>
          <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <span>
            <strong>Mentor details pending:</strong> The following group(s) haven't filled their mentor details yet: <strong>{missingGroupNames.join(', ')}</strong>
          </span>
        </div>
      )}

      {/* Mapping Preview Table */}
      {(mentors.length > 0 || unfilledGroups.length > 0) && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Mapping Preview
              </h4>
              <span style={{ 
                fontSize: '11.5px', 
                backgroundColor: allGroupsCovered ? '#ecfdf5' : '#fef3c7', 
                color: allGroupsCovered ? '#065f46' : '#92400e', 
                border: `1px solid ${allGroupsCovered ? '#a7f3d0' : '#fde047'}`,
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontWeight: '600' 
              }}>
                {allGroupsCovered ? `All ${totalLevelGroups} Groups Complete` : `${matchedCount} of ${totalLevelGroups} Groups Filled`}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Target Group</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Mentor Name</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Company</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Render rows provided in the CSV */}
                {mentors.map((mentor, index) => (
                  <tr key={`mentor-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>
                      {mentor.groupName || `Group #${mentor.groupNo}`}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: '500' }}>
                      {mentor.name}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {mentor.company || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {mentor.email}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {mentor.groupMatched ? (
                        mentor.isAlreadyAssigned ? (
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '600'
                          }}>
                            <CheckCircle2 size={12} color="#16a34a" /> Already Active (Skipped)
                          </span>
                        ) : (
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '600'
                          }}>
                            <Send size={12} color="#2563eb" /> New Mentor (Will Send Invite)
                          </span>
                        )
                      ) : (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#fef2f2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '600'
                        }}>
                          Group Missing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 2. Render registered groups that are UNFILLED / MISSING in CSV */}
                {unfilledGroups.map((unfilled) => (
                  <tr 
                    key={`unfilled-${unfilled.id}`} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      backgroundColor: 'rgba(245, 158, 11, 0.04)' 
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#0f172a' }}>{unfilled.groupName}</td>
                    <td style={{ padding: '10px 14px', color: '#b45309', fontStyle: 'italic' }}>Pending submission</td>
                    <td style={{ padding: '10px 14px', color: '#b45309', fontStyle: 'italic' }}>-</td>
                    <td style={{ padding: '10px 14px', color: '#b45309', fontStyle: 'italic' }}>Pending submission</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#fffbeb',
                        color: '#d97706',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '600'
                      }}>
                        <Clock size={12} /> Not filled yet
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '9px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {(() => {
              const validFilledMentors = mentors.filter(m => m.groupMatched && m.email && m.name && m.email.toLowerCase() !== 'pending submission');
              const newMentorsCount = validFilledMentors.filter(m => !m.isAlreadyAssigned).length;
              const skippedMentorsCount = validFilledMentors.filter(m => m.isAlreadyAssigned).length;
              const pendingGroupsCount = unfilledGroups.length;

              if (validFilledMentors.length === 0) {
                return (
                  <button
                    type="button"
                    disabled={true}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      backgroundColor: '#f1f5f9',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'not-allowed'
                    }}
                  >
                    <Lock size={14} />
                    No Valid Mentors in CSV
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={isSending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    backgroundColor: isSending ? '#93c5fd' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isSending) e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }}
                  onMouseOut={(e) => {
                    if (!isSending) e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                >
                  <Send size={15} />
                  {isSending 
                    ? 'Dispatching Onboarding Invites...' 
                    : newMentorsCount === 0
                      ? `All ${validFilledMentors.length} Mentors Active (Skipped)`
                      : pendingGroupsCount > 0
                        ? `Dispatch Invites to ${newMentorsCount} Filled Mentor${newMentorsCount === 1 ? '' : 's'} (${pendingGroupsCount} Group${pendingGroupsCount === 1 ? '' : 's'} Pending)`
                        : skippedMentorsCount > 0
                          ? `Dispatch Invites to ${newMentorsCount} New Mentor${newMentorsCount === 1 ? '' : 's'} (${skippedMentorsCount} Active Skipped)`
                          : `Confirm & Broadcast All ${validFilledMentors.length} Invites`}
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorImportPanel;