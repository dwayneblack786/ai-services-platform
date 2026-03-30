import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FormInput } from '../components/FormInput';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';
import { tempCache } from '../services/cacheClient';

export const VerifyPhone: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const phoneNumber = location.state?.phoneNumber || '';
  const [registrationSessionId, setRegistrationSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Load registration session ID from cache
    const loadSessionId = async () => {
      const sessionId = await tempCache.get('registrationSessionId');
      setRegistrationSessionId(sessionId);
      
      // Redirect if no session
      if (!sessionId || !phoneNumber) {
        navigate('/register/initiate');
      }
    };
    loadSessionId();
  }, [phoneNumber, navigate]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.post('/api/registration/verify-phone', {
        registrationSessionId,
        verificationCode,
      });

      if (response.data.success) {
        setSuccess('Phone verified successfully!');
        
        // Navigate to account setup after short delay
        setTimeout(() => {
          navigate(`/register/setup-account${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
        }, 1500);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Verification failed. Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const response = await apiClient.post('/api/registration/resend-verification', {
        registrationSessionId,
      });

      if (response.data.success) {
        setSuccess('Verification code sent! Please check your phone.');
        setCountdown(60); // 60 second cooldown
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>Verify Your Phone</h1>
          <p style={styles.subtitle as React.CSSProperties}>
            We've sent a verification code to <strong>{phoneNumber}</strong>
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(20)} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleVerify}>
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>🔐</span>
              Enter Verification Code
            </h3>

            <FormInput
              label="Verification Code"
              type="text"
              value={verificationCode}
              onChange={setVerificationCode}
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              name="verificationCode"
            />

            <p style={styles.helpText as React.CSSProperties}>
              The code is valid for 10 minutes.
            </p>
          </div>

          <div style={styles.buttonContainer as React.CSSProperties}>
            <FormButton
              type="button"
              variant="cancel"
              onClick={() => navigate('/register/initiate')}
              fullWidth={false}
            >
              Back
            </FormButton>
            <FormButton type="submit" loading={loading} disabled={loading || success !== ''}>
              Verify
            </FormButton>
          </div>
        </form>

        <div style={styles.linkContainer as React.CSSProperties}>
          Didn't receive a code?{' '}
          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            style={{
              ...styles.link as React.CSSProperties,
              background: 'none',
              border: 'none',
              padding: 0,
              ...(resending || countdown > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            }}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
};
