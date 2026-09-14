import React from 'react';
import MentorSidebarWrapper from '../../components/mentor/MentorSidebarWrapper';
import Header from '../../components/shared/Header';
import ChatWindowV2 from '../../components/shared/ChatWindowV2';
import '../shared/CommunicationPageV2.css';

const MentorCommunicationPage: React.FC = () => {
  return (
    <div className="app-layout">
      <MentorSidebarWrapper />
      <div className="main-viewport">
        <Header pageTitle="" />
        <main className="v2-comm-page-content" style={{ flex: 1, minHeight: 0, padding: '24px 32px' }}>
          <ChatWindowV2 title="Real-Time Messages" />
        </main>
      </div>
    </div>
  );
};

export default MentorCommunicationPage;
