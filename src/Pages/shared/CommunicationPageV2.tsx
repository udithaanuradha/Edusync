import React from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import ChatWindowV2 from "../../components/shared/ChatWindowV2";
import "./CommunicationPageV2.css";

const CommunicationPageV2: React.FC = () => {
  return (
    <div className="v2-comm-page-container">
      <Header />
      <div className="v2-comm-page-main">
        <Sidebar />
        <main className="v2-comm-page-content">
          <ChatWindowV2 title="Real-Time Messages (V2)" />
        </main>
      </div>
    </div>
  );
};

export default CommunicationPageV2;
