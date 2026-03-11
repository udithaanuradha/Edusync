import React, { InputHTMLAttributes } from 'react';
import './InputField.css';

// We extend standard HTML input props so you can use onChange, value, type, etc.
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string; // Optional error message to display in red
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  error, 
  id, 
  className = '', 
  ...props 
}) => {
  // Generate a random ID if one isn't provided, so the label clicks correctly
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`input-wrapper ${className}`}>
      {/* The Label */}
      <label htmlFor={inputId} className="input-label">
        {label}
      </label>
      
      {/* The Actual Input Box */}
      <input 
        id={inputId}
        className={`shared-input ${error ? 'input-error' : ''}`}
        {...props} 
      />
      
      {/* The Error Message (only shows if there is an error) */}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
};

export default InputField;