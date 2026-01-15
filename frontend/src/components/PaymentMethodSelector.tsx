import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { getApiUrl } from '../config/api';
import { styles } from '../styles/PaymentMethod.styles';
import { PaymentMethod, PaymentMethodSelectorProps } from '../types';

const PaymentMethodSelector = ({ onPaymentMethodSelected, onVerified, selectedPaymentMethodId }: PaymentMethodSelectorProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(selectedPaymentMethodId || null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New payment form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(getApiUrl('api/payment-methods'));
      if (response.data.success) {
        setPaymentMethods(response.data.paymentMethods);
        // Auto-select default payment method
        const defaultMethod = response.data.paymentMethods.find((pm: PaymentMethod) => pm.isDefault);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod._id);
          onPaymentMethodSelected(defaultMethod._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch payment methods:', err);
      setError(err.response?.data?.error || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    onPaymentMethodSelected(methodId);
    setError('');
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // TODO: Integrate with Stripe Elements to tokenize card
      // For now, simulate tokenization
      const [expMonth, expYear] = cardExpiry.split('/').map(s => s.trim());
      
      // Simulate Stripe tokenization
      const mockStripePaymentMethodId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await apiClient.post(getApiUrl('api/payment-methods'), {
        stripePaymentMethodId: mockStripePaymentMethodId,
        cardBrand: 'visa', // Would come from Stripe
        cardLast4: cardNumber.slice(-4),
        cardExpMonth: parseInt(expMonth),
        cardExpYear: parseInt(expYear),
        billingName,
        billingEmail,
        setAsDefault: paymentMethods.length === 0 // Set as default if it's the first one
      });

      if (response.data.success) {
        setSuccess('Payment method added successfully!');
        setShowAddNew(false);
        // Clear form
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setBillingName('');
        setBillingEmail('');
        // Refresh list
        fetchPaymentMethods();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedMethod) {
      setError('Please select a payment method');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post(getApiUrl('api/payment-methods/verify'), {
        paymentMethodId: selectedMethod
      });

      if (response.data.success) {
        setSuccess('Payment method verified!');
        onVerified?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestCards = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post(getApiUrl('api/payment-methods/dev/create-test-cards'), {});
      if (response.data.success) {
        setSuccess('Test payment methods created!');
        fetchPaymentMethods();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create test cards');
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand: string) => {
    const icons: { [key: string]: string } = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳'
    };
    return icons[brand.toLowerCase()] || '💳';
  };

  return (
    <div style={styles.container}>
      {/* Development Mode Banner */}
      {isDev && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#856404' }}>🔧 Development Mode</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#856404' }}>
              Test cards: Visa ****4242 (success) | Mastercard ****0002 (decline)
            </p>
          </div>
          <button
            onClick={handleCreateTestCards}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#ffc107',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Create Test Cards
          </button>
        </div>
      )}

      <h2 style={styles.title}>Payment Information</h2>

      {/* Existing Payment Methods */}
      {!showAddNew && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Select Payment Method</h3>
          
          {paymentMethods.length === 0 ? (
            <p style={{ color: '#666', marginBottom: '16px' }}>No payment methods on file. Please add one to continue.</p>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method._id}
                style={styles.paymentMethodCard(selectedMethod === method._id)}
                onClick={() => handleSelectMethod(method._id)}
              >
                <div style={styles.cardInfo}>
                  <span style={styles.cardIcon}>{getCardIcon(method.cardBrand)}</span>
                  <div style={styles.cardDetails}>
                    <span style={styles.cardBrand}>{method.cardBrand}</span>
                    <span style={styles.cardNumber}>
                      ···· {method.cardLast4} | Expires {method.cardExpMonth}/{method.cardExpYear}
                      {isDev && method.cardLast4 === '4242' && <span style={{ marginLeft: '8px', color: '#4CAF50', fontSize: '0.8rem' }}>✓ Success</span>}
                      {isDev && method.cardLast4 === '0002' && <span style={{ marginLeft: '8px', color: '#f44336', fontSize: '0.8rem' }}>✗ Decline</span>}
                      {isDev && method.cardLast4 === '9999' && <span style={{ marginLeft: '8px', color: '#ff9800', fontSize: '0.8rem' }}>⏰ Expired</span>}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>{method.billingName}</span>
                  </div>
                </div>
                {method.isDefault && <span style={styles.defaultBadge}>Default</span>}
              </div>
            ))
          )}

          <button
            type="button"
            onClick={() => setShowAddNew(true)}
            style={styles.addNewButton}
          >
            <span>➕</span> Add New Payment Method
          </button>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          {paymentMethods.length > 0 && (
            <div style={styles.buttonGroup}>
              <button
                onClick={handleVerifyPayment}
                disabled={!selectedMethod || loading}
                style={{
                  ...styles.button,
                  opacity: !selectedMethod || loading ? 0.5 : 1,
                  cursor: !selectedMethod || loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add New Payment Method Form */}
      {showAddNew && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Add New Payment Method</h3>
          
          <form onSubmit={handleAddPaymentMethod} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Card Number</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                maxLength={16}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  maxLength={5}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  maxLength={4}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Cardholder Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Billing Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <div style={styles.buttonGroup}>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Adding...' : 'Add Payment Method'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddNew(false)}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Note */}
      <div style={styles.securityNote}>
        <span style={styles.securityIcon}>🔒</span>
        <div style={styles.securityText}>
          <strong>Your payment information is secure.</strong><br />
          We use industry-standard encryption and never store your complete card details. All payments are processed securely through our payment partner.
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
