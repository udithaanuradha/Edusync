import React from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import ChatWindowV2 from "../../components/shared/ChatWindowV2";
import "./CommunicationPageV2.css";

const CommunicationPageV2: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="v2-comm-page-content">
          <ChatWindowV2 title="Real-Time Messages (V2)" />
        </main>
      </div>
    </div>
  );
};

export default CommunicationPageV2;
