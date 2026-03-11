import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';
import ProtectedRoute from './components/shared/ProtectedRoute';
import StatCards from './components/coordinator/StatCards'; // <-- Added this import!
import RecentProjects from './components/coordinator/RecentProjects';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app-layout">
      {/* The Sidebar stays fixed on the left */}
      <Sidebar />
      
      <div className="main-viewport">
        {/* The Header stays fixed at the top */}
        <Header />
        
        <main className="content-container">
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Wrap the Dashboard element inside the ProtectedRoute */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <div className="dashboard-content">
                  <div className="dashboard-header-section">
                     <h2 className="overview-title">Dashboard Overview</h2>
                     <p className="overview-subtitle">Welcome back! Here's what's happening with your projects.</p>
                  </div>
                  
                  {/* The StatCards component is safely inside the dashboard now! */}
                  <StatCards />
                  <div className="dashboard-middle-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
    <RecentProjects />
    {/* We will put UpcomingDeadlines here next! */}
  </div>
                </div>
              </ProtectedRoute>
            } />
            
            {/* You can add a temporary login route here just to test it */}
            <Route path="/login" element={<div>Please Login</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;