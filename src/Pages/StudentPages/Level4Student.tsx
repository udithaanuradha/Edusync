 import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const Level4Student = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Level 4 - Project Completion
              </h2>
              <p className="overview-subtitle">
                Finalize your project with testing, presentation preparation, and evaluation.
              </p>
            </div>

            {/* Level 4 specific content */}
            <div className="dashboard-row">
              <div className="level-content-card">
                <h3>Final Testing</h3>
                <p>Complete comprehensive testing of your project.</p>
                <button className="btn btn-primary">Run Tests</button>
              </div>
              <div className="level-content-card">
                <h3>Presentation Prep</h3>
                <p>Prepare for your final project presentation and evaluation.</p>
                <button className="btn btn-secondary">Schedule Presentation</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default Level4Student;