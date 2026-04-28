import React from 'react';

import Sidebar from '../../components/shared/Sidebar'; 
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';
import './MentorDashboard.css';

const Level2mentor = () => {
  return (
    <div className="app-layout">
      <MentorSidebarWrapper /> 
      
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          {/* 3. This component handles the specific level content */}
          <MentorStageManagement levelNumber={2} />
        </main>
      </div>
    </div>
  );
};

export default Level2mentor;