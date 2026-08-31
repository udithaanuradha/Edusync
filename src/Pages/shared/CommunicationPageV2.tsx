import React from "react";
import AppShell from "../../components/shared/layout/AppShell";
import { coordinatorMenuItems, isCoordinatorUser } from "../../components/shared/Sidebar";
import ChatWindowV2 from "../../components/shared/ChatWindowV2";
import { useAuth } from "../../context/AuthContext";
import "./CommunicationPageV2.css";

const CommunicationPageV2: React.FC = () => {
  const { user } = useAuth();

  return (
    <AppShell navItems={isCoordinatorUser(user) ? coordinatorMenuItems : undefined}>
      <main className="v2-comm-page-content">
        <ChatWindowV2 title="Real-Time Messages (V2)" />
      </main>
    </AppShell>
  );
};

export default CommunicationPageV2;
