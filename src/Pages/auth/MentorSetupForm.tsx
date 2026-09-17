import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Info, CheckCircle } from 'lucide-react';
import heroBg from '../../assets/background.png';
import { validatePassword, getPasswordCriteria } from '../../utils/validators';

const MentorSetupForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decodedStr = atob(token);
        const parsed = JSON.parse(decodedStr);
        if (parsed.email) {
          setInvitedEmail(parsed.email);
          setUsername(parsed.email);
        }
      } catch (err) {
        console.error('Failed to parse mentor setup token:', err);
      }
    }
  }, [token]);

  const passwordCriteria = getPasswordCriteria(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || success) return;
    setError('');

    const passError = validatePassword(password);
    if (passError) {
      setFieldErrors(prev => ({ ...prev, password: passError }));
      return setError(passError);
    }
    if (password !== confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      return setError('Passwords do not match.');
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:5000/api/admin/mentors/finalize-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username: invitedEmail || username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize account.');

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container" style={{ backgroundImage: `url(${heroBg})` }}>
      <div className="auth-overlay"></div>

      <div className="auth-card" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="/edusync-logo.svg" alt="EduSync Logo" style={{ height: '76px', width: 'auto' }} />
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '8px', color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
          Mentor Setup
        </h2>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', margin: '0 0 24px 0', lineHeight: '1.4' }}>
          Configure your preferences to access the platform.
        </p>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#991b1b', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '18px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: '#dcfce7', 
            color: '#166534', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '18px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>Setup Successful! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="auth-input-group" style={{ marginBottom: '8px' }}>
              <User size={20} />
              <input 
                type="email" 
                placeholder="INVITED EMAIL ADDRESS" 
                className="auth-input" 
                value={invitedEmail || username}
                readOnly
                style={{ backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }}
                required 
              />
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#1e40af'
            }}>
              <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
                You must use this invited email address (<strong>{invitedEmail || username || 'your invitation email'}</strong>) to setup your account.
              </p>
            </div>
          </div>

          <div>
            <div className="auth-input-group" style={{ position: 'relative', marginBottom: fieldErrors.password ? '4px' : '0' }}>
              <Lock size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="PASSWORD" 
                className="auth-input" 
                value={password}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  if (confirmPassword && val !== confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                  } else {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                style={{ 
                  paddingRight: '44px',
                  border: fieldErrors.password ? '1px solid #dc2626' : undefined
                }}
                required 
              />
              <div 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#6b7280',
                  zIndex: 2
                }}
              >
                {showPassword 
                  ? <EyeOff size={20} style={{ position: 'static', transform: 'none', left: 'auto' }} /> 
                  : <Eye size={20} style={{ position: 'static', transform: 'none', left: 'auto' }} />}
              </div>
            </div>
            {fieldErrors.password && (
              <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>{fieldErrors.password}</p>
            )}
          </div>

          {(isPasswordFocused || password.length > 0) && (
            <div style={{
              marginTop: '-4px',
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}>
              <span style={{ fontWeight: '600', color: '#475569', marginBottom: '2px' }}>Password must contain:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.minLength ? '#16a34a' : '#64748b' }}>
                <span style={{ fontWeight: 'bold' }}>{passwordCriteria.minLength ? '✓' : '○'}</span>
                <span>Minimum 8 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasUpper ? '#16a34a' : '#64748b' }}>
                <span style={{ fontWeight: 'bold' }}>{passwordCriteria.hasUpper ? '✓' : '○'}</span>
                <span>At least 1 uppercase letter (A-Z)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasLower ? '#16a34a' : '#64748b' }}>
                <span style={{ fontWeight: 'bold' }}>{passwordCriteria.hasLower ? '✓' : '○'}</span>
                <span>At least 1 lowercase letter (a-z)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasNumber ? '#16a34a' : '#64748b' }}>
                <span style={{ fontWeight: 'bold' }}>{passwordCriteria.hasNumber ? '✓' : '○'}</span>
                <span>At least 1 number (0-9)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordCriteria.hasSpecial ? '#16a34a' : '#64748b' }}>
                <span style={{ fontWeight: 'bold' }}>{passwordCriteria.hasSpecial ? '✓' : '○'}</span>
                <span>At least 1 special character (!@#$%^&*)</span>
              </div>
            </div>
          )}

          <div>
            <div className="auth-input-group" style={{ position: 'relative', marginBottom: fieldErrors.confirmPassword ? '4px' : '0' }}>
              <Lock size={20} />
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="CONFIRM PASSWORD" 
                className="auth-input" 
                value={confirmPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfirmPassword(val);
                  if (val && val !== password) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
                  } else {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                style={{ 
                  paddingRight: '44px',
                  border: fieldErrors.confirmPassword ? '1px solid #dc2626' : undefined
                }}
                required 
              />
              <div 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#6b7280',
                  zIndex: 2
                }}
              >
                {showConfirmPassword 
                  ? <EyeOff size={20} style={{ position: 'static', transform: 'none', left: 'auto' }} /> 
                  : <Eye size={20} style={{ position: 'static', transform: 'none', left: 'auto' }} />}
              </div>
            </div>
            {fieldErrors.confirmPassword && (
              <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0 0' }}>{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-auth" 
            disabled={isSubmitting} 
            style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Setting Up...' : 'CREATE PROFILE & LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorSetupForm;