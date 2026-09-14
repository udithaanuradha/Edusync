import React from "react";
import "./StudentLevelInnerPages.css";

// Shown on a Level 3 / Level 4 page when the student hasn't picked Group or
// Individual Project yet — there's no default (see ProjectTypeToggle), so
// this fills the space the tabs would otherwise occupy until they choose
// via the toggle above.
const ProjectTypeChoicePrompt: React.FC<{ levelNumber: number }> = ({
  levelNumber,
}) => (
  <div className="student-inner-pages">
    <div className="student-inner-content">
      <div className="student-inner-panel">
        <div className="student-tab-empty">
          Choose Group Project or Individual Project above to see your Level{" "}
          {levelNumber} tabs.
        </div>
      </div>
    </div>
  </div>
);

export default ProjectTypeChoicePrompt;
