import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FormInput } from '../components/FormInput';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';
import { tempCache } from '../services/cacheClient';

export const InitiateRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await apiClient.post('/api/registration/initiate', formData);
      
      if (response.data.success) {
        // Store registration session ID (1 hour TTL)
        await tempCache.set('registrationSessionId', response.data.registrationSessionId, 3600);
        
        // Navigate to phone verification
        navigate('/register/verify-phone', {
          state: { 
            email: formData.email,
            phoneNumber: formData.phoneNumber,
          },
        });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to initiate registration. Please try again.');
      
      if (errorData?.details) {
        // Handle field-specific errors
        const errors: { [key: string]: string } = {};
        errorData.details.forEach((detail: any) => {
          if (detail.path) {
            errors[detail.path] = detail.msg;
          }
        });
        setFieldErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'microsoft') => {
    // Redirect to OAuth provider
    const backendUrl = 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/oauth/${provider}?type=registration`;
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>Create Your Account</h1>
          <p style={styles.subtitle as React.CSSProperties}>
            Start your journey with us. We'll need some basic information to get started.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(10)} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* OAuth Providers */}
        <div style={{ marginBottom: '30px' }}>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '15px', fontSize: '14px' }}>
            Quick signup with:
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('microsoft')}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#f25022" d="M0 0h8.5v8.5H0z"/>
                <path fill="#00a4ef" d="M9.5 0H18v8.5H9.5z"/>
                <path fill="#7fba00" d="M0 9.5h8.5V18H0z"/>
                <path fill="#ffb900" d="M9.5 9.5H18V18H9.5z"/>
              </svg>
              Microsoft
            </button>
          </div>
          
          <div style={{ position: 'relative', textAlign: 'center', margin: '25px 0' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid #e0e0e0' }} />
            <span style={{ position: 'relative', background: 'white', padding: '0 15px', color: '#999', fontSize: '13px' }}>
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>📧</span>
              Contact Information
            </h3>

            <FormInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              error={fieldErrors.email}
              placeholder="your.email@company.com"
              required
              autoComplete="email"
              name="email"
            />

            <FormInput
              label="Phone Number"
              type="tel"
              value={formData.phoneNumber}
              onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
              error={fieldErrors.phoneNumber}
              placeholder="+1234567890"
              required
              autoComplete="tel"
              name="phoneNumber"
            />

            <p style={styles.helpText as React.CSSProperties}>
              We'll send a verification code to this phone number.
            </p>
          </div>

          <div style={styles.infoBox as React.CSSProperties}>
            <p style={styles.infoBoxTitle as React.CSSProperties}>Why do we need this?</p>
            <p style={styles.infoBoxText as React.CSSProperties}>
              Your email will be used for account notifications and important updates. 
              Your phone number is used for verification and optional SMS alerts.
            </p>
          </div>

          <FormButton type="submit" loading={loading} disabled={loading}>
            Continue
          </FormButton>
        </form>

        <div style={styles.linkContainer as React.CSSProperties}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link as React.CSSProperties}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

