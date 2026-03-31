import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';

const Level1Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 1 Projects"
      subtitle="Start your academic project journey with group formation and proposal submission."
    >
      <CoordinatorStageUpdates levelNumber={1} />
      <div className="dashboard-row">
        <div className="level-content-card">
          <h3>Group Formation</h3>
          <p>Find and join project groups for your academic year.</p>
          <button className="btn btn-primary">Find Groups</button>
        </div>
        <div className="level-content-card">
          <h3>Project Proposal</h3>
          <p>Submit your initial project proposal for approval.</p>
          <button className="btn btn-secondary">Submit Proposal</button>
        </div>
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level1Student;