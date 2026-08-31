import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import heroBg from '../assets/background.png';
import uomLogo from '../assets/uom_logo.png';
import { validateSignUpForm, validateField, getPasswordCriteria } from '../utils/validators';

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
    degreeProgram: '',
    department: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    { value: 'lecturer', label: 'Lecturer' },
    { value: 'admin', label: 'Admin' },
    { value: 'industry mentor', label: 'Industry Mentor' }
  ];

  const passwordCriteria = getPasswordCriteria(formData.password);

  const getAcademicUnit = () => {
    if (formData.role === 'student') {
      return formData.degreeProgram?.trim() || null;
    }

    if (formData.role === 'lecturer') {
      return formData.department?.trim() || null;
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let cleanedValue = value;
    // For phone number: only allow numbers and max 10 digits
    if (name === 'phone') {
      cleanedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    // For universityId: uppercase it for consistency
    if (name === 'universityId') {
      cleanedValue = value.toUpperCase();
    }

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: cleanedValue,
        // Reset universityId when switching away from student role
        ...(name === 'role' && cleanedValue !== 'student' && { universityId: '', degreeProgram: '' }),
        ...(name === 'role' && cleanedValue !== 'lecturer' && { department: '' })
      };

      // Real-time password matching check
      if (name === 'confirmPassword') {
        if (cleanedValue && updated.password && cleanedValue !== updated.password) {
          setFieldErrors(fe => ({ ...fe, confirmPassword: 'Passwords do not match.' }));
        } else {
          setFieldErrors(fe => ({ ...fe, confirmPassword: '' }));
        }
      } else if (name === 'password') {
        if (updated.confirmPassword && cleanedValue && updated.confirmPassword !== cleanedValue) {
          setFieldErrors(fe => ({ ...fe, confirmPassword: 'Passwords do not match.' }));
        } else if (updated.confirmPassword && updated.confirmPassword === cleanedValue) {
          setFieldErrors(fe => ({ ...fe, confirmPassword: '' }));
        }
      }

      return updated;
    });

    // Clear field errors as typing happens (except confirmPassword handled above)
    if (name !== 'confirmPassword') {
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
    if (formData.role === 'student' && !formData.degreeProgram) {
      setFieldErrors(prev => ({ ...prev, degreeProgram: 'Please select your Degree Program.' }));
      return;
    }

    if (formData.role === 'lecturer' && !formData.department) {
      setFieldErrors(prev => ({ ...prev, department: 'Please select your Department.' }));
      return;
    }


    setIsSubmitting(true);

    // PHASE 1: Send registration details and write to database first
    if (!isOtpSent) {
      try {
        const safeAcademicUnit = getAcademicUnit();
        const signupPayload = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          university_id: formData.role === 'student' ? (formData.universityId?.trim() || null) : null,
          phone: formData.phone?.trim() || null,
          academic_unit: safeAcademicUnit && safeAcademicUnit.length > 50 ? safeAcademicUnit.slice(0, 50) : safeAcademicUnit
        };

        const response = await fetch('http://localhost:5000/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupPayload)
        });
        const data = await response.json();

        if (!response.ok) {
          const rawError = data.error || data.message || '';
          if (rawError.toLowerCase().includes('university id') || rawError.toLowerCase().includes('university_id')) {
            setFieldErrors(prev => ({ ...prev, universityId: 'This University ID is already registered. Please login or check your ID.' }));
            throw new Error('This University ID is already registered. Please login or check your ID.');
          } else if (rawError.toLowerCase().includes('email') || rawError.toLowerCase().includes('duplicate') || rawError.toLowerCase().includes('already registered')) {
            setFieldErrors(prev => ({ ...prev, email: 'This email address is already registered. Please use a different email or login.' }));
            throw new Error('This email address is already registered. Please use a different email or login instead.');
          } else {
            throw new Error(rawError || 'Something went wrong while creating your account. Please try again.');
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
                  placeholder="07XXXXXXXX"
                  maxLength={10}
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="auth-input"
                  style={{ paddingLeft: '16px', borderColor: fieldErrors.phone ? '#dc2626' : undefined }}
                />
                {fieldErrors.phone && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.phone}</p>}
              </div>
                
              {/* selecting department/degree */}
              <div className="auth-input-group">
                <label>University ID {formData.role === 'student' && '*'}</label>
                <input
                  name="universityId"
                  type="text"
                  disabled={formData.role !== 'student'}
                  placeholder={formData.role !== 'student' ? 'N/A' : ''}
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

              {['student', 'lecturer'].includes(formData.role) && (
                <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>

                  <label>
                    {formData.role === 'student' ? 'Degree Program *' : 'Department *'}
                  </label>

                  <select
                    name={formData.role === 'student' ? 'degreeProgram' : 'department'}
                    value={formData.role === 'student' ? formData.degreeProgram : formData.department}
                    onChange={handleChange}
                    className="auth-input"
                    style={{ 
                      paddingLeft: '16px', 
                      appearance: 'auto',
                      borderColor: (formData.role === 'student' ? fieldErrors.degreeProgram : fieldErrors.department) ? '#dc2626' : undefined 
                    }}
                  >
                    <option value="">
                      {formData.role === 'student' 
                        ? '-- Select Degree Program --' 
                        : '-- Select Department --'}
                    </option>

                    {formData.role === 'student' && (
                      <>
                        <option value="AI">Artificial Intelligence</option>
                        <option value="IT">Information Technology</option>
                        <option value="ITM">IT Management</option>
                      </>
                    )}

                    {formData.role === 'lecturer' && (
                      <>
                        <option value="IT">IT</option>
                        <option value="IDS">IDS</option>
                        <option value="CM">CM</option>
                      </>
                    )}
                  </select>

                  {formData.role === 'student' && fieldErrors.degreeProgram && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                      {fieldErrors.degreeProgram}
                    </p>
                  )}
                  {formData.role === 'lecturer' && fieldErrors.department && (
                    <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                      {fieldErrors.department}
                    </p>
                  )}
                </div>
              )}

              {/* Row 4: Password & Confirm Password */}
              <div className="auth-input-group">
                <label>Password * <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>(min 8 chars)</span></label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={(e) => {
                      setIsPasswordFocused(false);
                      handleBlur(e);
                    }}
                    className="auth-input"
                    style={{ paddingLeft: '16px', paddingRight: '44px', borderColor: fieldErrors.password ? '#dc2626' : undefined }}
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={18} style={{ position: 'static', transform: 'none', left: 'auto' }} />
                    ) : (
                      <Eye size={18} style={{ position: 'static', transform: 'none', left: 'auto' }} />
                    )}
                  </div>
                </div>
                {fieldErrors.password && <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.password}</p>}

                {/* Password Live Checklist */}
                {(isPasswordFocused || formData.password.length > 0) && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
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
              </div>

              <div className="auth-input-group">
                <label>Confirm Password *</label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="auth-input"
                    style={{ paddingLeft: '16px', paddingRight: '44px', borderColor: fieldErrors.confirmPassword ? '#dc2626' : undefined }}
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} style={{ position: 'static', transform: 'none', left: 'auto' }} />
                    ) : (
                      <Eye size={18} style={{ position: 'static', transform: 'none', left: 'auto' }} />
                    )}
                  </div>
                </div>
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