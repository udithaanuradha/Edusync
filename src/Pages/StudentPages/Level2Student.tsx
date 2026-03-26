 import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const Level2Student = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Level 2 - Project Development
              </h2>
              <p className="overview-subtitle">
                Continue developing your project with regular progress tracking and milestone achievements.
              </p>
            </div>

            {/* Level 2 specific content */}
            <div className="dashboard-row">
              <div className="level-content-card">
                <h3>Progress Tracking</h3>
                <p>Monitor your project milestones and deadlines.</p>
                <button className="btn btn-primary">View Progress</button>
              </div>
              <div className="level-content-card">
                <h3>Supervisor Meetings</h3>
                <p>Schedule and track meetings with your project supervisor.</p>
                <button className="btn btn-secondary">Schedule Meeting</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default Level2Student;