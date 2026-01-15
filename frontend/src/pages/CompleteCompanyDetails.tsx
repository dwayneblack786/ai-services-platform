import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/CompleteCompanyDetails.styles';

const CompleteCompanyDetails = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setErrorDetails('');
    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/complete-company-details', {
        companyName,
        companyEmail,
        companyPhone: companyPhone || undefined,
        address: (street || city || state || zipCode || country) ? {
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          zipCode: zipCode || undefined,
          country: country || undefined
        } : undefined,
        industry: industry || undefined,
        website: website || undefined
      });

      if (response.data.success) {
        const newTenantId = response.data.tenantId || response.data.user?.tenantId;
        if (newTenantId) {
          setSuccessMessage(`Company created successfully! Your Tenant ID is: ${newTenantId}`);
          setTimeout(() => navigate('/dashboard'), 3000);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to save company details');
      if (errorData?.details) {
        setErrorDetails(errorData.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Complete Company Details</h1>
        <p style={styles.subtitle}>Tell us about your company</p>

        {successMessage && (
          <div style={styles.successMessage}>
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            <p style={styles.errorTitle}>{error}</p>
            {errorDetails && <p style={styles.errorDetails}>{errorDetails}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🏢 Company Information</h3>
            <input
              type="text"
              placeholder="Company Name *"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="email"
              placeholder="Company Email *"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              style={styles.input}
              required
            />
            <div style={styles.inputRow}>
              <input
                type="tel"
                placeholder="Phone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
              <input
                type="text"
                placeholder="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
            </div>
            <input
              type="url"
              placeholder="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Address */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📍 Address (Optional)</h3>
            <input
              type="text"
              placeholder="Street Address"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              style={styles.input}
            />
            <div style={styles.inputRow}>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
            </div>
            <div style={styles.inputRow}>
              <input
                type="text"
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
              <input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ ...styles.input, ...styles.inputNoMargin }}
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : '✓ Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteCompanyDetails;
