import React from 'react';

import Sidebar from '../../components/shared/Sidebar'; 
import Header from '../../components/shared/Header';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper'; // Use the wrapper
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import './MentorDashboard.css';

const Level3mentor = () => {
  return (
    <div className="app-layout">
      <MentorSidebarWrapper /> 
      
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          {/* 3. This component handles the specific level content */}
          <MentorStageManagement levelNumber={3} />
        </main>
      </div>
    </div>
  );
};

export default Level3mentor;