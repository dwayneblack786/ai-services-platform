import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  small: 24,
  medium: 48,
  large: 64,
};

// Inject keyframes animation if not already present
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

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false,
}) => {
  const spinnerSize = sizeMap[size];

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      ...(fullScreen
        ? {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.9)',
            zIndex: 9999,
          }
        : {
            padding: '20px',
          }),
    } as React.CSSProperties,
    spinner: {
      border: `4px solid rgba(102, 126, 234, 0.2)`,
      borderTop: `4px solid #667eea`,
      borderRadius: '50%',
      width: `${spinnerSize}px`,
      height: `${spinnerSize}px`,
      animation: 'spin 0.8s linear infinite',
    } as React.CSSProperties,
    message: {
      fontSize: '1rem',
      color: '#666',
      textAlign: 'center' as const,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};
