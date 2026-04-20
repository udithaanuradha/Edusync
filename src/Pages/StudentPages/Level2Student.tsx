import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';
import GroupRequest from '../../components/student/GroupRequest';
const Level2Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 2 Projects"
      subtitle="Continue developing your project with regular progress tracking and milestone achievements."
    >
      <CoordinatorStageUpdates levelNumber={2} />
       <div className="dashboard-row">
        <GroupRequest />
      </div>
      
    </StudentLevelPageLayout>
  );
};
export default Level2Student;