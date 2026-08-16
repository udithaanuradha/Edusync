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

  // Unverified-account handling: shown when /api/login returns 403 because
  // the account hasn't completed OTP verification yet.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Shared by the normal submit handler and by the "verify & retry" flow
  // after a successful OTP check, so both paths route the same way.
  const performLogin = async (loginEmail: string, loginPassword: string) => {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        setNeedsVerification(true);
      }
      throw new Error(data.error || 'Login failed');
    }

    setNeedsVerification(false);
    const rawRole = String(data.user?.role || '').trim().toLowerCase();
    const rawDesignation = String(data.user?.designation || '').trim().toLowerCase();
    const rawEffectiveRole = String(data.user?.effectiveRole || '').trim().toLowerCase();

    const effectiveRole =
      rawEffectiveRole ||
      rawDesignation ||
      (rawRole === 'coordinator' ? 'coordinator' : '') ||
      rawRole;

    const userObj = {
      ...(data.user || {}),
      role: rawRole === 'coordinator' ? 'lecturer' : rawRole,
      designation: rawDesignation || (rawRole === 'coordinator' ? 'coordinator' : ''),
      effectiveRole,
    } as any;

    login(userObj);

    if (userObj.role === 'admin') {
      navigate('/admin');
    } else if (userObj.role === 'lecturer') {
      if (effectiveRole === 'coordinator') {
        navigate('/coordinator');
      } else {
        navigate('/supervisor');
      }
    } else if (userObj.role === 'student') {
      navigate('/student');
    } else if (userObj.role === 'supervisor') {
      navigate('/supervisor');
    } else if (userObj.role === 'mentor') {
      navigate('/mentor');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');

    try {
      await performLogin(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Calls the existing resend-otp endpoint and starts a 60-second cooldown,
  // mirroring the same pattern used on the signup page.
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setOtpMessage('');
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend code. Please try again.');
        return;
      }

      setOtpMessage('A new verification code has been sent to your email.');
      setResendCooldown(60);

      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setError('');
    setOtpMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed. Please try again.');
        return;
      }

      // Verified — finish the login the user originally attempted.
      setOtpMessage('Account verified! Logging you in...');
      await performLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
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

        {otpMessage && (
          <div style={{
            backgroundColor: '#f0fdf4',
            color: '#166534',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>{otpMessage}</span>
          </div>
        )}

        {needsVerification && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', textAlign: 'center', lineHeight: '1.5' }}>
              Enter the 6-digit code sent to <strong style={{ color: '#0f172a' }}>{email}</strong>, or resend it below.
            </p>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '160px',
                  letterSpacing: '6px',
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: '800',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '2px solid #cbd5e1',
                  outline: 'none',
                  color: '#0f172a'
                }}
              />

              <button
                type="submit"
                disabled={isVerifying}
                className="btn-auth"
                style={{ opacity: isVerifying ? 0.7 : 1, cursor: isVerifying ? 'not-allowed' : 'pointer' }}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isResending}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? '#94a3b8' : '#2563eb',
                fontSize: '13px',
                fontWeight: '600',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                textDecoration: resendCooldown > 0 ? 'none' : 'underline'
              }}
            >
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Didn't receive the code? Resend"}
            </button>
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