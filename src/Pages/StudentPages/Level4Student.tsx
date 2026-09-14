import StudentLevelPageLayout from './StudentLevelPageLayout';
import StudentLevelInnerPages from '../../components/student/StudentLevelInnerPages';
import ProjectTypeToggle from '../../components/student/ProjectTypeToggle';
import IndividualProjectPages from '../../components/student/IndividualProjectPages';
import ProjectTypeChoicePrompt from '../../components/student/ProjectTypeChoicePrompt';
import { useProjectType } from '../../components/student/useProjectType';

const LEVEL = 4;

const Level4Student = () => {
  const { projectType, setProjectType, loading } = useProjectType(LEVEL);

  return (
    <StudentLevelPageLayout
      title="Level 4 Projects"
      subtitle="Finalize your project with testing, presentation preparation, and evaluation."
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
export default Level4Student;
