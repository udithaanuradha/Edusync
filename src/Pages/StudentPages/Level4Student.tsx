import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';

const Level4Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 4 Projects"
      subtitle="Finalize your project with testing, presentation preparation, and evaluation."
    >
      <CoordinatorStageUpdates levelNumber={4} />
      <div className="dashboard-row">
        <div className="level-content-card">
          <h3>Final Testing</h3>
          <p>Complete comprehensive testing of your project.</p>
          <button className="btn btn-primary">Run Tests</button>
        </div>
        <div className="level-content-card">
          <h3>Presentation Prep</h3>
          <p>Prepare for your final project presentation and evaluation.</p>
          <button className="btn btn-secondary">Schedule Presentation</button>
        </div>
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level4Student;