import React, { useState } from "react";
import CoordinatorStageUpdates from "./CoordinatorStageUpdates";
import RequestSupervisor from "./RequestSupervisor";
import StudentSubmissions from "./StudentSubmissions";
import "./StudentLevelInnerPages.css";

// Individual Project side of the Level 3 / Level 4 toggle. Three tabs,
// styled identically to the Group Project side (same tab strip, same panel
// scaffold): Project Stages and Documents reuse the exact same components
// as Group Project's "Project States" and "Submissions" tabs unmodified —
// both are already scoped by level + the student's own account, not by
// group, so there was nothing to adapt. Request Supervisor is new (see
// RequestSupervisor.tsx) — the "group of one" equivalent of Group
// Formation, with no member-adding step and a single supervisor approval.
const tabItems = [
  { key: "projectStages", label: "Project Stages" },
  { key: "requestSupervisor", label: "Request Supervisor" },
  { key: "documents", label: "Documents" },
] as const;

type TabKey = (typeof tabItems)[number]["key"];

const IndividualProjectPages: React.FC<{ levelNumber: number }> = ({
  levelNumber,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("projectStages");

  const renderContent = () => {
    switch (activeTab) {
      case "projectStages":
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Project Stages</h3>
              <p>
                Review your current project status and phase updates for
                Level {levelNumber}.
              </p>
            </div>
            <CoordinatorStageUpdates levelNumber={levelNumber} />
          </div>
        );

      case "requestSupervisor":
        return (
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Request Supervisor</h3>
              <p>
                Submit your individual project request, choose a supervisor,
                and track approval — no group members required.
              </p>
            </div>
            <RequestSupervisor levelNumber={levelNumber} />
          </div>
        );

      case "documents":
        // StudentSubmissions renders its own heading internally (same as
        // it does on the Group Project side's Submissions tab) — no
        // wrapper here, or the heading would be duplicated.
        return <StudentSubmissions levelNumber={levelNumber} />;

      default:
        return null;
    }
  };

  return (
    <div className="student-inner-pages">
      <div className="student-inner-tabs">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            className={`student-inner-tab ${activeTab === tab.key ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="student-inner-content">
        <div className="student-inner-panel">{renderContent()}</div>
      </div>
    </div>
  );
};

export default IndividualProjectPages;
