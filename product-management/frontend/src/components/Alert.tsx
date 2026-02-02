import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  onClose?: () => void;
}

const icons = {
  success: '✓',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const colors = {
  success: { bg: '#e8f5e9', border: '#4CAF50', text: '#2E7D32' },
  error: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
  warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
  info: { bg: '#e3f2fd', border: '#2196F3', text: '#1565c0' },
};

export const Alert: React.FC<AlertProps> = ({ type, message, details, onClose }) => {
  const color = colors[type];

  const styles = {
    alert: {
      padding: '16px',
      background: color.bg,
      border: `2px solid ${color.border}`,
      borderRadius: '8px',
      marginBottom: '20px',
      color: color.text,
      position: 'relative' as const,
    } as React.CSSProperties,
    content: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    } as React.CSSProperties,
    icon: {
      fontSize: '1.5rem',
      flexShrink: 0,
    } as React.CSSProperties,
    textContainer: {
      flex: 1,
    } as React.CSSProperties,
    message: {
      margin: 0,
      fontWeight: 'bold' as const,
    } as React.CSSProperties,
    details: {
      margin: '8px 0 0',
      fontSize: '0.9rem',
    } as React.CSSProperties,
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.2rem',
      cursor: 'pointer',
      color: color.text,
      padding: '0 4px',
      lineHeight: '1',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.alert}>
      <div style={styles.content}>
        <span style={styles.icon}>{icons[type]}</span>
        <div style={styles.textContainer}>
          <p style={styles.message}>{message}</p>
          {details && <p style={styles.details}>{details}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </div>
  );
};
