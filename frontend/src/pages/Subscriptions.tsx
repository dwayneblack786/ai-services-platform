import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { Subscription } from '../types';

const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/subscriptions');
      if (response.data.success) {
        setSubscriptions(response.data.subscriptions);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'trial': return '#2196F3';
      case 'suspended': return '#FFA726';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = !searchTerm || 
      sub.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.productId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || sub.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={styles.title}>Product Subscriptions</h1>
        <button
          onClick={() => navigate('/products')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#4CAF50',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Browse Products
        </button>
      </div>

      {subscriptions.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              minHeight: '44px',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div style={styles.card}>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '1.1rem', margin: '40px 0' }}>
            No active subscriptions. Browse our products to get started.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate('/products')}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: '#4CAF50',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              View Products
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          {filteredSubscriptions.length === 0 ? (
            <div style={styles.card}>
              <p style={{ textAlign: 'center', color: '#666', fontSize: '1.1rem', margin: '40px 0' }}>
                No subscriptions found matching your criteria.
              </p>
            </div>
          ) : (
            filteredSubscriptions.map((subscription) => (
            <div key={subscription._id} style={{
              ...styles.card,
              border: `2px solid ${getStatusColor(subscription.status)}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: '#333' }}>
                    {subscription.product?.name || 'Unknown Product'}
                  </h2>
                  <p style={{ margin: '0', fontSize: '0.95rem', color: '#666' }}>
                    {subscription.product?.category}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    background: getStatusColor(subscription.status),
                    color: 'white',
                    textTransform: 'uppercase'
                  }}>
                    {subscription.status}
                  </span>
                  {subscription.autoRenew && subscription.status === 'active' && (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      background: '#E3F2FD',
                      color: '#1976D2'
                    }}>
                      Auto-Renew On
                    </span>
                  )}
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '20px',
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Billing Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    per {subscription.billingCycle === 'monthly' ? 'month' : subscription.billingCycle === 'yearly' ? 'year' : subscription.billingCycle}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Start Date</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                    {formatDate(subscription.startDate)}
                  </div>
                </div>

                {subscription.nextBillingDate && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Next Billing</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                      {formatDate(subscription.nextBillingDate)}
                    </div>
                  </div>
                )}

                {subscription.trialEndsAt && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Trial Ends</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#FF9800' }}>
                      {formatDate(subscription.trialEndsAt)}
                    </div>
                  </div>
                )}
              </div>

              {subscription.product?.description && (
                <p style={{ 
                  fontSize: '0.95rem', 
                  color: '#555', 
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  {subscription.product.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => navigate(`/products/${subscription.productId}/configure`)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #2196F3',
                    background: 'white',
                    color: '#2196F3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2196F3';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#2196F3';
                  }}
                >
                  Configure
                </button>
                <button
                  onClick={() => navigate(`/billing/subscription/${subscription._id}`)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4CAF50',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
                >
                  View Billing
                </button>
              </div>
            </div>
          ))
          )}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
