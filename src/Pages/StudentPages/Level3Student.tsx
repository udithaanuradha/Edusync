import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';

const Level3Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 3 Projects"
      subtitle="Focus on implementing your project solution with detailed documentation and testing."
    >
      <CoordinatorStageUpdates levelNumber={3} />
      <div className="dashboard-row">
        <div className="level-content-card">
          <h3>Implementation Phase</h3>
          <p>Work on your project implementation and development.</p>
          <button className="btn btn-primary">Start Implementation</button>
        </div>
        <div className="level-content-card">
          <h3>Documentation</h3>
          <p>Maintain comprehensive project documentation.</p>
          <button className="btn btn-secondary">Update Docs</button>
        </div>
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level3Student;