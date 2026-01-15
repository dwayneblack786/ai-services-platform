import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { styles } from '../styles/Login.styles';

const Login = () => {
  const { user, loading: authLoading, login, devLogin, emailLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDev = import.meta.env.DEV;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || searchParams.get('redirect') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl, { replace: true });
    }
  }, [user, authLoading, navigate, searchParams]);

  useEffect(() => {
    // Restore tenant ID from URL if present
    const tenantIdFromUrl = searchParams.get('tenantId');
    if (tenantIdFromUrl) {
      setTenantId(tenantIdFromUrl);
    }

    // Store intended redirect URL
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      sessionStorage.setItem('redirectAfterLogin', redirectUrl);
    }

    // Check for error from OAuth callback
    const oauthError = searchParams.get('error');
    if (oauthError === 'tenant_mismatch') {
      setError('Your account does not belong to the specified tenant');
    } else if (oauthError === 'oauth_failed') {
      setError('OAuth authentication failed');
    } else if (oauthError === 'oauth_callback_failed') {
      setError('OAuth callback failed. Please try again');
    } else if (oauthError === 'invalid_tenant') {
      setError('Invalid tenant ID. Please check and try again');
    }
  }, [searchParams]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await emailLogin(email, password, tenantId);

      console.log('Email login result:', result);
      if (result.success) {
        // Redirect to intended URL or dashboard
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await devLogin();
      if (result.success) {
        // Redirect to intended URL or dashboard
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectUrl);
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Dev login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <>
        <header style={styles.header}>
          <h1 style={isMobile ? styles.companyNameMobile : styles.companyName}>
            Infero Agents
          </h1>
        </header>
        <div style={styles.container}>
          <div style={styles.card}>
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header style={styles.header}>
        <h1 style={isMobile ? styles.companyNameMobile : styles.companyName}>
          Infero Agents
        </h1>
      </header>
      <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        
        {/* Error Message Display - shown for all login methods */}
        {error && <p style={styles.error}>{error}</p>}
        
        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} style={{ width: '100%' }}>
          <input
            type="text"
            placeholder="Tenant ID *"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            minLength={6}
            required
          />
          
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Link to="/signup" style={styles.linkButton}>
            Don't have an account? Sign up
          </Link>
        </div>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        {isDev && (
          <>
            <button onClick={handleDevLogin} style={styles.devButton} disabled={loading}>
              🚀 Quick Dev Login (No OAuth)
            </button>
            <div style={styles.divider}>
              <span style={styles.dividerText}>or</span>
            </div>
          </>
        )}
        
        <button 
          onClick={() => {
            if (!tenantId.trim()) {
              setError('Please enter Tenant ID');
              return;
            }
            login(tenantId);
          }} 
          style={styles.googleButton}
        >
          <svg style={styles.icon} viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
    </>
  );
};

export default Login;
