import React, { useState, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnnouncementWidget from '../shared/AnnouncementWidget';
import './Announcements.css';

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('All');
  const [priority, setPriority] = useState('normal');
  const [posting, setPosting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const widgetRef = useRef<{ refresh: () => void }>(null);

  const handlePostAnnouncement = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setStatusText('Please add both title and message.');
      return;
    }

    try {
      setPosting(true);
      setStatusText('');

      // The shared announcement widget reads the same payload shape, so keep the coordinator fields aligned.
      const payload = {
        title: trimmedTitle,
        message: trimmedMessage,
        target_audience: audience,
        priority,
        author_name: user?.name || 'Coordinator',
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
      setAudience('All');
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

          <select value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="All">All System Users</option>
            <option value="Student">All Students</option>
            <option value="Supervisor">Supervisors Only</option>
            <option value="Mentor">Industry Mentors Only</option>
            <option value="Coordinator">Coordinators Only</option>
            <option value="Admin">Admins Only</option>
            <option value="Level1">Level 1 Students</option>
            <option value="Level2">Level 2 Students</option>
            <option value="Level3">Level 3 Students</option>
            <option value="Level4">Level 4 Students</option>
          </select>

          {/* Urgent announcements are highlighted in the shared card widget. */}
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="normal">Normal priority</option>
            <option value="urgent">Urgent</option>
          </select>

          {statusText && <p className="announcement-status">{statusText}</p>}

          <button type="button" className="view-all-btn" onClick={handlePostAnnouncement} disabled={posting}>
            {posting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>

      <AnnouncementWidget ref={widgetRef} title="Recent Announcements" maxItems={6} refreshDep={refreshTrigger} showOnlyMyAnnouncements={true} showEditDeleteButtons={true} />
    </div>
  );
};

export default Announcements;