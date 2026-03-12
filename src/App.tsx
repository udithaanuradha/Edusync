import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Coordinator Components
import StatCards from './components/coordinator/StatCards'; 
import RecentProjects from './components/coordinator/RecentProjects';
import UpcomingDeadlines from './components/coordinator/UpcomingDeadlines'; 
import Announcements from './components/coordinator/Announcements'; 

import './App.css';

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <div className="dashboard-content">
                  <div className="dashboard-header-section">
                     <h2 className="overview-title">Dashboard Overview</h2>
                     <p className="overview-subtitle">Welcome back! Here's what's happening with your projects.</p>
                  </div>
                  
                  <StatCards />
                  
                  <div className="dashboard-middle-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                    <RecentProjects />
                    <UpcomingDeadlines /> 
                  </div>

                  <div className="dashboard-bottom-row" style={{ display: 'flex', gap: '24px' }}>
                    <Announcements />
                  </div>

                </div>
              </ProtectedRoute>
            } />
            <Route path="/login" element={<div>Please Login</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;