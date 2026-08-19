import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import heroBg from '../../assets/background.png';
import uomLogo from '../../assets/uom_logo.png';

const MentorSetupForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || success) return;
    setError('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:5000/api/admin/mentors/finalize-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize account.');

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);

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
        {success && <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>Setup Successful! Redirecting to login...</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Choose Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '14px 48px 14px 48px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              required 
            />
            <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6b7280' }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              required 
            />
          </div>

          <button type="submit" className="btn-auth" disabled={isSubmitting} style={{ cursor: 'pointer' }}>
            {isSubmitting ? 'Setting Up...' : 'CREATE PROFILE & LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorSetupForm;