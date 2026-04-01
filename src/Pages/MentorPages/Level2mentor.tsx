import React from 'react';
import MentorSidebar from '../../components/mentor/MentorSidebar';
import Header from '../../components/shared/Header';
import MentorStageManagement from '../../components/mentor/MentorStageManagement';


const Level2mentor = () => {
  return (
    <div className="app-layout">
      <MentorSidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <MentorStageManagement levelNumber={2} />
        </main>
      </div>
    </div>
  );
};

export default Level2mentor;