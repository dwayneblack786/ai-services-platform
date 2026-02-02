import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/apiClient';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [needsCompanyDetails, setNeedsCompanyDetails] = useState(false);
  const [tenantId, setTenantId] = useState('');
  
  // Prevent duplicate verification calls in React 18 Strict Mode
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    // Only verify once
    if (!hasVerified.current) {
      hasVerified.current = true;
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await apiClient.post('/api/auth/verify-email', { token });
     console.log('Email verification response:', response.data);
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
        setNeedsCompanyDetails(response.data.needsCompanyDetails || false);
        setTenantId(response.data.tenantId || '');
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          if (response.data.needsCompanyDetails) {
            navigate(`/complete-company-details?tenantId=${response.data.tenantId}`);
          } else {
            navigate('/dashboard');
          }
        }, 3000);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Verification failed');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      padding: '60px 40px',
      maxWidth: '500px',
      width: '100%',
      textAlign: 'center' as const
    },
    icon: {
      fontSize: '4rem',
      marginBottom: '20px'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '16px',
      color: '#333'
    },
    message: {
      fontSize: '1.1rem',
      color: '#666',
      marginBottom: '32px',
      lineHeight: '1.6'
    },
    button: {
      padding: '14px 32px',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: 'bold' as const,
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
      transition: 'background 0.2s'
    },
    spinner: {
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #667eea',
      borderRadius: '50%',
      width: '60px',
      height: '60px',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 20px'
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.card}>
        {status === 'verifying' && (
          <>
            <div style={styles.spinner}></div>
            <h1 style={styles.title}>Verifying Email...</h1>
            <p style={styles.message}>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={styles.icon}>✅</div>
            <h1 style={styles.title}>Email Verified!</h1>
            <p style={styles.message}>
              {message}
              {needsCompanyDetails && (
                <><br/><br/>You will be redirected to complete your company details...</>
              )}
              {!needsCompanyDetails && (
                <><br/><br/>Redirecting to dashboard...</>
              )}
            </p>
            <button
              onClick={() => {
                if (needsCompanyDetails) {
                  navigate(`/complete-company-details?tenantId=${tenantId}`);
                } else {
                  navigate('/dashboard');
                }
              }}
              style={styles.button}
            >
              {needsCompanyDetails ? 'Complete Company Details' : 'Go to Dashboard'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.icon}>❌</div>
            <h1 style={styles.title}>Verification Failed</h1>
            <p style={styles.message}>{message}</p>
            <Link to="/login" style={styles.button}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
