import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';

const Level4Student = () => {
  return (
    <StudentLevelPageLayout
      title="Level 4 Projects"
      subtitle="Finalize your project with testing, presentation preparation, and evaluation."
    >
      <div className="dashboard-row">
        <StudentLevelInnerPages levelNumber={4} />
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level4Student;