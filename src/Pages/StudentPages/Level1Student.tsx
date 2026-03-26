 import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const Level1Student = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Level 1 - Project Initiation
              </h2>
              <p className="overview-subtitle">
                Start your academic project journey with group formation and proposal submission.
              </p>
            </div>

            {/* Level 1 specific content */}
            <div className="dashboard-row">
              <div className="level-content-card">
                <h3>Group Formation</h3>
                <p>Find and join project groups for your academic year.</p>
                <button className="btn btn-primary">Find Groups</button>
              </div>
              <div className="level-content-card">
                <h3>Project Proposal</h3>
                <p>Submit your initial project proposal for approval.</p>
                <button className="btn btn-secondary">Submit Proposal</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default Level1Student;