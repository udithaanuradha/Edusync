 import Sidebar from '../../components/shared/Sidebar';
import Header from '../../components/shared/Header';

const Level3Student = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-viewport">
        <Header />
        <main className="content-container">
          <div className="dashboard-content">
            <div className="dashboard-header-section">
              <h2 className="overview-title">
                Level 3 - Project Implementation
              </h2>
              <p className="overview-subtitle">
                Focus on implementing your project solution with detailed documentation and testing.
              </p>
            </div>

            {/* Level 3 specific content */}
            <div className="dashboard-row">
              <div className="level-content-card">
                <h3>Implementation Phase</h3>
                <p>Work on your project implementation and development.</p>
                <button className="btn btn-primary">Start Implementation</button>
              </div>
              <div className="level-content-card">
                <h3>Documentation</h3>
                <p>Maintain comprehensive project documentation.</p>
                <button className="btn btn-secondary">Update Docs</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
export default Level3Student;