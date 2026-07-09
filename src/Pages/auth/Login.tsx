import { useAuth } from '../../context/AuthContext';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import heroBg from '../../assets/background.png';
import uomLogo from '../../assets/uom_logo.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      console.log('Logged in successfully:', data.user);
      
      login(data.user);
      
      // Cast user to 'any' to dynamically handle the new backend designation field securely
      const userObj = data.user as any;
      
      if (userObj.role === 'admin') {
        navigate('/admin');
      } else if (userObj.role === 'lecturer') {
        if (userObj.designation === 'coordinator') {
          navigate('/coordinator');
        } else {
          // Defaults to supervisor dashboard for newly registered lecturers
          navigate('/supervisor');
        }
      } else if (userObj.role === 'student') {
        navigate('/student');
      } else if (userObj.role === 'supervisor') {
        navigate('/supervisor');
      } else if (userObj.role === 'mentor') {
        navigate('/mentor');
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

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

        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
          Edusync Login
        </h2>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#991b1b', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <User size={20} />
            <input 
              type="email" 
              placeholder="EMAIL" 
              className="auth-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group" style={{ position: 'relative' }}>
            <Lock size={20} />
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="PASSWORD" 
              className="auth-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div 
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', 
                right: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              /> 
              Remember Me
            </label>
            <span style={{ cursor: 'pointer', color: '#2563eb' }}>Forgot Password?</span>
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

export default Login;