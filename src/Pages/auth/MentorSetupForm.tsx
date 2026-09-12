import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Info } from 'lucide-react';
import heroBg from '../../assets/background.png';
import uomLogo from '../../assets/uom_logo.png';
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
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1.2, backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '40px', left: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={uomLogo} alt="UOM Logo" style={{ width: '50px', height: 'auto' }} />
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>EDUSYNC</h2>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>Mentor Setup</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 32px 0' }}>Configure your preferences to access the platform.</p>

        {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}
        {success && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>Setup Successful! Please use this email to log in...</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type="email" 
                placeholder="Invited Email Address" 
                value={invitedEmail || username}
                readOnly
                style={{ 
                  width: '100%', 
                  padding: '14px 16px 14px 48px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '10px', 
                  fontSize: '14px',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  cursor: 'not-allowed'
                }}
                required 
              />
            </div>
            
            {/* Informative notice indicating they must use this invited email to log in */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#1e40af'
            }}>
              <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
                You must use this invited email address (<strong>{invitedEmail || username || 'your invitation email'}</strong>) to setup your account and login to the system.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
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
                width: '100%', 
                padding: '14px 48px 14px 48px', 
                border: fieldErrors.password ? '1px solid #dc2626' : '1px solid #e5e7eb', 
                borderRadius: '10px', 
                fontSize: '14px' 
              }}
              required 
            />
            <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {fieldErrors.password && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '-12px', marginBottom: '0' }}>{fieldErrors.password}</p>}

          {/* Password Live Checklist */}
          {(isPasswordFocused || password.length > 0) && (
            <div style={{
              marginTop: '-8px',
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
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

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Confirm Password" 
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
                width: '100%', 
                padding: '14px 48px 14px 48px', 
                border: fieldErrors.confirmPassword ? '1px solid #dc2626' : '1px solid #e5e7eb', 
                borderRadius: '10px', 
                fontSize: '14px' 
              }}
              required 
            />
            <div onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}>
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
          {fieldErrors.confirmPassword && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '-12px', marginBottom: '0' }}>{fieldErrors.confirmPassword}</p>}

          <button type="submit" className="btn-auth" disabled={isSubmitting} style={{ cursor: 'pointer' }}>
            {isSubmitting ? 'Setting Up...' : 'CREATE PROFILE & LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorSetupForm;