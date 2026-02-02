import React from 'react';

interface FormButtonProps {
  type?: 'submit' | 'button';
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'cancel';
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
}

const styles = {
  button: {
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  } as React.CSSProperties,
  fullWidth: {
    width: '100%',
  } as React.CSSProperties,
  primary: {
    background: '#667eea',
    color: 'white',
  } as React.CSSProperties,
  primaryHover: {
    background: '#5568d3',
  } as React.CSSProperties,
  secondary: {
    background: '#e0e0e0',
    color: '#333',
  } as React.CSSProperties,
  secondaryHover: {
    background: '#d0d0d0',
  } as React.CSSProperties,
  cancel: {
    background: 'transparent',
    color: '#666',
    border: '2px solid #e0e0e0',
  } as React.CSSProperties,
  cancelHover: {
    background: '#f5f5f5',
  } as React.CSSProperties,
  disabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.6,
    color: '#666',
  } as React.CSSProperties,
  spinner: {
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
};

// Inject keyframes animation
const styleSheet = document.styleSheets[0];
try {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
} catch (e) {
  // Keyframe already exists
}

export const FormButton: React.FC<FormButtonProps> = ({
  type = 'button',
  loading = false,
  disabled = false,
  variant = 'primary',
  children,
  onClick,
  fullWidth = true,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const variantStyles = {
    primary: isHovered && !disabled ? { ...styles.primary, ...styles.primaryHover } : styles.primary,
    secondary: isHovered && !disabled ? { ...styles.secondary, ...styles.secondaryHover } : styles.secondary,
    cancel: isHovered && !disabled ? { ...styles.cancel, ...styles.cancelHover } : styles.cancel,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.button,
        ...variantStyles[variant],
        ...(fullWidth ? styles.fullWidth : {}),
        ...(disabled || loading ? styles.disabled : {}),
      }}
    >
      {loading && <div style={styles.spinner} />}
      {children}
    </button>
  );
};
