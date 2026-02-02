import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FormButton } from '../components/FormButton';
import { Alert } from '../components/Alert';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { registrationStyles as styles } from '../styles/Registration.styles';
import apiClient from '../services/apiClient';

interface RegistrationStatus {
  id: string;
  status: 'submitted' | 'provisioning' | 'completed' | 'failed';
  email: string;
  companyName: string;
  tenantId?: string;
  keycloakRealmUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export const RegistrationStatusPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  useEffect(() => {
    if (!registrationId) {
      navigate('/register/initiate');
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await apiClient.get(
          `/api/registration/status/${registrationId}`
        );
        
        if (response.data.success) {
          setStatus(response.data.status);
          
          // Stop polling if registration is complete or failed
          if (
            pollingInterval &&
            (response.data.status.status === 'completed' || response.data.status.status === 'failed')
          ) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } catch (err: any) {
        const errorData = err.response?.data;
        setError(errorData?.error || 'Failed to load registration status.');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchStatus, 5000);
    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [registrationId, navigate]);

  if (loading && !status) {
    return <LoadingSpinner message="Loading registration status..." fullScreen />;
  }

  if (error && !status) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <div style={styles.card as React.CSSProperties}>
          <Alert type="error" message={error} />
          <FormButton onClick={() => navigate('/register/initiate')}>
            Start New Registration
          </FormButton>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const getStatusDisplay = () => {
    switch (status.status) {
      case 'submitted':
        return {
          icon: '⏳',
          title: 'Registration Submitted',
          message: 'Your registration has been submitted and is waiting to be processed.',
          color: '#2196F3',
        };
      case 'provisioning':
        return {
          icon: '⚙️',
          title: 'Provisioning Your Tenant',
          message: 'We are setting up your Keycloak tenant and configuring your account.',
          color: '#ffc107',
        };
      case 'completed':
        return {
          icon: '✓',
          title: 'Registration Complete!',
          message: 'Your account has been successfully provisioned.',
          color: '#4CAF50',
        };
      case 'failed':
        return {
          icon: '❌',
          title: 'Registration Failed',
          message: 'There was an error processing your registration. Please contact support.',
          color: '#f44336',
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          message: 'The registration status is unknown.',
          color: '#999',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <div style={{
            ...styles.successIcon as React.CSSProperties,
            color: statusDisplay.color,
          }}>
            {statusDisplay.icon}
          </div>
          <h1 style={styles.successTitle as React.CSSProperties}>
            {statusDisplay.title}
          </h1>
          <p style={styles.successMessage as React.CSSProperties}>
            {statusDisplay.message}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBar as React.CSSProperties}>
          <div style={(styles.progressFill as Function)(
            status.status === 'completed' ? 100 :
            status.status === 'provisioning' ? 75 :
            status.status === 'submitted' ? 50 : 0
          )} />
        </div>

        {/* Status Details */}
        <div style={styles.summarySection as React.CSSProperties}>
          <h3 style={styles.summaryTitle as React.CSSProperties}>Registration Details</h3>
          
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Registration ID</span>
            <span style={styles.summaryValue as React.CSSProperties}>{status.id}</span>
          </div>
          
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Email</span>
            <span style={styles.summaryValue as React.CSSProperties}>{status.email}</span>
          </div>
          
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Company</span>
            <span style={styles.summaryValue as React.CSSProperties}>{status.companyName}</span>
          </div>
          
          <div style={styles.summaryRow as React.CSSProperties}>
            <span style={styles.summaryLabel as React.CSSProperties}>Status</span>
            <span style={{
              ...styles.summaryValue as React.CSSProperties,
              ...(styles.badge as Function)(
                status.status === 'completed' ? 'primary' : 'secondary'
              ),
            }}>
              {status.status.toUpperCase()}
            </span>
          </div>

          {status.tenantId && (
            <div style={styles.summaryRow as React.CSSProperties}>
              <span style={styles.summaryLabel as React.CSSProperties}>Tenant ID</span>
              <span style={styles.summaryValue as React.CSSProperties}>{status.tenantId}</span>
            </div>
          )}
        </div>

        {/* Show spinner if still processing */}
        {(status.status === 'submitted' || status.status === 'provisioning') && (
          <LoadingSpinner
            size="medium"
            message={
              status.status === 'submitted'
                ? 'Waiting for processing...'
                : 'Provisioning your account...'
            }
          />
        )}

        {/* Completion Actions */}
        {status.status === 'completed' && (
          <>
            <Alert
              type="success"
              message="Welcome aboard!"
              details="A confirmation email with your login credentials has been sent to your email address."
            />
            
            <div style={styles.infoBox as React.CSSProperties}>
              <p style={styles.infoBoxTitle as React.CSSProperties}>Next Steps:</p>
              <ul style={styles.list as React.CSSProperties}>
                <li style={styles.listItem as React.CSSProperties}>
                  Check your email for login credentials
                </li>
                <li style={styles.listItem as React.CSSProperties}>
                  Log in using your tenant ID: <strong>{status.tenantId}</strong>
                </li>
                <li style={styles.listItem as React.CSSProperties}>
                  Complete your profile setup
                </li>
                <li style={styles.listItem as React.CSSProperties}>
                  Invite team members
                </li>
              </ul>
            </div>

            <FormButton onClick={() => navigate('/login')}>
              Go to Login
            </FormButton>
          </>
        )}

        {/* Failure Actions */}
        {status.status === 'failed' && (
          <>
            <Alert
              type="error"
              message="Registration Failed"
              details={status.error || 'An unexpected error occurred during registration.'}
            />
            
            <div style={styles.buttonContainer as React.CSSProperties}>
              <FormButton
                variant="secondary"
                onClick={() => navigate('/register/initiate')}
              >
                Start Over
              </FormButton>
              <FormButton onClick={() => window.location.href = 'mailto:support@example.com'}>
                Contact Support
              </FormButton>
            </div>
          </>
        )}

        {/* Link back to home */}
        <div style={styles.linkContainer as React.CSSProperties}>
          <Link to="/" style={styles.link as React.CSSProperties}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
