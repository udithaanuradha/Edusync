import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png';
import { validateSignUpForm, validateField, VALID_ROLES } from '../utils/validators';
import type { SignUpValidationResult } from '../utils/validators';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes with real-time validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Clear university ID when role changes to non-student
      ...(name === 'role' && value !== 'student' && { universityId: '' })
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError('');
    }
  };

  // Real-time field validation on blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value, formData);
    
    if (error) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Handle Form Submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setFieldErrors({});
    setIsSubmitting(true);

    // Comprehensive validation
    const validation = validateSignUpForm(formData);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setIsSubmitting(false);
      return;
    }

    // Prepare payload - convert "industry mentor" back to "industry mentor" for API
    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
      universityId: formData.role === 'student' ? formData.universityId.trim() : undefined
    };

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.details && Array.isArray(data.details)) {
          const backendErrors: Record<string, string> = {};
          data.details.forEach((errorMsg: string) => {
            // Map backend error messages to fields
            if (errorMsg.includes('First name')) backendErrors.firstName = errorMsg;
            else if (errorMsg.includes('Last name')) backendErrors.lastName = errorMsg;
            else if (errorMsg.includes('email')) backendErrors.email = errorMsg;
            else if (errorMsg.includes('password')) backendErrors.password = errorMsg;
            else if (errorMsg.includes('University ID')) backendErrors.universityId = errorMsg;
            else if (errorMsg.includes('role')) backendErrors.role = errorMsg;
            else setSubmitError(errorMsg);
          });
          if (Object.keys(backendErrors).length > 0) {
            setFieldErrors(backendErrors);
          }
        } else {
          setSubmitError(data.error || 'Signup failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      alert("Account created successfully! Please log in.");
      navigate('/login');
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
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
          
          {/* Overall submission error */}
          {submitError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px',
              color: '#991b1b'
            }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px' }}>{submitError}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSignUp}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Role Dropdown */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Select Your Role *
              </label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input" 
                style={{
                  paddingLeft: '16px',
                  width: '100%',
                  appearance: 'auto',
                  borderColor: fieldErrors.role ? '#dc2626' : undefined
                }}
              >
                {VALID_ROLES.map(role => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
              {fieldErrors.role && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.role}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Email Address *
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
                style={{
                  paddingLeft: '16px',
                  borderColor: fieldErrors.email ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.email && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* First Name */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                First Name *
              </label>
              <input
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
                style={{
                  paddingLeft: '16px',
                  borderColor: fieldErrors.firstName ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.firstName && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Last Name *
              </label>
              <input
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
                style={{
                  paddingLeft: '16px',
                  borderColor: fieldErrors.lastName ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.lastName && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.lastName}
                </p>
              )}
            </div>

            {/* Phone Number (optional) */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="auth-input"
                style={{ paddingLeft: '16px' }}
              />
            </div>

            {/* University ID - only for students */}
            {formData.role === 'student' && (
              <div className="signup-field">
                <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                  University ID *
                </label>
                <input
                  name="universityId"
                  type="text"
                  placeholder="e.g., STU2024001"
                  value={formData.universityId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{
                    paddingLeft: '16px',
                    borderColor: fieldErrors.universityId ? '#dc2626' : undefined
                  }}
                />
                {fieldErrors.universityId && (
                  <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                    {fieldErrors.universityId}
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Password * <span style={{ fontSize: '11px', color: '#6b7280' }}>(min 6 chars)</span>
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
                style={{
                  paddingLeft: '16px',
                  borderColor: fieldErrors.password ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.password && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="signup-field">
              <label style={{ fontSize: '12px', fontWeight: '500', marginLeft: '4px' }}>
                Confirm Password *
              </label>
              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className="auth-input"
                style={{
                  paddingLeft: '16px',
                  borderColor: fieldErrors.confirmPassword ? '#dc2626' : undefined
                }}
              />
              {fieldErrors.confirmPassword && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-auth"
            style={{
              marginTop: '30px',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '20px', color: '#6b7280' }}>
            Already have an account? <b style={{ color: '#1f2937', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</b>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;