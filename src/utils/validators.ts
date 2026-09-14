/**
 * Frontend Validation Utilities for Edusync
 * Mirrors backend validation rules for consistency
 * Three-layer validation pattern: Frontend → Backend → Database
 */

// Strict whitelist of valid user roles - must match backend exactly
export const VALID_ROLES = ['student', 'supervisor', 'coordinator', 'admin', 'industry mentor','lecturer' ];

// Strict whitelist of valid student departments - must match backend exactly.
// This is the same 3-option "Degree Program" already collected on this form
// for students (see the role === 'student' <select> below) — group-formation
// department scoping reuses it rather than a second, separate field. Note
// this is NOT the same list a lecturer picks from (IT/IDS/CM) even though
// both are labeled "Department" in the UI and stored in the same backend
// column — this whitelist applies only to the student role.
export const VALID_DEPARTMENTS = ['AI', 'IT', 'ITM'];

/**
 * Validates a student department/degree-program code against the whitelist.
 */
export function validateDepartment(department: string): string {
  if (!department || typeof department !== 'string') {
    return 'Department is required for students';
  }

  if (!VALID_DEPARTMENTS.includes(department.toUpperCase().trim())) {
    return `Invalid department. Allowed departments are: ${VALID_DEPARTMENTS.join(', ')}`;
  }

  return '';
}

/**
 * Validates if a role string is in the allowed roles list
 */
export function validateRole(role: string): boolean {
  if (!role || typeof role !== 'string') {
    return false;
  }
  return VALID_ROLES.includes(role.toLowerCase().trim());
}

/**
 * Validates email format
 * Must be valid email format e.g. medini@gmail.com or edirisinghmw.23@uom.lk
 */
export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return 'Email is required';
  }

  const trimmed = email.trim();
  // Valid email pattern with proper domain and TLD (e.g., @gmail.com or @uom.lk)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g., name@gmail.com or name.23@uom.lk)';
  }

  return '';
}

/**
 * Validates phone number format
 * Must contain exactly 10 digits (e.g., 07XXXXXXXX), letters rejected
 */
export function validatePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''; // Phone is optional if not provided
  }

  const trimmed = phone.trim();
  if (trimmed === '') return '';

  // Check if it contains only digits and is exactly 10 digits long
  if (!/^\d+$/.test(trimmed)) {
    return 'Phone number must contain only numbers (letters and symbols are rejected)';
  }

  if (trimmed.length !== 10) {
    return 'Phone number must contain exactly 10 digits (e.g., 07XXXXXXXX)';
  }

  return '';
}

/**
 * Password strength checklist helper
 */
export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function getPasswordCriteria(password: string): PasswordCriteria {
  const p = password || '';
  const minLength = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_~`+=\\/\-[\]]/.test(p);

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

/**
 * Validates password strength:
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
 */
export function validatePassword(password: string): string {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }

  const criteria = getPasswordCriteria(password);

  if (!criteria.minLength) {
    return 'Password must be at least 8 characters long';
  }
  if (!criteria.hasUpper) {
    return 'Password must contain at least 1 uppercase letter (A-Z)';
  }
  if (!criteria.hasLower) {
    return 'Password must contain at least 1 lowercase letter (a-z)';
  }
  if (!criteria.hasNumber) {
    return 'Password must contain at least 1 number (0-9)';
  }
  if (!criteria.hasSpecial) {
    return 'Password must contain at least 1 special character (!@#$%^&*)';
  }

  return '';
}

/**
 * Validates password confirmation
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return '';
}

/**
 * Validates a name field (firstName or lastName)
 */
export function validateName(name: string, fieldName: string): string {
  if (!name || typeof name !== 'string') {
    return `${fieldName} is required`;
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }

  // Only allow letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }

  return '';
}

/**
 * Validates university ID format:
 * Must contain 6 digits followed by a character (e.g., 235020G or XX1234K)
 */
export function validateUniversityId(universityId: string): string {
  if (!universityId || typeof universityId !== 'string') {
    return 'University ID is required for students';
  }

  const trimmed = universityId.trim();
  if (!trimmed) {
    return 'University ID is required for students';
  }

  // Structure check: 6 digits followed by 1 letter (total 7 chars, e.g. 235020G)
  const uniIdRegex = /^\d{6}[a-zA-Z]$/;
  if (!uniIdRegex.test(trimmed)) {
    return 'University ID must contain 6 numbers followed by 1 letter';
  }

  return '';
}

/**
 * Comprehensive validation for signup form
 * Returns object with field-level errors and overall validity
 */
export interface SignUpValidationResult {
  valid: boolean;
  fieldErrors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    universityId?: string;
    degreeProgram?: string;
  };
}

export function validateSignUpForm(formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: string;
  universityId?: string;
  degreeProgram?: string;
}): SignUpValidationResult {
  const fieldErrors: SignUpValidationResult['fieldErrors'] = {};

  // Validate first name
  const firstNameError = validateName(formData.firstName, 'First name');
  if (firstNameError) fieldErrors.firstName = firstNameError;

  // Validate last name
  const lastNameError = validateName(formData.lastName, 'Last name');
  if (lastNameError) fieldErrors.lastName = lastNameError;

  // Validate email
  const emailError = validateEmail(formData.email);
  if (emailError) fieldErrors.email = emailError;

  // Validate phone (if provided or role requirements)
  if (formData.phone && formData.phone.trim() !== '') {
    const phoneError = validatePhone(formData.phone);
    if (phoneError) fieldErrors.phone = phoneError;
  }

  // Validate role
  if (!validateRole(formData.role)) {
    fieldErrors.role = `Invalid role. Allowed roles are: ${VALID_ROLES.join(', ')}`;
  }

  // Validate password
  const passwordError = validatePassword(formData.password);
  if (passwordError) fieldErrors.password = passwordError;

  // Validate password match
  const passwordMatchError = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (passwordMatchError) fieldErrors.confirmPassword = passwordMatchError;

  // Validate university ID for students
  if (formData.role === 'student') {
    const uniIdError = validateUniversityId(formData.universityId || '');
    if (uniIdError) fieldErrors.universityId = uniIdError;
  }

  // Validate department (Degree Program) for students
  if (formData.role === 'student') {
    const departmentError = validateDepartment(formData.degreeProgram || '');
    if (departmentError) fieldErrors.degreeProgram = departmentError;
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

/**
 * Validates a single field (useful for real-time validation)
 */
export function validateField(
  fieldName: string,
  value: string,
  formData?: any
): string {
  switch (fieldName) {
    case 'firstName':
      return validateName(value, 'First name');
    case 'lastName':
      return validateName(value, 'Last name');
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validatePhone(value);
    case 'password':
      return validatePassword(value);
    case 'confirmPassword':
      return formData?.password
        ? validatePasswordMatch(formData.password, value)
        : '';
    case 'role':
      return validateRole(value)
        ? ''
        : `Invalid role. Allowed roles are: ${VALID_ROLES.join(', ')}`;
    case 'universityId':
      return validateUniversityId(value);
    case 'degreeProgram':
      return validateDepartment(value);
    default:
      return '';
  }
}

