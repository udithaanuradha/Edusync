import React from "react";
import Header from "../../components/shared/Header";
import Sidebar from "../../components/shared/Sidebar";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import ChatWindowV2 from "../../components/shared/ChatWindowV2";
import "./CommunicationPage.css";

type CommunicationPageV2Props = {
  variant?: "shared" | "supervisor";
};

const CommunicationPageV2: React.FC<CommunicationPageV2Props> = ({
  variant = "shared",
}) => {
  return (
    <div
      className={
        variant === "supervisor"
          ? "supervisor-communication-page"
          : "communication-layout"
      }
    >
      <Header />
      <div
        className={
          variant === "supervisor"
            ? "supervisor-communication-layout"
            : "communication-main"
        }
      >
        <Sidebar />
        {variant === "supervisor" && <SupervisorSidebar />}
        <main
          className={
            variant === "supervisor"
              ? "supervisor-communication-content"
              : "communication-content"
          }
        >
          <ChatWindowV2 title="Real-Time Messages (V2)" />
        </main>
      </div>
    </div>
  );
};

export default CommunicationPageV2;
