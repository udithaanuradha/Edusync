import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';

const Level1Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 1 Projects"
      subtitle="Continue developing your project with regular progress tracking and milestone achievements."
    >
      <div className="dashboard-row">
        <StudentLevelInnerPages levelNumber={1} />
      </div>
    </StudentLevelPageLayout>
  );
};

export default Level1Student;