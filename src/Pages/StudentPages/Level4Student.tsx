import StudentLevelPageLayout from './StudentLevelPageLayout';
import CoordinatorStageUpdates from '../../components/student/CoordinatorStageUpdates';
import GroupRequest from '../../components/student/GroupRequest';
const Level4Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 4 Projects"
      subtitle="Finalize your project with testing, presentation preparation, and evaluation."
    >
      <CoordinatorStageUpdates levelNumber={4} />
       {/* New Group Formation Section */}
      <div className="dashboard-row">
        <GroupRequest />
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level4Student;