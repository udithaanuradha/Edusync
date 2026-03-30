import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';

const Level2Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 2 Projects"
      subtitle="Continue developing your project with regular progress tracking and milestone achievements."
    >
      <CoordinatorStageUpdates levelNumber={2} />
      <div className="dashboard-row">
        <div className="level-content-card">
          <h3>Progress Tracking</h3>
          <p>Monitor your project milestones and deadlines.</p>
          <button className="btn btn-primary">View Progress</button>
        </div>
        <div className="level-content-card">
          <h3>Supervisor Meetings</h3>
          <p>Schedule and track meetings with your project supervisor.</p>
          <button className="btn btn-secondary">Schedule Meeting</button>
        </div>
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level2Student;