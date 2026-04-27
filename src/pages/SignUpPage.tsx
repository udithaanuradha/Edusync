import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png';

const STUDENT_ID_REGEX = /^\d{6}[A-Za-z]$/;

const normalizeStudentId = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [universityIdError, setUniversityIdError] = useState('');
  
  // 1. State for form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    universityId: '',
    role: 'student'
  });

  // 2. Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'universityId') {
      const normalizedValue = normalizeStudentId(value);
      setFormData({ ...formData, universityId: normalizedValue });
      if (universityIdError) {
        setUniversityIdError('');
      }
      return;
    }

    if (name === 'role' && value !== 'student') {
      setUniversityIdError('');
      setFormData({ ...formData, role: value, universityId: '' });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const validateStudentUniversityId = (value: string) => {
    if (!value) {
      return 'University ID is required for student role.';
    }

    if (!STUDENT_ID_REGEX.test(value)) {
      return 'Invalid format. Use 6 digits followed by 1 letter (example: 123456A).';
    }

    return '';
  };

  // 3. Handle Form Submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUniversityIdError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    const normalizedUniversityId = normalizeStudentId(formData.universityId);

    if (formData.role === 'student') {
      const idValidationError = validateStudentUniversityId(normalizedUniversityId);
      if (idValidationError) {
        setUniversityIdError(idValidationError);
        return;
      }
    }

    const payload = {
      ...formData,
      universityId: formData.role === 'student' ? normalizedUniversityId : '',
    };

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');

      alert("Account created successfully! Please log in.");
      navigate('/login');
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

      <div className="auth-card" style={{ maxWidth: '768px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={uomLogo} alt="UoM Logo" style={{ height: '70px' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#6b7280' }}>Let's get started</p>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Create new account</h2>
          {error && <p style={{ color: 'red', fontSize: '12px', marginTop: '10px' }}>{error}</p>}
        </div>

        <form onSubmit={handleSignUp}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Select Your Role</label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange} 
                className="auth-input" 
                style={{ paddingLeft: '16px', width: '100%', appearance: 'auto' }}
              >
                <option value="student">Student</option>
                <option value="supervisor">Supervisor</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Admin</option>
                <option value="mentor">Industry Mentor</option>
              </select>
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Email Address</label>
              <input name="email" type="email" required onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>First Name</label>
              <input name="firstName" type="text" required onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Last Name</label>
              <input name="lastName" type="text" required onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Phone Number</label>
              <input name="phone" type="tel" onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>

            {/* Only show University ID if the role is student */}
            <div className="signup-field">
              {formData.role === 'student' && (
                <>
                  <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>University ID</label>
                  <input 
                    name="universityId" 
                    type="text" 
                    placeholder="e.g., 123456A" 
                    maxLength={7}
                    value={formData.universityId}
                    onChange={handleChange} 
                    onBlur={() => setUniversityIdError(validateStudentUniversityId(formData.universityId))}
                    className="auth-input" 
                    style={{ paddingLeft: '16px' }} 
                  />
                  {universityIdError && (
                    <p style={{ color: 'red', fontSize: '12px', marginTop: '6px' }}>{universityIdError}</p>
                  )}
                </>
              )}
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Password</label>
              <input name="password" type="password" required onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
            </div>

            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>Confirm Password</label>
              <input name="confirmPassword" type="password" required onChange={handleChange} className="auth-input" style={{ paddingLeft: '16px' }} />
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