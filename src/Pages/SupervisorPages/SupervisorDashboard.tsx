import React from "react";
import Sidebar from "../../components/shared/Sidebar";
import Header from "../../components/shared/Header";
import SupervisorOverview from "./SupervisorOverview";
import SupervisorSidebar from "../../components/supervisor/SupervisorSidebar";
import "./SupervisorDashboard.css";

/**
 * SupervisorPage Component
 * Acts as the primary wrapper for the Supervisor's main dashboard view.
 * It manages the high-level layout, including dual sidebars and the main content area.
 */
const SupervisorPage = () => (
  /* The outermost container using a 'shell' class to define the app's grid or flex behavior */
  <div className="app-layout supervisor-shell">
    {/* 
      SIDEBAR STACK 
      This section handles the left-hand navigation. 
      It combines a global Sidebar (shared across roles) and a specific SupervisorSidebar.
    */}
    <div className="supervisor-side-stack">
      <Sidebar />
      <SupervisorSidebar compact />
    </div>

    {/* 
      MAIN VIEWPORT 
      Everything to the right of the sidebars. 
    */}
    <div className="main-viewport">
      {/* Top navigation bar containing user profile, search, or notifications */}
      <Header />

      {/* 
        CONTENT CONTAINER 
        The scrollable area where the specific page data is displayed.
      */}
      <main className="content-container supervisor-content-container">
        {/* The actual dashboard statistics, charts, and group lists */}
        <SupervisorOverview />
      </main>
    </div>
  </div>
);

export default SupervisorPage;
