 import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Bell, FilePlus, 
  CheckCircle, ClipboardList, GraduationCap, 
  Facebook, Twitter, Instagram, Landmark 
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
        <div className="nav-title">PMS</div>
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
              <Landmark size={24} />
              <span>UPMS</span>
            </div>
            <p>
              The University Project Management System is a secure web solution that streamlines project registration, supervisor allocation, and evaluation workflows.
            </p>
            <div className="social-links">
              <Facebook size={18} className="social-icon" />
              <Twitter size={18} className="social-icon" />
              <Instagram size={18} className="social-icon" />
            </div>
          </div>

          <div className="footer-links">
            <h4>ABOUT US</h4>
            <ul>
              <li onClick={() => navigate('/')}>Home</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>CONTACT US</h4>
            <button className="get-touch-btn">Get in touch</button>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 University Project Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;