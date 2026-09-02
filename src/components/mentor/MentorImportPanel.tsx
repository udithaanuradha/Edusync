// src/components/mentor/MentorImportPanel.tsx
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { 
  UploadCloud, 
  CheckCircle2, 
  Send, 
  AlertCircle, 
  FileSpreadsheet, 
  Download, 
  Briefcase, 
  Trash2,
  Check,
  Lock,
  MessageSquare,
  Clock
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
}

interface UnfilledGroup {
  id: number;
  groupName: string;
  status: string;
}

interface MentorImportPanelProps {
  academicUnit?: string;
  levelNumber: number;
  onSuccess?: (toastMsg?: string) => void;
}

export const MentorImportPanel: React.FC<MentorImportPanelProps> = ({ 
  academicUnit = 'ITM', 
  levelNumber,
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
  
  // Chat Reminder States
  const [isRemindingAll, setIsRemindingAll] = useState(false);
  const [allReminded, setAllReminded] = useState(false);

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
    setAllReminded(false);
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

            if (resData.allGroupsCovered) {
              setStatusMessage({
                type: 'success',
                text: `All ${resData.totalLevelGroups} registered groups in Level ${levelNumber} are filled and matched! Ready to broadcast invites.`
              });
            } else {
              setStatusMessage(null);
            }
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

  const handleDownloadSample = () => {
    const headers = ['Group Name', 'Mentor Name', 'Mentor Email', 'Company', 'Phone'];
    const sampleRows = [
      ['Tech Titans', 'Samantha Perera', 'samantha.mentor@techcorp.com', 'Virtusa', '+94771234567'],
      ['ABC', 'Roshan Silva', 'roshan.silva@innovate.lk', 'IFS Sri Lanka', '+94719876543']
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Level_${levelNumber}_Mentor_Mapping_Sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setMentors([]);
    setUnfilledGroups([]);
    setAllGroupsCovered(false);
    setMissingGroupNames([]);
    setFileName('');
    setStatusMessage(null);
    setAllReminded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Chat Reminder to ALL missing groups at once
  const handleSendAllMissingReminders = async () => {
    if (unfilledGroups.length === 0) return;
    setIsRemindingAll(true);

    try {
      const response = await fetch('http://localhost:5000/api/admin/mentors/remind-all-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingGroups: unfilledGroups,
          adminId: currentUserId
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAllReminded(true);
        setStatusMessage({
          type: 'success',
          text: `Chat reminders sent successfully to all members across ${unfilledGroups.length} missing group(s)!`
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to send reminders.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Network error sending reminders.' });
    } finally {
      setIsRemindingAll(false);
    }
  };

  // Broadcast transactional invitations
  const handleSendInvites = async () => {
    if (!allGroupsCovered) {
      setStatusMessage({
        type: 'error',
        text: `Cannot proceed: All ${totalLevelGroups} registered groups in Level ${levelNumber} must be filled before broadcasting invites.`
      });
      return;
    }

    setIsSending(true);
    setStatusMessage({ type: 'info', text: 'Sending onboarding invitations...' });

    try {
      const response = await fetch('http://localhost:5000/api/admin/mentors/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentors, academicUnit, level: levelNumber }),
      });

      const resData = await response.json();
      if (response.ok) {
        const successMsg = '🚀 All mentor onboarding invitations dispatched successfully!';
        setStatusMessage({ type: 'success', text: successMsg });
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
        alignItems: 'flex-start',
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

        <button
          type="button"
          onClick={handleDownloadSample}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            backgroundColor: '#16a34a',
            border: '1px solid #15803d',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(22, 163, 74, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#15803d';
            e.currentTarget.style.borderColor = '#166534';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#16a34a';
            e.currentTarget.style.borderColor = '#15803d';
          }}
        >
          <Download size={13} />
          Download Sample CSV
        </button>
      </div>

      {/* Upload Drop Area */}
      {mentors.length === 0 && unfilledGroups.length === 0 ? (
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
      ) : (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={20} color="#2563eb" />
            <div>
              <div style={{ fontWeight: '600', color: '#1e40af', fontSize: '13.5px' }}>
                {fileName || 'Level Mentor Mapping CSV'}
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                {mentors.length} mentor assignment records loaded
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#dc2626',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <Trash2 size={13} /> Change File
          </button>
        </div>
      )}

      {/* Clean Amber Pending Notice with 1-Click Reminder */}
      {!allGroupsCovered && missingGroupNames.length > 0 && (
        <div style={{ 
          padding: '14px 18px', 
          borderRadius: '10px', 
          fontSize: '14px', 
          margin: '16px 0',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#fffbeb',
          color: '#92400e',
          border: '1px solid #fde047'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Mentor details pending:</strong> The following group(s) haven't filled their mentor details yet: <strong>{missingGroupNames.join(', ')}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendAllMissingReminders}
            disabled={isRemindingAll || allReminded}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: allReminded ? '#dcfce7' : '#f59e0b',
              color: allReminded ? '#166534' : '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: (isRemindingAll || allReminded) ? 'default' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {allReminded ? (
              <>
                <Check size={14} />
                Reminders Sent via Chat
              </>
            ) : (
              <>
                <MessageSquare size={14} />
                {isRemindingAll ? 'Sending...' : 'Notify Missing Groups via Chat'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Feedback Message */}
      {statusMessage && statusMessage.text && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '10px', 
          fontSize: '13px', 
          fontWeight: '500',
          marginTop: '16px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : statusMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
          color: statusMessage.type === 'error' ? '#991b1b' : statusMessage.type === 'success' ? '#166534' : '#1e40af',
          border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : statusMessage.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
        }}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{statusMessage.text}</span>
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
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {mentor.groupMatched ? (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '600'
                        }}>
                          <Check size={12} /> Matched
                        </span>
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

            {allGroupsCovered ? (
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
                {isSending ? 'Sending Onboarding Invites...' : 'Confirm & Broadcast Invites'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  Upload Blocked (All groups must be filled)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorImportPanel;