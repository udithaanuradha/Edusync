// src/components/MentorImportPanel.tsx
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Users, CheckCircle, XCircle, Send, AlertCircle } from 'lucide-react';

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

interface MentorImportPanelProps {
  academicUnit?: string; // e.g. 'ITM', 'IDS', 'CM' passed from parent coordinator session
  levelNumber: number;
}

export const MentorImportPanel: React.FC<MentorImportPanelProps> = ({ academicUnit = 'ITM' , levelNumber}) => {
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV File inside browser
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log("Raw Parsed Results:", results.data);

        const rawData = results.data as any[];
        const formattedData: MentorRow[] = rawData.map(row => {
          const cleanRow: Record<string, string> = {};
          Object.keys(row).forEach(key => {
            cleanRow[key.trim().toLowerCase()] = String(row[key]).trim();
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
          setStatusMessage({ type: 'error', text: 'No valid rows found. Please check your CSV headers.' });
          return;
        }

        // Send to backend preview endpoint to match groups
        try {
          const response = await fetch('http://localhost:5000/api/admin/mentors/preview-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentors: formattedData , level: levelNumber}),
          });
          const resData = await response.json();
          if (resData.success) {
            setMentors(resData.data);
            setStatusMessage({ type: 'success', text: `Successfully loaded and matched ${resData.data.length} records!` });
          } else {
            setStatusMessage({ type: 'error', text: resData.error || 'Failed to match groups.' });
          }
        } catch (err) {
          setStatusMessage({ type: 'error', text: 'Failed to connect to backend preview server.' });
        }
      },
      error: (error) => {
        setStatusMessage({ type: 'error', text: `Parsing error: ${error.message}` });
      }
    });
  };

  // Broadcast transactional invitations using Brevo
  const handleSendInvites = async () => {
    setIsSending(true);
    setStatusMessage({ type: 'info', text: 'Sending onboarding invitations via Brevo...' });

    try {
      const response = await fetch('http://localhost:5000/api/admin/mentors/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentors, academicUnit, level: levelNumber }),
      });

      const resData = await response.json();
      if (response.ok) {
        setStatusMessage({ type: 'success', text: '🚀 Invitations sent successfully!' });
        setMentors([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Users size={20} color="#2563eb" />
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Onboard Industry Mentors</h3>
      </div>

      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
        Upload a <strong>.csv</strong> file mapping external industry mentors to your Level {levelNumber} project groups. Matched mentors will receive credentials setup emails directly.
      </p>

      {/* File Drop Area */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef}
          onChange={handleFileUpload} 
          style={{ fontSize: '14px', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', width: '250px' }} 
        />
        <span style={{ fontSize: '12px', color: '#64748b' }}>Headers required: Group Name, Mentor Name, Email</span>
      </div>

      {statusMessage.text && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '8px', 
          fontSize: '14px', 
          marginBottom: '20px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : statusMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
          color: statusMessage.type === 'error' ? '#991b1b' : statusMessage.type === 'success' ? '#166534' : '#1e40af'
        }}>
          <AlertCircle size={16} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Preview Table */}
      {mentors.length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '10px' }}>Mapping Preview:</h4>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px', maxHeight: '250px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '10px 12px', color: '#475569' }}>Group No</th>
                  <th style={{ padding: '10px 12px', color: '#475569' }}>Group Name</th>
                  <th style={{ padding: '10px 12px', color: '#475569' }}>Mentor</th>
                  <th style={{ padding: '10px 12px', color: '#475569' }}>Email</th>
                  <th style={{ padding: '10px 12px', color: '#475569' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {mentors.map((mentor, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>{mentor.groupNo}</td>
                    <td style={{ padding: '10px 12px' }}>{mentor.groupName}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{mentor.name}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{mentor.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {mentor.groupMatched ? (
                        <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Match found
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={14} /> Group missing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSendInvites}
            disabled={isSending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isSending ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.7 : 1
            }}
          >
            <Send size={16} />
            {isSending ? 'Dispatching Invites...' : 'Confirm & Broadcast Invites'}
          </button>
        </div>
      )}
    </div>
  );
};