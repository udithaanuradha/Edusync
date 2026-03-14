import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container" style={{ backgroundImage: `url(${heroBg})` }}>
      <div className="auth-overlay"></div>

      <div className="auth-back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={18} />
        <span>Go Back</span>
      </div>

      <div className="auth-card" style={{ maxWidth: '768px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={uomLogo} alt="UoM Logo" style={{ height: '70px' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#6b7280' }}>Let's get started</p>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Create new account</h2>
        </div>

        <form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>First Name</label>
              <input type="text" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Last Name</label>
              <input type="text" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Email Address</label>
              <input type="email" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Phone Number</label>
              <input type="tel" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Password</label>
              <input type="password" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Confirm Password</label>
              <input type="password" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>University ID</label>
              <input type="text" placeholder="e.g., 190000X" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Select Your Role</label>
              <input type="text" className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>
          </div>

          <button type="submit" className="btn-auth" style={{ marginTop: '30px' }}>Sign Up</button>

          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '20px', color: '#6b7280' }}>
            Already have an account? <b style={{ color: '#1f2937', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</b>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;