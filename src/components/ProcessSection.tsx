import React from 'react';
import { Mail, Facebook, Twitter, Instagram, GraduationCap, ClipboardList, CheckCircle, FilePlus } from 'lucide-react';
import './index.css';

const Footer = () => {
  return (
    <footer className="edusync-footer-section">
      {/* Streamline Process Section */}
      <div className="process-container">
        <h2 className="section-title">How We Streamline Your Project</h2>
        <div className="process-grid">
          <div className="process-card">
            <FilePlus className="process-icon" size={32} />
            <h3>Register Project</h3>
            <p>Fill out the registration form with your group details.</p>
          </div>
          <div className="process-card">
            <CheckCircle className="process-icon" size={32} />
            <h3>Get Approval</h3>
            <p>Receive confirmation and supervisor assignment via email.</p>
          </div>
          <div className="process-card">
            <ClipboardList className="process-icon" size={32} />
            <h3>Track Progress</h3>
            <p>Upload reports and view Kanban boards for tasks.</p>
          </div>
          <div className="process-card">
            <GraduationCap className="process-icon" size={32} />
            <h3>Evaluation</h3>
            <p>Final presentation and grading by the panel.</p>
          </div>
        </div>
      </div>

      <hr className="footer-divider" />

      {/* Main Footer Links */}
      <div className="footer-links-container">
        <div className="footer-brand">
          <div className="brand-logo">
            <div className="logo-icon"></div>
            <span>UPMS</span>
          </div>
          <p>
            The University Project Management System is a secure web solution 
            that streamlines project registration, supervisor allocation, and evaluation 
            workflows. It automates activity tracking and simplifies documentation.
          </p>
          <div className="social-icons">
            <Facebook size={20} />
            <Twitter size={20} />
            <Instagram size={20} />
          </div>
        </div>

        <div className="footer-nav">
          <h4>ABOUT US</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#contact">Contact Us</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4>CONTACT US</h4>
          <button className="contact-btn">Get in touch</button>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 University Project Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;