import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CoordinatorStageUpdates from './CoordinatorStageUpdates';
import GroupRequest from './GroupRequest';
import './StudentLevelInnerPages.css';

const tabItems = [
  { key: 'projectStates', label: 'Project States' },
  { key: 'groupFormation', label: 'Group Formation' },
  { key: 'groups', label: 'Groups' },
] as const;

type TabKey = (typeof tabItems)[number]['key'];

type GroupItem = {
  id: number | string;
  name: string;
  status: string;
  members: string;
  supervisor: string;
  groupLeader: string;
};

const StudentLevelInnerPages: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('projectStates');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch data when the user explicitly clicks the 'groups' tab
    if (activeTab !== 'groups') return;

    const fetchGroups = async () => {
      setLoadingGroups(true);

      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      // Use the level from the logged-in user profile as a fallback
      let targetLevel = levelNumber;
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          targetLevel = user.level || levelNumber;
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }

      try {
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (!user || !user.id) throw new Error('User not found');

        const fetchUrl = `http://localhost:5000/api/groups/display/${levelNumber}`;
        console.log(`🌐 Fetching groups for Level ${levelNumber} from: ${fetchUrl}`);

        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          console.error(`❌ Fetch failed with status: ${response.status}`);
          throw new Error('Failed to fetch');
        }

        const data = await response.json();
        console.log(`📥 Received data:`, data);

        // backend returns an array of objects: { groupId, groupName, supervisor, leader, members[] }
        const mappedGroups = data.map((item: any) => ({
          id: item.groupId,
          name: item.groupName,
          status: 'Formed',
          members: Array.isArray(item.members) ? item.members.join(', ') : 'No members listed',
          supervisor: item.supervisor || 'TBD',
          groupLeader: item.leader || 'Not Assigned',
        }));

        setGroups(mappedGroups);
        console.log(`✅ Groups loaded for level ${targetLevel}`);
      } catch (error) {
        console.error('Unable to load student groups:', error);
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [activeTab, levelNumber]); // Re-runs if tab changes or level prop updates

  const renderContent = () => {
    switch (activeTab) {
      case 'projectStates':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Project States</h3>
              <p>Review your current project status and phase updates for Level {levelNumber}.</p>
            </div>
            <CoordinatorStageUpdates levelNumber={levelNumber} />
          </div>
        );

      case 'groupFormation':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Group Formation</h3>
              <p>Submit a new project group formation request and track status.</p>
            </div>
            <GroupRequest />
          </div>
        );

      case 'groups':
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Groups</h3>
              <p>See your current groups and membership details for Level {levelNumber}.</p>
            </div>
            <div className="student-groups-wrapper">
              {loadingGroups ? (
                <div className="student-tab-empty">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="student-tab-empty">
                  No registered groups were found for Level {levelNumber} yet.
                </div>
              ) : (
                <div className="student-groups-grid">
                  {groups.map((group) => (
                    <div key={group.id} className="student-group-card">
                      <div className="group-card-header">
                        <h4>{group.name}</h4>
                        <span className="group-status-badge">{group.status}</span>
                      </div>
                      <div className="group-card-body">
                        <p className="group-meta">
                          <strong>Supervisor:</strong> {group.supervisor}
                        </p>
                        <p className="group-meta">
                          <strong>Group Leader:</strong> {group.groupLeader}
                        </p>
                        <p className="group-meta">
                          <strong>Members:</strong> {group.members}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="manage-project-section">
                <button
                  className="manage-project-btn"
                  onClick={() => navigate('/student/project-management')}
                >
                  Start Manage the Project
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="student-inner-pages">
      <div className="student-inner-tabs">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            className={`student-inner-tab ${activeTab === tab.key ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="student-inner-content">
        <div className="student-inner-panel">{renderContent()}</div>
      </div>
    </div>
  );
};

export default StudentLevelInnerPages;