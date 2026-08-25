import React from "react";
import AppShell from "../../components/shared/layout/AppShell";
import ChatWindowV2 from "../../components/shared/ChatWindowV2";
import "./CommunicationPageV2.css";

const CommunicationPageV2: React.FC = () => {
  return (
    <AppShell>
      <main className="v2-comm-page-content">
        <ChatWindowV2 title="Real-Time Messages (V2)" />
      </main>
    </AppShell>
  );
};

export default CommunicationPageV2;
