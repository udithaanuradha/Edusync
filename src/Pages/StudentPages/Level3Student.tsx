import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';

const Level3Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 3 Projects"
      subtitle="Focus on implementing your project solution with detailed documentation and testing."
    >
      <div className="dashboard-row">
        <StudentLevelInnerPages levelNumber={3} />
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level3Student;