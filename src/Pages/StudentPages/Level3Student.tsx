import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';
import GroupRequest from '../../components/student/GroupRequest';
const Level3Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 3 Projects"
      subtitle="Focus on implementing your project solution with detailed documentation and testing."
    >
      <CoordinatorStageUpdates levelNumber={3} />
      {/* New Group Formation Section */}
      <div className="dashboard-row">
        <GroupRequest />
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level3Student;