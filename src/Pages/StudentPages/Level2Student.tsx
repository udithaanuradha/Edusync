import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';

const Level2Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 2 Projects"
      subtitle="Continue developing your project with regular progress tracking and milestone achievements."
    >
      <div className="dashboard-row">
        <StudentLevelInnerPages levelNumber={2} />
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level2Student;