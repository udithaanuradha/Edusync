 import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';
import GroupRequest from '../../components/student/GroupRequest';

const Level1Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 1 Projects"
      subtitle="Continue developing your project with regular progress tracking and milestone achievements."
    >
      {/* Existing progress tracking */}
      <CoordinatorStageUpdates levelNumber={1} />
      
      {/* New Group Formation Section */}
      <div className="dashboard-row">
        <GroupRequest />
      </div>
    </StudentLevelPageLayout>
  );
};

export default Level1Student;