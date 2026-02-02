import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormInput } from '../components/FormInput';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';
import { tempCache } from '../services/cacheClient';

export const SetupAccount: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
    color: string;
  }>({ score: 0, feedback: '', color: '#e0e0e0' });

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

  useEffect(() => {
    // Check password strength
    if (formData.password) {
      const strength = calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '', color: '#e0e0e0' });
    }
  }, [formData.password]);

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';
    let color = '#f44336';

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 1) {
      feedback = 'Weak';
      color = '#f44336';
    } else if (score <= 3) {
      feedback = 'Fair';
      color = '#ffc107';
    } else if (score <= 4) {
      feedback = 'Good';
      color = '#2196F3';
    } else {
      feedback = 'Strong';
      color = '#4CAF50';
    }

    return { score, feedback, color };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors: { [key: string]: string } = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/registration/setup-account', {
        registrationSessionId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
      });

      if (response.data.success) {
        // Navigate to company setup
        navigate('/register/setup-company');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to setup account. Please try again.');
      
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
          <h1 style={styles.title as React.CSSProperties}>Create Your Account</h1>
          <p style={styles.subtitle as React.CSSProperties}>
            Set up your personal credentials
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(40)} />
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>👤</span>
              Personal Information
            </h3>

            <div style={styles.inputRow as React.CSSProperties}>
              <FormInput
                label="First Name"
                type="text"
                value={formData.firstName}
                onChange={(value) => setFormData({ ...formData, firstName: value })}
                error={fieldErrors.firstName}
                placeholder="John"
                required
                autoComplete="given-name"
                name="firstName"
              />

              <FormInput
                label="Last Name"
                type="text"
                value={formData.lastName}
                onChange={(value) => setFormData({ ...formData, lastName: value })}
                error={fieldErrors.lastName}
                placeholder="Doe"
                required
                autoComplete="family-name"
                name="lastName"
              />
            </div>
          </div>

          <div style={styles.section as React.CSSProperties}>
            <h3 style={styles.sectionTitle as React.CSSProperties}>
              <span style={styles.sectionIcon as React.CSSProperties}>🔒</span>
              Password Setup
            </h3>

            <FormInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              error={fieldErrors.password}
              placeholder="Enter a strong password"
              required
              minLength={8}
              autoComplete="new-password"
              name="password"
            />

            {formData.password && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  height: '4px',
                  background: '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    height: '100%',
                    background: passwordStrength.color,
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    transition: 'all 0.3s',
                  }} />
                </div>
                <p style={{
                  fontSize: '0.85rem',
                  color: passwordStrength.color,
                  fontWeight: 'bold',
                }}>
                  Password strength: {passwordStrength.feedback}
                </p>
              </div>
            )}

            <FormInput
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
              error={fieldErrors.confirmPassword}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              name="confirmPassword"
            />

            <div style={styles.infoBox as React.CSSProperties}>
              <p style={styles.infoBoxTitle as React.CSSProperties}>Password requirements:</p>
              <ul style={styles.list as React.CSSProperties}>
                <li style={styles.listItem as React.CSSProperties}>At least 8 characters long</li>
                <li style={styles.listItem as React.CSSProperties}>Mix of uppercase and lowercase letters</li>
                <li style={styles.listItem as React.CSSProperties}>At least one number</li>
                <li style={styles.listItem as React.CSSProperties}>At least one special character (!@#$%^&*)</li>
              </ul>
            </div>
          </div>

          <div style={styles.buttonContainer as React.CSSProperties}>
            <FormButton
              type="button"
              variant="cancel"
              onClick={() => navigate('/register/verify-phone')}
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
