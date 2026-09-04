import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Bell, FilePlus, 
  CheckCircle, ClipboardList, GraduationCap, 
  Landmark, Phone, Mail, MapPin 
} from 'lucide-react';

// Make sure the path to your assets is correct
import heroBg from '../assets/background.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* 1. Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <Landmark size={20} />
          <span>UNIV. OF MORATUWA</span>
        </div>
        <div className="nav-title">EduSync</div>
      </nav>

      {/* 2. Hero Section */}
      <header className="hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>EduSync</h1>
          <h2>University of Moratuwa</h2>
          <p>
            Streamline your academic projects with seamless collaboration, progress tracking, and secure supervisor management.
          </p>
          <div className="btn-group">
            {/* SIGN UP: Now navigates to /signup */}
            <button onClick={() => navigate('/signup')} className="btn btn-white">
              Sign Up
            </button>
            {/* LOG IN: Navigates to /login */}
            <button onClick={() => navigate('/login')} className="btn btn-blue">
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* 3. White Feature Cards Section */}
      <section className="features-container">
        <div className="card">
          <Users className="card-icon" size={40} />
          <h3>Form Groups & Proposals</h3>
          <p>Easily form student groups and submit project proposals directly through the portal.</p>
        </div>
        <div className="card">
          <Calendar className="card-icon" size={40} />
          <h3>Schedule Meetings</h3>
          <p>Check supervisor availability and book appointment slots instantly using the integrated calendar system.</p>
        </div>
        <div className="card">
          <Bell className="card-icon" size={40} />
          <h3>Real-Time Tracking</h3>
          <p>Receive instant notifications on grading, feedback, and deadlines to keep your project on track.</p>
        </div>
      </section>

      {/* 4. Middle Process Section (Navy Blue Glass-morphism) */}
      <section className="process-mid-section">
        <h2 className="process-title">How We Streamline Your Project</h2>
        <div className="process-grid-container">
          <div className="process-step-card">
            <div className="step-icon"><FilePlus size={32} /></div>
            <h3>Register Project</h3>
            <p>Fill out the registration form with your group details.</p>
          </div>
          <div className="process-step-card">
            <div className="step-icon"><CheckCircle size={32} /></div>
            <h3>Get Approval</h3>
            <p>Receive confirmation and supervisor assignment via email.</p>
          </div>
          <div className="process-step-card">
            <div className="step-icon"><ClipboardList size={32} /></div>
            <h3>Track Progress</h3>
            <p>Upload reports and view Kanban boards for tasks.</p>
          </div>
          <div className="process-step-card">
            <div className="step-icon"><GraduationCap size={32} /></div>
            <h3>Evaluation</h3>
            <p>Final presentation and grading by the panel.</p>
          </div>
        </div>
      </section>

      {/* 5. Final Footer Section */}
      <footer className="main-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-logo">
              <img 
                src="/edusync-logo.svg" 
                alt="EduSync Logo" 
                style={{ width: "28px", height: "28px", borderRadius: "6px" }} 
              />
              <span>EduSync</span>
            </div>
            <p>
              EduSync is an integrated academic project management platform designed for the University of Moratuwa, streamlining student collaboration, milestone tracking, supervisor guidance, and evaluation workflows.
            </p>
          </div>

          <div className="footer-contact">
            <h4>CONTACT US</h4>
            <div className="footer-contact-list">
              <div className="footer-contact-item">
                <Phone size={16} className="contact-icon" />
                <span>+94 11 2650301, +94 11 2640051</span>
              </div>
              <div className="footer-contact-item">
                <Mail size={16} className="contact-icon" />
                <a href="mailto:edusyncfit@uom.lk" style={{ color: 'inherit', textDecoration: 'none' }}>edusyncfit@uom.lk</a>
              </div>
              <div className="footer-contact-item" style={{ alignItems: 'flex-start' }}>
                <MapPin size={16} className="contact-icon" style={{ marginTop: '3px' }} />
                <span>Faculty of Information Technology, University of Moratuwa, Katubedda, Moratuwa, Sri Lanka</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 EduSync - University of Moratuwa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;