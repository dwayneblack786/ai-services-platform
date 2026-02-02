import React from 'react';

interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  name?: string;
}

const styles = {
  inputGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.9rem',
    fontWeight: 'bold' as const,
    color: '#333',
  } as React.CSSProperties,
  required: {
    color: '#f44336',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  inputError: {
    borderColor: '#f44336',
  } as React.CSSProperties,
  inputDisabled: {
    background: '#f5f5f5',
    cursor: 'not-allowed',
    color: '#999',
  } as React.CSSProperties,
  errorText: {
    display: 'block',
    marginTop: '4px',
    fontSize: '0.85rem',
    color: '#f44336',
  } as React.CSSProperties,
};

export const FormInput: React.FC<FormInputProps> = ({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  name,
}) => {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        autoComplete={autoComplete}
        name={name}
        style={{
          ...styles.input,
          ...(error ? styles.inputError : {}),
          ...(disabled ? styles.inputDisabled : {}),
        }}
      />
      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
};
