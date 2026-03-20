import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../component/sidebar';
import Header from '../component/Header';
import './Overview.css';

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overall');
  const [messages] = useState(10);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Header />

        <div className="overview">
          <div className="dashboard-header">
            <h1>Supervisor Dashboard</h1>
            <div className="welcome-section">
              <span>Welcome again</span>
              <div className="profile-icon">👤</div>
            </div>
          </div>

          <div className="dashboard-container">
            <div className="left-section">
              <div className="notifications-card">
                <h2>Notifications</h2>
                <div className="notification-tabs">
                  <button className={`tab ${activeTab === 'overall' ? 'active' : ''}`} onClick={() => setActiveTab('overall')}>
                    overall
                  </button>
                </div>
                <div className="notification-items">
                  <div className="notification-row">
                    <div className="notif-title">Sample notification <span className="count">1</span></div>
                    <button className="read-btn">read</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-section">
              <h2>Group Overview</h2>
              <p>Messages: {messages}</p>
              <button onClick={() => navigate('/dashboard')}>Go to dashboard</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Overview;
