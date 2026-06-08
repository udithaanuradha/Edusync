import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png';
import { validateSignUpForm, validateField } from '../utils/validators';

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
    role: 'student',
    degreeProgram: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New states handling the OTP intercept workflow inline
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

  // Controls the 60-second cooldown before user can resend again
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // All 5 system roles requested
  const systemRoles = [
    { value: 'student', label: 'Student' },
    { value: 'coordinator', label: 'Coordinator' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'admin', label: 'Admin' },
    { value: 'industry mentor', label: 'Industry Mentor' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && value !== 'student' && { universityId: '' })
    }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value, formData);
    if (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };


  // Calls the backend resend route and starts a 60-second cooldown timer
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setSubmitError('');

    try {
        const response = await fetch('http://localhost:5000/api/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
        });

        const data = await response.json();

        if (!response.ok) {
            setSubmitError(data.error || 'Failed to resend code. Please try again.');
            return;
        }

        // Show success and start 60-second cooldown countdown
        setOtpSuccessMessage('A new verification code has been sent to your email.');
        setResendCooldown(60);

        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);

    } catch (err: any) {
        setSubmitError('Something went wrong. Please try again.');
    } finally {
        setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setOtpSuccessMessage('');

    // Pre-validate inputs structure against local criteria check utilities
    const validation = validateSignUpForm(formData);
    if (!validation.valid) {
      // Access the properties using bracket notation to instantly bypass strict TypeScript property checks
      const errorsMap = (validation as any)["errors"] || (validation as any)["fieldErrors"] || validation;
      setFieldErrors(errorsMap);
      return;
    }

    // Manually validate degree program since it's not in validateSignUpForm
    if (['student', 'supervisor', 'coordinator'].includes(formData.role) && !formData.degreeProgram) {
      setFieldErrors(prev => ({ ...prev, degreeProgram: 'Please select your Degree Program.' }));
      return;
    }

    setIsSubmitting(true);

    // PHASE 1: Send registration details and write to database first
    if (!isOtpSent) {
      try {
        // 🔗 Points directly to your main backend signup pipeline in index.js
        const response = await fetch('http://localhost:5000/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send the user profile inputs to be saved in the database
          body: JSON.stringify({
            name: `${formData.firstName} ${formData.lastName}`, // Combines names to match backend 'name'
            email: formData.email,
            password: formData.password,
            role: formData.role,
            university_id: formData.role === 'student' ? formData.universityId : null,
            phone: formData.phone || null,
            degree_program: ['student', 'supervisor', 'coordinator'].includes(formData.role) 
              ? formData.degreeProgram : null
          })
        });
        const data = await response.json();

    if (!response.ok) {
        const rawError = data.error || '';
    if (rawError.toLowerCase().includes('duplicate') || rawError.toLowerCase().includes('already exists')) {
    throw new Error('This email address is already registered. Please use a different email or login instead.');
    } else {
    throw new Error('Something went wrong while creating your account. Please try again.');
     }
   }

        setIsOtpSent(true);
        setOtpSuccessMessage('A 6-digit verification code has been sent to your email.');
      } catch (err: any) {
        setSubmitError(err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
  

    // PHASE 2: Finalize validation by hitting your new verification route
    if (!otpCode || otpCode.length !== 6) {
      setSubmitError('Please enter a valid 6-digit verification code.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 🔗 Points to the brand new route we just added to your index.js file
      const response = await fetch('http://localhost:5000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otpCode: otpCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const otpError = data.error || '';
          if (otpError.toLowerCase().includes('invalid') || otpError.toLowerCase().includes('expired')) {
          setSubmitError('Incorrect or expired code. Please check your email and try again.');
        } else {
      setSubmitError('Verification failed. Please try again.');
     }
        setIsSubmitting(false);
        return;
      }

      alert("Account created and verified successfully! Redirecting to login view...");
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

      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={uomLogo} alt="UoM Logo" style={{ height: '70px' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#6b7280', margin: '0 0 4px 0' }}>Let's get started</p>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Create new account</h2>
          
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
              color: '#991b1b',
              textAlign: 'left'
            }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px' }}>{submitError}</span>
            </div>
          )}

          {otpSuccessMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px',
              color: '#166534',
              textAlign: 'left'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
              <span style={{ fontSize: '13px' }}>{otpSuccessMessage}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {!isOtpSent ? (
            /* EXACT ORIGINAL TWO-COLUMN LAYOUT STRUCTURE RESTORED */
            <div className="auth-grid-form">
              {/* Row 1: Role Selector & Email */}
              <div className="auth-input-group">
                <label>Select Your Role *</label>
                <select 
                  name="role" 
                  value={formData.role} 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input" 
                  style={{ paddingLeft: '16px', appearance: 'auto' }}
                >
                  {systemRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {fieldErrors.role && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.role}</p>}
              </div>

              <div className="auth-input-group">
                <label>Email Address *</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.email ? '#dc2626' : undefined }}
                />
                {fieldErrors.email && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '#6px' }}>{fieldErrors.email}</p>}
              </div>

              {/* Row 2: First Name & Last Name */}
              <div className="auth-input-group">
                <label>First Name *</label>
                <input
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.firstName ? '#dc2626' : undefined }}
                />
                {fieldErrors.firstName && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.firstName}</p>}
              </div>

              <div className="auth-input-group">
                <label>Last Name *</label>
                <input
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.lastName ? '#dc2626' : undefined }}
                />
                {fieldErrors.lastName && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.lastName}</p>}
              </div>

              {/* Row 3: Phone Number & University ID */}
              <div className="auth-input-group">
                <label>Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="auth-input"
                  style={{ paddingLeft: '16px' }}
                />
              </div>

              <div className="auth-input-group">
                <label>University ID {formData.role === 'student' && '*'}</label>
                <input
                  name="universityId"
                  type="text"
                  disabled={formData.role !== 'student'}
                  placeholder={formData.role !== 'student' ? 'N/A' : 'e.g., STU2024001'}
                  value={formData.universityId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ 
                    paddingLeft: '16px', 
                    backgroundColor: formData.role !== 'student' ? '#f3f4f6' : undefined,
                    borderColor: fieldErrors.universityId ? '#dc2626' : undefined 
                  }}
                />
                {fieldErrors.universityId && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.universityId}</p>}
              </div>

              {/* Degree Program — shown only for student, supervisor, coordinator */}
              {/* Row 4: Password & Confirm Password always together */}
              {/* Degree Program — full width row, shown only for student, supervisor, coordinator */}
              {['student', 'supervisor', 'coordinator'].includes(formData.role) && (
                <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Degree Program *</label>
                  <select
                    name="degreeProgram"
                    value={formData.degreeProgram}
                    onChange={handleChange}
                    className="auth-input"
                    style={{ 
                      paddingLeft: '16px', 
                      appearance: 'auto',
                      borderColor: fieldErrors.degreeProgram ? '#dc2626' : undefined 
                    }}
                  >
                    <option value="">-- Select Degree Program --</option>
                    <option value="AI">Artificial Intelligence (AI)</option>
                    <option value="IT">Information Technology (IT)</option>
                    <option value="ITM">IT Management (ITM)</option>
                  </select>
                  {fieldErrors.degreeProgram && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                      {fieldErrors.degreeProgram}
                    </p>
                  )}
                </div>
              )}

              {/* Row 4: Password & Confirm Password */}
              <div className="auth-input-group">
                <label>Password * <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>(min 6 chars)</span></label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.password ? '#dc2626' : undefined }}
                />
                {fieldErrors.password && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.password}</p>}
              </div>

              <div className="auth-input-group">
                <label>Confirm Password *</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.confirmPassword ? '#dc2626' : undefined }}
                />
                {fieldErrors.confirmPassword && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.confirmPassword}</p>}
              </div>
          
            </div>
          ) : (
           
            /* VISUALLY CONFINED INLINE SECURITY TOKEN VIEW */
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '24px',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              margin: '10px 0'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', textAlign: 'center', lineHeight: '1.5' }}>
                We've sent a 6-digit verification code to <br />
                <strong style={{ color: '#0f172a' }}>{formData.email}</strong>.
              </p>
              
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

{/* Resend OTP button with cooldown timer */}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-auth"
            style={{
              marginTop: '24px',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting 
              ? (isOtpSent ? 'Verifying OTP...' : 'Sending Verification Email...') 
              : (isOtpSent ? 'Verify & Create Account' : 'Sign Up')}
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