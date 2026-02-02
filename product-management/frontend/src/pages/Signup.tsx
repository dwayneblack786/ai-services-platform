import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Signup.styles';

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [suggestedTenantId, setSuggestedTenantId] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false); // Default to joining existing company
  const [tenantValidated, setTenantValidated] = useState(false);
  const [validatedTenantName, setValidatedTenantName] = useState('');
  
  // User fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Tenant ID (for existing customer)
  const [tenantId, setTenantId] = useState('');

  const validateTenantId = async () => {
    if (!tenantId.trim()) {
      setError('Please enter a Tenant ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/tenants/validate/${tenantId}`);
      if (response.data.success) {
        setTenantValidated(true);
        setValidatedTenantName(response.data.tenant.companyName);
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid Tenant ID');
      setTenantValidated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetails('');
    setSuggestedTenantId('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/signup', {
        email,
        password,
        name,
        tenantId: !isNewCustomer ? tenantId : undefined,
        isNewCustomer
      }, { withCredentials: true });

      if (response.data.success) {
        setSuccess(response.data.message || 'Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Signup failed');
      if (errorData?.details) {
        setErrorDetails(errorData.details);
      }
      if (errorData?.existingTenantId) {
        setSuggestedTenantId(errorData.existingTenantId);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isNewCustomer ? 'Create New Company' : 'Join Existing Company'}</h1>
        <p style={styles.subtitle}>{isNewCustomer ? 'Start your journey with AI Services Platform' : 'Sign up to join your company\'s workspace'}</p>

        {success ? (
          <div style={{ ...styles.success, ...styles.successContainer }}>
            <div style={styles.successIcon}>📧</div>
            <h2 style={styles.successTitle}>
              {isNewCustomer ? 'Company Account Created!' : 'Account Created!'}
            </h2>
            <p style={styles.successText}>{success}</p>
            <p style={styles.successSubText}>
              {isNewCustomer 
                ? 'After verifying your email, you\'ll set up your company profile and can start inviting team members.' 
                : 'After verifying your email, you\'ll have access to your company\'s workspace.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSignup}>
            {/* Tenant ID for existing customers - shown by default */}
            {!isNewCustomer && !tenantValidated && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>🔑 Company Tenant ID (Required)</h3>
                <p style={styles.tenantDescription}>
                  Ask your company administrator for the Tenant ID to join your team
                </p>
                <input
                  type="text"
                  placeholder="Tenant ID (e.g., tenant-1234567890-xyz)"
                  value={tenantId}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setTenantValidated(false);
                  }}
                  style={styles.input}
                  required
                />
                {error && <p style={styles.error}>{error}</p>}
                <button
                  type="button"
                  onClick={validateTenantId}
                  style={styles.secondaryButton}
                  disabled={loading}
                >
                  {loading ? 'Validating...' : '✓ Validate Tenant ID'}
                </button>
              </div>
            )}

            {!isNewCustomer && tenantValidated && (
              <div style={styles.success}>
                ✓ Company verified: <strong>{validatedTenantName}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setTenantValidated(false);
                    setTenantId('');
                    setValidatedTenantName('');
                  }}
                  style={styles.validatedCompany}
                >
                  Change
                </button>
              </div>
            )}

            {/* Override checkbox - to create new company */}
            <div style={styles.checkboxContainer(isNewCustomer)}>
              <input
                type="checkbox"
                id="isNewCustomer"
                checked={isNewCustomer}
                onChange={(e) => {
                  setIsNewCustomer(e.target.checked);
                  setTenantValidated(false);
                  setTenantId('');
                  setError('');
                }}
                style={styles.checkbox}
              />
              <label htmlFor="isNewCustomer" style={styles.checkboxLabel(isNewCustomer)}>
                🏢 I'm creating a new company (skip Tenant ID)
              </label>
            </div>

            {/* Personal Information - shown when new customer or tenant validated */}
            {(isNewCustomer || tenantValidated) && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>{isNewCustomer ? '👤 Administrator Account' : '👤 Your Information'}</h3>
                {isNewCustomer && (
                  <p style={styles.adminDescription}>
                    You will be the company administrator
                  </p>
                )}
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="password"
                  placeholder="Password (min 6 characters) *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  minLength={6}
                  required
                />
              </div>
            )}

            {error && (
              <div style={{ ...styles.error, ...styles.errorContainer }}>
                <p style={styles.errorTitle}>{error}</p>
                {errorDetails && <p style={styles.errorDetails}>{errorDetails}</p>}
                {suggestedTenantId && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(false);
                      setTenantId(suggestedTenantId);
                      setError('');
                      setErrorDetails('');
                      setSuggestedTenantId('');
                    }}
                    style={styles.useTenantButton}
                  >
                    Use Tenant ID: {suggestedTenantId}
                  </button>
                )}
              </div>
            )}

            {(isNewCustomer || tenantValidated) && (
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? (isNewCustomer ? 'Creating Company...' : 'Creating Account...') : (isNewCustomer ? '🚀 Create Company & Account' : '🎉 Join Company')}
              </button>
            )}
          </form>
        )}

        <div style={styles.link}>
          Already have an account?{' '}
          <Link to="/login" style={styles.linkButton}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;