import React, { useState } from "react";
import "./StudentLevelInnerPages.css";

// Individual Project side of the Level 3 / Level 4 toggle. The real pages
// for this path haven't been specified yet — this is intentionally just a
// placeholder with the same tab-strip/panel scaffold the Group Project side
// uses (see StudentLevelInnerPages), so swapping in the real tabs later is a
// content change, not another layout restructuring pass.
const placeholderTabItems = [
  { key: "overview", label: "Overview" },
] as const;

type PlaceholderTabKey = (typeof placeholderTabItems)[number]["key"];

const IndividualProjectPlaceholder: React.FC<{ levelNumber: number }> = ({
  levelNumber,
}) => {
  const [activeTab, setActiveTab] = useState<PlaceholderTabKey>("overview");

  return (
    <div className="student-inner-pages">
      <div className="student-inner-tabs">
        {placeholderTabItems.map((tab) => (
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
        <div className="student-inner-panel">
          <div className="student-inner-tab-panel">
            <div className="student-inner-tab-heading">
              <h3>Individual Project</h3>
              <p>
                Individual Project pages for Level {levelNumber} aren't built
                yet — this is a placeholder so the Group/Individual toggle has
                somewhere to go. Check back once this path is defined.
              </p>
            </div>
            <div className="student-tab-empty">Individual Project pages coming soon.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualProjectPlaceholder;
