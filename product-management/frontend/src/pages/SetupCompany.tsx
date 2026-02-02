import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormInput } from '../components/FormInput';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';
import { tempCache } from '../services/cacheClient';

export const SetupCompany: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsite: '',
    industry: '',
    companySize: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [registrationSessionId, setRegistrationSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Load registration session ID from cache
    const loadSessionId = async () => {
      const sessionId = await tempCache.get('registrationSessionId');
      setRegistrationSessionId(sessionId);
      
      // Redirect if no session
      if (!sessionId) {
        navigate('/register/initiate');
      }
    };
    loadSessionId();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await apiClient.post('/api/registration/setup-company', {
        registrationSessionId,
        ...formData,
      });

      if (response.data.success) {
        // Navigate to review and submit
        navigate('/register/review');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to setup company. Please try again.');
      
      if (errorData?.details) {
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

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>Company Information</h1>
          <p style={styles.subtitle as React.CSSProperties}>
            Tell us about your company
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(60)} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>🏢</span>
              Company Details
            </h3>

            <FormInput
              label="Company Name"
              type="text"
              value={formData.companyName}
              onChange={(value) => setFormData({ ...formData, companyName: value })}
              error={fieldErrors.companyName}
              placeholder="Acme Corporation"
              required
              autoComplete="organization"
              name="companyName"
            />

            <FormInput
              label="Company Website"
              type="url"
              value={formData.companyWebsite}
              onChange={(value) => setFormData({ ...formData, companyWebsite: value })}
              error={fieldErrors.companyWebsite}
              placeholder="https://www.example.com"
              autoComplete="url"
              name="companyWebsite"
            />

            <div style={styles.inputRow as React.CSSProperties}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#333',
                }}>
                  Industry <span style={{ color: '#f44336' }}>*</span>
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    ...(fieldErrors.industry ? { borderColor: '#f44336' } : {}),
                  }}
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.industry && (
                  <span style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '0.85rem',
                    color: '#f44336',
                  }}>
                    {fieldErrors.industry}
                  </span>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: '#333',
                }}>
                  Company Size <span style={{ color: '#f44336' }}>*</span>
                </label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    ...(fieldErrors.companySize ? { borderColor: '#f44336' } : {}),
                  }}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1001+">1001+ employees</option>
                </select>
                {fieldErrors.companySize && (
                  <span style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '0.85rem',
                    color: '#f44336',
                  }}>
                    {fieldErrors.companySize}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>📍</span>
              Company Address
            </h3>

            <FormInput
              label="Street Address"
              type="text"
              value={formData.address}
              onChange={(value) => setFormData({ ...formData, address: value })}
              error={fieldErrors.address}
              placeholder="123 Main Street"
              required
              autoComplete="street-address"
              name="address"
            />

            <div style={styles.inputRow as React.CSSProperties}>
              <FormInput
                label="City"
                type="text"
                value={formData.city}
                onChange={(value) => setFormData({ ...formData, city: value })}
                error={fieldErrors.city}
                placeholder="San Francisco"
                required
                autoComplete="address-level2"
                name="city"
              />

              <FormInput
                label="State/Province"
                type="text"
                value={formData.state}
                onChange={(value) => setFormData({ ...formData, state: value })}
                error={fieldErrors.state}
                placeholder="CA"
                required
                autoComplete="address-level1"
                name="state"
              />
            </div>

            <div style={styles.inputRow as React.CSSProperties}>
              <FormInput
                label="Country"
                type="text"
                value={formData.country}
                onChange={(value) => setFormData({ ...formData, country: value })}
                error={fieldErrors.country}
                placeholder="United States"
                required
                autoComplete="country-name"
                name="country"
              />

              <FormInput
                label="Postal Code"
                type="text"
                value={formData.postalCode}
                onChange={(value) => setFormData({ ...formData, postalCode: value })}
                error={fieldErrors.postalCode}
                placeholder="94102"
                required
                autoComplete="postal-code"
                name="postalCode"
              />
            </div>
          </div>

          <div style={styles.buttonContainer as React.CSSProperties}>
            <FormButton
              type="button"
              variant="cancel"
              onClick={() => navigate('/register/setup-account')}
              fullWidth={false}
            >
              Back
            </FormButton>
            <FormButton type="submit" loading={loading} disabled={loading}>
              Continue
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
};
