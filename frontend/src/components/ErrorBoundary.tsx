import React, { Component, ReactNode } from 'react';
import apiClient from '../services/apiClient';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void, circuitState?: string) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  circuitState: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      circuitState: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a circuit breaker error
    const circuitState = apiClient.getCircuitState();
    
    this.setState({
      error,
      errorInfo,
      circuitState: circuitState.state
    });

    // Log to error reporting service (e.g., Sentry) in production
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        circuitState
      });
    }
  }

  handleRetry = () => {
    // Reset circuit if it's open
    if (this.state.circuitState === 'OPEN') {
      apiClient.resetCircuit();
    }

    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      circuitState: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.handleRetry,
          this.state.circuitState || undefined
        );
      }

      // Default error UI
      return <DefaultErrorFallback 
        error={this.state.error!}
        circuitState={this.state.circuitState}
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  circuitState: string | null;
  onRetry: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ 
  error, 
  circuitState, 
  onRetry 
}) => {
  const isCircuitOpen = circuitState === 'OPEN';
  const isCircuitHalfOpen = circuitState === 'HALF_OPEN';

  return (
    <div style={styles.container}>
      <div style={styles.errorBox}>
        <div style={styles.iconContainer}>
          {isCircuitOpen ? (
            <span style={styles.circuitIcon}>⚠️</span>
          ) : (
            <span style={styles.errorIcon}>❌</span>
          )}
        </div>

        <h1 style={styles.title}>
          {isCircuitOpen 
            ? 'Service Temporarily Unavailable' 
            : 'Something Went Wrong'}
        </h1>

        <p style={styles.message}>
          {isCircuitOpen ? (
            <>
              Our backend service is currently experiencing issues. 
              The circuit breaker has been activated to protect the system.
              <br /><br />
              <strong>What this means:</strong> The service is temporarily paused 
              to prevent cascading failures and will automatically attempt to recover.
            </>
          ) : isCircuitHalfOpen ? (
            <>
              The service is attempting to recover. Please wait a moment and try again.
            </>
          ) : (
            <>
              We encountered an unexpected error. This has been logged and our team 
              will investigate.
            </>
          )}
        </p>

        {import.meta.env.DEV && (
          <details style={styles.errorDetails}>
            <summary style={styles.errorSummary}>Technical Details (Dev Mode)</summary>
            <div style={styles.errorContent}>
              <p><strong>Error:</strong> {error.message}</p>
              <p><strong>Circuit State:</strong> {circuitState || 'N/A'}</p>
              {error.stack && (
                <pre style={styles.stackTrace}>{error.stack}</pre>
              )}
            </div>
          </details>
        )}

        <div style={styles.buttonContainer}>
          <button onClick={onRetry} style={styles.retryButton}>
            🔄 Try Again
          </button>
          
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            style={styles.homeButton}
          >
            🏠 Go to Dashboard
          </button>
        </div>

        {isCircuitOpen && (
          <div style={styles.statusBox}>
            <strong>🔧 Status Update:</strong>
            <p style={{ margin: '8px 0 0' }}>
              The system will automatically retry in a few seconds. 
              You can also manually retry using the button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  errorBox: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const
  },
  iconContainer: {
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '64px'
  },
  circuitIcon: {
    fontSize: '64px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '16px'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '24px'
  },
  errorDetails: {
    marginTop: '24px',
    marginBottom: '24px',
    textAlign: 'left' as const,
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },
  errorSummary: {
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    color: '#495057',
    marginBottom: '12px'
  },
  errorContent: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#6c757d'
  },
  stackTrace: {
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
    maxHeight: '200px'
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px'
  },
  retryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#0056b3'
    }
  },
  homeButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#5a6268'
    }
  },
  statusBox: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    border: '1px solid #ffc107',
    color: '#856404',
    textAlign: 'left' as const,
    fontSize: '14px'
  }
};

export default ErrorBoundary;
