import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';
import { tempCache } from '../services/cacheClient';

interface RegistrationSummary {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyWebsite?: string;
  industry: string;
  companySize: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export const ReviewSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [summary, setSummary] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registrationSessionId, setRegistrationSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Load registration session ID and fetch summary
    const loadData = async () => {
      const sessionId = await tempCache.get('registrationSessionId');
      setRegistrationSessionId(sessionId);
      
      // Redirect if no session
      if (!sessionId) {
        navigate('/register/initiate');
        return;
      }

      // Fetch registration summary
      try {
        const response = await apiClient.get(
          `/api/registration/summary/${sessionId}`
        );
        
        if (response.data.success) {
          setSummary(response.data.summary);
        }
      } catch (err: any) {
        const errorData = err.response?.data;
        setError(errorData?.error || 'Failed to load registration summary.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await apiClient.post('/api/registration/submit', {
        registrationSessionId,
      });

      if (response.data.success) {
        // Clear cache
        await tempCache.delete('registrationSessionId');
        
        // Navigate to status page with redirect parameter
        navigate(`/register/status/${response.data.registrationId}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to submit registration. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading registration summary..." fullScreen />;
  }

  if (!summary) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <div style={styles.card as React.CSSProperties}>
          <Alert type="error" message="Registration summary not found. Please start over." />
          <FormButton onClick={() => navigate('/register/initiate')}>
            Start New Registration
          </FormButton>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>Review & Submit</h1>
          <p style={styles.subtitle as React.CSSProperties}>
            Please review your information before submitting
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(90)} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Contact Information */}
        <div style={styles.summarySection as React.CSSProperties}>
          <h3 style={styles.summaryTitle as React.CSSProperties}>
            📧 Contact Information
          </h3>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Email</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.email}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Phone</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.phoneNumber}</span>
          </div>
        </div>

        {/* Personal Information */}
        <div style={styles.summarySection as React.CSSProperties}>
          <h3 style={styles.summaryTitle as React.CSSProperties}>
            👤 Personal Information
          </h3>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Name</span>
            <span style={styles.summaryValue as React.CSSProperties}>
              {summary.firstName} {summary.lastName}
            </span>
          </div>
        </div>

        {/* Company Information */}
        <div style={styles.summarySection as React.CSSProperties}>
          <h3 style={styles.summaryTitle as React.CSSProperties}>
            🏢 Company Information
          </h3>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Company Name</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.companyName}</span>
          </div>
          {summary.companyWebsite && (
            <div style={styles.summaryRow as React.CSSProperties}>
              <span style={styles.summaryLabel as React.CSSProperties}>Website</span>
              <span style={styles.summaryValue as React.CSSProperties}>{summary.companyWebsite}</span>
            </div>
          )}
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Industry</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.industry}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Company Size</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.companySize}</span>
          </div>
        </div>

        {/* Address */}
        <div style={styles.summarySection as React.CSSProperties}>
          <h3 style={styles.summaryTitle as React.CSSProperties}>
            📍 Company Address
          </h3>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Street</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.address}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>City</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.city}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>State</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.state}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Country</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.country}</span>
          </div>
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Postal Code</span>
            <span style={styles.summaryValue as React.CSSProperties}>{summary.postalCode}</span>
          </div>
        </div>

        {/* Terms Agreement */}
        <div style={styles.checkboxContainer as React.CSSProperties}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={styles.checkbox as React.CSSProperties}
          />
          <label htmlFor="terms" style={styles.checkboxLabel as React.CSSProperties}>
            I agree to the{' '}
            <a href="/terms" target="_blank" style={styles.link as React.CSSProperties}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" style={styles.link as React.CSSProperties}>
              Privacy Policy
            </a>
          </label>
        </div>

        <div style={styles.buttonContainer as React.CSSProperties}>
          <FormButton
            type="button"
            variant="cancel"
            onClick={() => navigate('/register/setup-company')}
            fullWidth={false}
            disabled={submitting}
          >
            Back
          </FormButton>
          <FormButton
            type="button"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!agreedToTerms || submitting}
          >
            Submit Registration
          </FormButton>
        </div>

        <div style={styles.infoBox as React.CSSProperties}>
          <p style={styles.infoBoxText as React.CSSProperties}>
            After submission, we'll provision your Keycloak tenant and send you a confirmation email
            with your login credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
