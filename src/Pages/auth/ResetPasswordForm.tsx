import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, ArrowLeft, Info } from 'lucide-react';
import heroBg from '../../assets/background.png';
import uomLogo from '../../assets/uom_logo.png';
import { validatePassword, getPasswordCriteria } from '../../utils/validators';

const ResetPasswordForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const rawData = atob(token);
        const parsed = JSON.parse(rawData);
        if (parsed.email) {
          setUserEmail(parsed.email);
        }
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          setIsExpired(true);
          setError('This password reset link has expired. Please request a fresh link from the login page.');
        }
      } catch (err) {
        setError('Invalid or corrupt password reset link.');
      }
    }
  }, [token]);

  const passwordCriteria = getPasswordCriteria(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || success || isExpired) return;
    setError('');

    const passError = validatePassword(newPassword);
    if (passError) {
      return setError(passError);
    }

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:5000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left Hero Banner */}
      <div 
        style={{ 
          flex: 1.2, 
          backgroundImage: `url(${heroBg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          position: 'relative' 
        }}
      >
        <div style={{ position: 'absolute', top: '40px', left: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={uomLogo} alt="UOM Logo" style={{ width: '50px', height: 'auto' }} />
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>EDUSYNC</h2>
        </div>
      </div>

      {/* Right Form Card */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '0 80px', 
          backgroundColor: '#ffffff' 
        }}
      >
        <div 
          onClick={() => navigate('/login')} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#6b7280', 
            fontSize: '13px', 
            cursor: 'pointer', 
            marginBottom: '28px',
            width: 'fit-content'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </div>

        <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>
          Set New Password
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px 0' }}>
          Choose a secure password for your EduSync account.
        </p>

        {userEmail && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#1e40af',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <Info size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span>Resetting password for: <strong>{userEmail}</strong></span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
            Password reset successful! Redirecting to login...
          </div>
        )}

        {!isExpired && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* New Password Input */}
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type={showNewPassword ? "text" : "password"} 
                placeholder="New Password" 
                value={newPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 48px 14px 48px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '10px', 
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                required 
              />
              <div 
                onClick={() => setShowNewPassword(!showNewPassword)} 
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            {/* Live Password Criteria Box */}
            {(isPasswordFocused || newPassword.length > 0) && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '-6px'
              }}>
                <span style={{ fontWeight: '600', color: '#475569', marginBottom: '2px' }}>Password Requirements:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.minLength ? '#16a34a' : '#94a3b8' }}>
                  {passwordCriteria.minLength ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span>Minimum 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasUpper ? '#16a34a' : '#94a3b8' }}>
                  {passwordCriteria.hasUpper ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span>At least 1 uppercase letter</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasLower ? '#16a34a' : '#94a3b8' }}>
                  {passwordCriteria.hasLower ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span>At least 1 lowercase letter</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasNumber ? '#16a34a' : '#94a3b8' }}>
                  {passwordCriteria.hasNumber ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span>At least 1 number</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasSpecial ? '#16a34a' : '#94a3b8' }}>
                  {passwordCriteria.hasSpecial ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  <span>At least 1 special character (!@#$%^&*)</span>
                </div>
              </div>
            )}

            {/* Confirm New Password Input */}
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm New Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 48px 14px 48px', 
                  border: confirmPassword && newPassword !== confirmPassword ? '1px solid #dc2626' : '1px solid #e5e7eb', 
                  borderRadius: '10px', 
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                required 
              />
              <div 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            {confirmPassword && newPassword !== confirmPassword && (
              <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '-10px' }}>
                Passwords do not match.
              </span>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting || success}
              style={{
                backgroundColor: '#1f2937',
                color: '#ffffff',
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: isSubmitting || success ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || success ? 0.7 : 1,
                marginTop: '10px'
              }}
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password & Proceed'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordForm;
