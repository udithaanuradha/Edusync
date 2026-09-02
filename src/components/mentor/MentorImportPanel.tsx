// src/components/MentorImportPanel.tsx
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Users, CheckCircle, Clock, Send, AlertCircle, Lock, MessageSquare, Check } from 'lucide-react';

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
  academicUnit?: string; // e.g. 'ITM', 'IDS', 'CM' passed from parent coordinator session
  levelNumber: number;
  onSuccess?: (toastMsg?: string) => void;
}

export const MentorImportPanel: React.FC<MentorImportPanelProps> = ({ academicUnit = 'ITM' , levelNumber, onSuccess }) => {
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [unfilledGroups, setUnfilledGroups] = useState<UnfilledGroup[]>([]);
  const [allGroupsCovered, setAllGroupsCovered] = useState<boolean>(false);
  const [totalLevelGroups, setTotalLevelGroups] = useState<number>(0);
  const [missingGroupNames, setMissingGroupNames] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info' | 'warning' | ''; text: string }>({ type: '', text: '' });
  
  // Chat Reminder States
  const [remindingGroupIds, setRemindingGroupIds] = useState<Record<number, boolean>>({});
  const [remindedGroupIds, setRemindedGroupIds] = useState<Record<number, boolean>>({});
  const [isRemindingAll, setIsRemindingAll] = useState(false);
  const [allReminded, setAllReminded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current logged-in user (admin/coordinator) ID
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id || null;

  // Parse CSV File inside browser
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setMentors([]);
    setUnfilledGroups([]);
    setAllGroupsCovered(false);
    setMissingGroupNames([]);
    setRemindedGroupIds({});
    setAllReminded(false);
    setStatusMessage({ type: 'info', text: 'Checking CSV against registered Level ' + levelNumber + ' groups...' });

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
            groupNo: cleanRow['group no.'] || cleanRow['group no'] || '',
            groupName: cleanRow['group name'] || '',
            name: cleanRow['mentor name'] || '',
            company: cleanRow['mentor\'s company'] || cleanRow['mentors company'] || '',
            email: cleanRow['mentor\'s mail'] || cleanRow['mentors mail'] || cleanRow['email'] || '',
            phone: cleanRow['mentor\'s phone no.'] || cleanRow['mentor\'s phone no'] || cleanRow['phone'] || '',
          };
        }).filter(m => m.email && m.name);

        if (formattedData.length === 0) {
          setStatusMessage({ type: 'error', text: 'No valid mentor rows found with Name and Email. Please check your CSV headers.' });
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
              setStatusMessage({ type: '', text: '' }); // Handled cleanly by the amber banner
            }
          } else {
            setStatusMessage({ type: 'error', text: resData.error || 'Failed to match groups.' });
          }
        } catch (err) {
          setStatusMessage({ type: 'error', text: 'Failed to connect to backend server.' });
        }
      },
      error: (error) => {
        setStatusMessage({ type: 'error', text: `Parsing error: ${error.message}` });
      }
    });
  };

  // Send Chat Reminder to a single group's members
  const handleSendGroupReminder = async (groupId: number, groupName: string) => {
    setRemindingGroupIds(prev => ({ ...prev, [groupId]: true }));

    try {
      const response = await fetch('http://localhost:5000/api/admin/mentors/remind-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          groupName,
          adminId: currentUserId
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRemindedGroupIds(prev => ({ ...prev, [groupId]: true }));
        setStatusMessage({
          type: 'success',
          text: `Chat reminder sent successfully to all members of "${groupName}"!`
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to send reminder.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Network error sending reminder.' });
    } finally {
      setRemindingGroupIds(prev => ({ ...prev, [groupId]: false }));
    }
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
        const newReminded: Record<number, boolean> = {};
        unfilledGroups.forEach(g => { newReminded[g.id] = true; });
        setRemindedGroupIds(newReminded);
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

  // Broadcast transactional invitations using Brevo
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

  return (
    <div style={{ backgroundColor: 'var(--eds-color-bg-surface)', borderRadius: '12px', border: '1px solid var(--eds-color-border)', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Users size={20} color="var(--eds-color-primary)" />
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--eds-color-text-strong)', margin: 0 }}>Onboard Industry Mentors</h3>
      </div>

      <p style={{ fontSize: '14px', color: 'var(--eds-color-text-muted)', marginBottom: '20px' }}>
        Upload a <strong>.csv</strong> file mapping external industry mentors to your Level {levelNumber} project groups. 
        <span style={{ color: 'var(--eds-color-text-body)', fontWeight: '600' }}> All registered groups in Level {levelNumber} must be updated in this sheet before upload.</span>
      </p>

      {/* File Drop Area */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef}
          onChange={handleFileUpload} 
          style={{ fontSize: '14px', border: '1px solid var(--eds-color-border)', padding: '8px', borderRadius: '6px', width: '260px' }} 
        />
        <span style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>Headers required: Group Name, Mentor Name, Email</span>
      </div>

      {/* Clean User-Friendly Pending Alert (with 1-click Chat Reminder) */}
      {!allGroupsCovered && missingGroupNames.length > 0 && (
        <div style={{ 
          padding: '14px 18px', 
          borderRadius: '10px', 
          fontSize: '14px', 
          marginBottom: '20px',
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

      {/* General Toast Status Feedback */}
      {statusMessage.text && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '8px', 
          fontSize: '14px', 
          marginBottom: '20px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          backgroundColor: statusMessage.type === 'error' ? 'var(--eds-color-danger-bg)' : statusMessage.type === 'success' ? 'var(--eds-color-success-bg)' : 'var(--eds-color-primary-soft)',
          color: statusMessage.type === 'error' ? 'var(--eds-color-danger-text)' : statusMessage.type === 'success' ? 'var(--eds-color-success-text)' : 'var(--eds-color-primary-hover)',
          border: `1px solid ${statusMessage.type === 'error' ? 'var(--eds-color-danger-solid)' : statusMessage.type === 'success' ? 'var(--eds-color-success-solid)' : 'var(--eds-color-primary-soft-border)'}`
        }}>
          {statusMessage.type === 'success' ? (
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Preview Table */}
      {(mentors.length > 0 || unfilledGroups.length > 0) && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eds-color-text-body)', margin: 0 }}>
              Mapping Preview:
            </h4>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              padding: '3px 10px', 
              borderRadius: '20px',
              backgroundColor: allGroupsCovered ? 'var(--eds-color-success-bg)' : '#fef3c7',
              color: allGroupsCovered ? 'var(--eds-color-success-text)' : '#92400e',
              border: `1px solid ${allGroupsCovered ? 'var(--eds-color-success-solid)' : '#fde047'}`
            }}>
              {allGroupsCovered ? `All ${totalLevelGroups} Groups Complete` : `${mentors.filter(m => m.groupMatched).length} of ${totalLevelGroups} Groups Filled`}
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--eds-color-border)', borderRadius: '8px', marginBottom: '20px', maxHeight: '300px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--eds-color-bg-surface-soft)', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>Group No</th>
                  <th style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>Group Name</th>
                  <th style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>Mentor</th>
                  <th style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>Email</th>
                  <th style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Render rows provided in the CSV */}
                {mentors.map((mentor, index) => (
                  <tr key={`mentor-${index}`} style={{ borderBottom: '1px solid var(--eds-color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>{mentor.groupNo || index + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{mentor.groupName}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{mentor.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>{mentor.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {mentor.groupMatched ? (
                        <span style={{ color: 'var(--eds-color-success-solid)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Match found
                        </span>
                      ) : (
                        <span style={{ color: 'var(--eds-color-danger-solid)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          Group not found
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
                      borderBottom: '1px solid var(--eds-color-border)', 
                      backgroundColor: 'rgba(245, 158, 11, 0.04)' 
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--eds-color-text-muted)' }}>—</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{unfilled.groupName}</td>
                    <td style={{ padding: '10px 12px', color: '#b45309', fontStyle: 'italic' }}>Pending submission</td>
                    <td style={{ padding: '10px 12px', color: '#b45309', fontStyle: 'italic' }}>Pending submission</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Clock size={14} /> Not filled yet
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Button */}
          {allGroupsCovered ? (
            <button
              onClick={handleSendInvites}
              disabled={isSending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                backgroundColor: 'var(--eds-color-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSending ? 'not-allowed' : 'pointer',
                opacity: isSending ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
            >
              <Send size={16} />
              {isSending ? 'Dispatching Invites...' : 'Confirm & Broadcast Invites'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                disabled={true}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'var(--eds-color-bg-surface-soft)',
                  color: 'var(--eds-color-text-faint)',
                  border: '1px solid var(--eds-color-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  width: 'fit-content'
                }}
              >
                <Lock size={15} />
                Upload Blocked (All groups must be filled)
              </button>
              <span style={{ fontSize: '12px', color: 'var(--eds-color-text-muted)' }}>
                * Please ensure all groups have filled their details before uploading.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};