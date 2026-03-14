import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Eye, XCircle } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png'; // Ensure you have this image

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container" style={{ backgroundImage: `url(${heroBg})` }}>
      <div className="auth-overlay"></div>
      
      <div className="auth-back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={18} />
        <span>Go Back</span>
      </div>

      <div className="auth-card" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <img src={uomLogo} alt="UoM Logo" style={{ height: '80px' }} />
        </div>

        <form className="space-y-4">
          <div className="auth-input-group">
            <User size={20} />
            <input type="text" placeholder="USERNAME" className="auth-input" />
          </div>

          <div className="auth-input-group">
            <Lock size={20} />
            <input type="password" placeholder="PASSWORD" className="auth-input" />
            <Eye size={20} style={{ left: 'auto', right: '16px', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" /> Remember Me
            </label>
            <span style={{ cursor: 'pointer' }}>Forgot Password?</span>
          </div>

          <button type="submit" className="btn-auth">Login</button>

          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '24px', color: '#6b7280' }}>
            Don't you have an account? <b style={{ color: '#1f2937', cursor: 'pointer' }} onClick={() => navigate('/signup')}>Signup</b>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;