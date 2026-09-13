import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnnouncementWidget from '../shared/AnnouncementWidget';
import PrimaryButton from '../shared/ui/PrimaryButton';
import './Announcements.css';

const AUDIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All System Users' },
  { value: 'Student', label: 'All Students' },
  { value: 'Supervisor', label: 'Supervisors Only' },
  { value: 'Mentor', label: 'Industry Mentors Only' },
  { value: 'Coordinator', label: 'Coordinators Only' },
  { value: 'Admin', label: 'Admins Only' },
  { value: 'Level1', label: 'Level 1 Students' },
  { value: 'Level2', label: 'Level 2 Students' },
  { value: 'Level3', label: 'Level 3 Students' },
  { value: 'Level4', label: 'Level 4 Students' },
];

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  // Multiple audiences can be targeted at once (e.g. Supervisors + Students)
  // — sent to the backend as a comma-joined string. getAnnouncements already
  // matches target_audience with a substring LIKE per viewer role, so
  // "Supervisor,Student" already satisfies both a supervisor's and a
  // student's query with no backend filtering changes needed.
  const [audience, setAudience] = useState<string[]>(['All']);
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const audienceRef = useRef<HTMLDivElement>(null);
  const [priority, setPriority] = useState('normal');
  const [posting, setPosting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const widgetRef = useRef<{ refresh: () => void }>(null);

  useEffect(() => {
    if (!isAudienceOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(event.target as Node)) {
        setIsAudienceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAudienceOpen]);

  // "All System Users" already covers everyone, so it's mutually exclusive
  // with every other option: picking it clears any specific selections, and
  // picking a specific one drops "All" if it was selected.
  const toggleAudience = (value: string) => {
    setAudience((prev) => {
      if (value === 'All') {
        return prev.includes('All') ? [] : ['All'];
      }
      const withoutAll = prev.filter((item) => item !== 'All');
      return withoutAll.includes(value)
        ? withoutAll.filter((item) => item !== value)
        : [...withoutAll, value];
    });
  };

  const audienceSummary =
    audience.length === 0
      ? 'Select audience'
      : audience.includes('All')
        ? 'All System Users'
        : audience
            .map((value) => AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value)
            .join(', ');

  const handlePostAnnouncement = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setStatusText('Please add both title and message.');
      return;
    }

    if (audience.length === 0) {
      setStatusText('Please select at least one audience.');
      return;
    }

    try {
      setPosting(true);
      setStatusText('');

      // The shared announcement widget reads the same payload shape, so keep the coordinator fields aligned.
      const payload = {
        title: trimmedTitle,
        message: trimmedMessage,
        target_audience: audience.join(','),
        priority,
        author_name: user?.name || 'Coordinator',
        coordinator_id: user?.id,
      };

      console.log('Posting announcement with payload:', payload);

      const response = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('API Response Status:', response.status, response.statusText);

      const result = await response.json();
      console.log('API Response Data:', result);
      
      // Show what was saved
      if (result?.announcement) {
        console.log('Announcement saved with target_audience:', result.announcement.target_audience);
      }

      if (!response.ok) {
        console.error('Backend error response:', result);
        throw new Error(result?.error || `API Error: ${response.statusText}`);
      }

      setTitle('');
      setMessage('');
      setAudience(['All']);
      setPriority('normal');
      setStatusText('Announcement posted successfully!');
      
      // Trigger widget refresh
      setRefreshTrigger(prev => prev + 1);
      if (widgetRef.current?.refresh) {
        widgetRef.current.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post announcement.';
      console.error('Post announcement error:', err);
      setStatusText(`Error: ${msg}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="announcements-shell">
      <div className="announcements-card">
        <div className="card-header">
          <Megaphone size={20} className="header-icon" />
          <h3 className="card-title">Post Announcement</h3>
        </div>

        <div className="announcements-form">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Write announcement message"
          />

          <div className="announcement-audience-select" ref={audienceRef}>
            <button
              type="button"
              className="announcement-audience-trigger"
              onClick={() => setIsAudienceOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={isAudienceOpen}
            >
              <span>{audienceSummary}</span>
              <ChevronDown size={16} />
            </button>
            {isAudienceOpen && (
              <div className="announcement-audience-menu" role="listbox">
                {AUDIENCE_OPTIONS.map((option) => (
                  <label key={option.value} className="announcement-audience-option">
                    <input
                      type="checkbox"
                      checked={audience.includes(option.value)}
                      onChange={() => toggleAudience(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Urgent announcements are highlighted in the shared card widget. */}
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="normal">Normal priority</option>
            <option value="urgent">Urgent</option>
          </select>

          {statusText && <p className="announcement-status">{statusText}</p>}

          <PrimaryButton type="button" className="view-all-btn" onClick={handlePostAnnouncement} disabled={posting}>
            {posting ? 'Posting...' : 'Post Announcement'}
          </PrimaryButton>
        </div>
      </div>

      <AnnouncementWidget ref={widgetRef} title="Recent Announcements" maxItems={6} refreshDep={refreshTrigger} showOnlyMyAnnouncements={true} showEditDeleteButtons={true} />
    </div>
  );
};

export default Announcements;