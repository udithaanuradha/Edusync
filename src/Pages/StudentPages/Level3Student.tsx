import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';
import ProjectTypeToggle from '../../components/student/ProjectTypeToggle';
import IndividualProjectPages from '../../components/student/IndividualProjectPages';
import ProjectTypeChoicePrompt from '../../components/student/ProjectTypeChoicePrompt';
import { useProjectType } from '../../components/student/useProjectType';

const LEVEL = 3;

const Level3Student = () => {
  const { projectType, setProjectType, loading } = useProjectType(LEVEL);

  return (
    <StudentLevelPageLayout
      title="Level 3 Projects"
      subtitle="Focus on implementing your project solution with detailed documentation and testing."
      headerRight={
        <ProjectTypeToggle levelNumber={LEVEL} value={projectType} onChange={setProjectType} />
      }
    >
      <div className="dashboard-row">
        {loading ? null : projectType === "individual" ? (
          <IndividualProjectPages levelNumber={LEVEL} />
        ) : projectType === "group" ? (
          <StudentLevelInnerPages levelNumber={LEVEL} />
        ) : (
          <ProjectTypeChoicePrompt levelNumber={LEVEL} />
        )}
      </div>
    </StudentLevelPageLayout>
  );
};
export default Level3Student;
