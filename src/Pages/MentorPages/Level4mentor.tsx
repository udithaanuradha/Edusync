import React from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper'; // Use the wrapper
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import './MentorDashboard.css';

const Level4mentor = () => {
  return (
    <div className="app-layout">
      {/* This brings back your full sidebar with Calendar, etc. */}
      <MentorSidebarWrapper /> 
      
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <MentorStageManagement levelNumber={4} />
        </main>
      </div>
    </div>
  );
};

export default Level4mentor;