import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles, statusBadge } from '../styles/Payment.styles';
import { getApiUrl } from '../config/api';
import { PaymentMethod, Transaction } from '../types';

const Payment = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid');
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(null);
  const [methodTransactions, setMethodTransactions] = useState<{[key: string]: Transaction[]}>({});
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    cardBrand: 'visa',
    cardLast4: '',
    cardExpMonth: new Date().getMonth() + 1,
    cardExpYear: new Date().getFullYear(),
    billingName: '',
    billingEmail: '',
    securityCode: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });
  const [editForm, setEditForm] = useState({
    billingName: '',
    billingEmail: '',
    cardExpMonth: 0,
    cardExpYear: 0
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside dropdown and menu button
      if (!target.closest('[data-dropdown]') && !target.closest('[data-menu-button]')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const fetchPaymentMethods = async () => {
    console.log('Fetching payment methods...');
    try {
      const response = await apiClient.get(getApiUrl('api/payment-methods'));
      console.log('Payment methods fetched:', response.data);
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.patch(
        getApiUrl(`api/payment-methods/${id}/set-default`),
        {},
        { withCredentials: true }
      );
      fetchPaymentMethods();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to set default payment method');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await apiClient.delete(getApiUrl(`api/payment-methods/${id}`));
      fetchPaymentMethods();
      setOpenMenuId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove payment method');
    }
  };

  const handleEditClick = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditForm({
      billingName: method.billingName,
      billingEmail: method.billingEmail || '',
      cardExpMonth: method.cardExpMonth,
      cardExpYear: method.cardExpYear
    });
    setOpenMenuId(null);
  };

  const handleAddPaymentMethod = async () => {
    try {
      const response = await apiClient.post(
        getApiUrl('api/payment-methods'),
        {
          cardBrand: addForm.cardBrand,
          cardLast4: addForm.cardLast4,
          cardExpMonth: parseInt(addForm.cardExpMonth.toString()),
          cardExpYear: parseInt(addForm.cardExpYear.toString()),
          billingName: addForm.billingName,
          billingEmail: addForm.billingEmail,
          securityCode: addForm.securityCode,
          billingAddress: {
            line1: addForm.line1,
            city: addForm.city,
            state: addForm.state,
            postalCode: addForm.postalCode,
            country: addForm.country
          }
        }
      );

      if (response.data.success) {
        setShowAddModal(false);
        setAddForm({
          cardBrand: 'visa',
          cardLast4: '',
          cardExpMonth: new Date().getMonth() + 1,
          cardExpYear: new Date().getFullYear(),
          billingName: '',
          billingEmail: '',
          securityCode: '',
          line1: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US'
        });
        fetchPaymentMethods();
        alert('Payment method added successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add payment method');
    }
  };

  const handleEditSave = async () => {
    if (!editingMethod) return;

    try {
      await apiClient.patch(
        getApiUrl(`api/payment-methods/${editingMethod._id}`),
        editForm
      );
      setEditingMethod(null);
      fetchPaymentMethods();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update payment method');
    }
  };

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const toggleTransactions = async (methodId: string) => {
    if (expandedMethodId === methodId) {
      setExpandedMethodId(null);
      return;
    }

    setExpandedMethodId(methodId);
    
    if (!methodTransactions[methodId]) {
      setLoadingTransactions(true);
      try {
        const response = await apiClient.get(
          getApiUrl(`api/transactions/payment-method/${methodId}`),
          { params: { limit: 5 } }
        );
        setMethodTransactions({
          ...methodTransactions,
          [methodId]: response.data.transactions || []
        });
      } catch (err: any) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoadingTransactions(false);
      }
    }
  };

  const getCardIcon = (brand: string) => {
    const icons: { [key: string]: string } = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      default: '💳'
    };
    return icons[brand.toLowerCase()] || icons.default;
  };

  const getStatusBadge = (method: PaymentMethod) => {
    const now = new Date();
    const expDate = new Date(method.cardExpYear, method.cardExpMonth);
    
    if (expDate < now) {
      return <span style={statusBadge('expired')}>Expired</span>;
    }
    
    if (method.status === 'removed') {
      return <span style={statusBadge('removed')}>Removed</span>;
    }

    // Check if active based on recent transactions
    if (method.lastTransactionDate) {
      const lastTransaction = new Date(method.lastTransactionDate);
      const daysSinceLastUse = Math.floor((now.getTime() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastUse <= 90) {
        return <span style={statusBadge('active')}>Active</span>;
      } else {
        return <span style={statusBadge('inactive')}>Inactive</span>;
      }
    }
    
    return <span style={statusBadge('inactive')}>Not Used</span>;
  };

  const formatDate = (date?: string | Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return 'N/A';
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Filter payment methods
  const filteredPaymentMethods = paymentMethods.filter(pm => {
    const matchesSearch = !searchTerm ||
      pm.billingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pm.cardBrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pm.cardLast4.includes(searchTerm) ||
      pm.billingEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || pm.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Loading payment methods...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Payment Methods</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'grid' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ▦
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'card' ? styles.viewButtonActive : {})
              }}
              onClick={() => setViewMode('card')}
              title="Card view"
            >
              ☰
            </button>
          </div>
          <button 
            style={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            + Add Payment Method
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {/* Search and Filter */}
      {paymentMethods.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, card brand, last 4 digits, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      )}

      {paymentMethods.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No payment methods added yet.</p>
          <button 
            style={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            Add Your First Payment Method
          </button>
        </div>
      ) : (
        <div style={{
          ...styles.methodsGrid,
          ...(viewMode === 'card' ? styles.methodsCard : {})
        }}>
          {filteredPaymentMethods.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
              No payment methods found matching your search criteria.
            </div>
          ) : (
            filteredPaymentMethods.map((method) => (
            <div key={method._id} style={styles.methodCard}>
              <div style={styles.methodHeader}>
                <div style={styles.cardInfo}>
                  <span style={styles.cardIcon}>{getCardIcon(method.cardBrand)}</span>
                  <div>
                    <div style={styles.cardBrand}>
                      {method.cardBrand.toUpperCase()} •••• {method.cardLast4}
                    </div>
                    <div style={styles.cardExpiry}>
                      Expires {method.cardExpMonth.toString().padStart(2, '0')}/{method.cardExpYear}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {method.isDefault && (
                    <span style={styles.defaultBadge}>Default</span>
                  )}
                  <div style={{ position: 'relative' }}>
                    <button
                      data-menu-button
                      style={styles.menuButton}
                      onClick={() => toggleMenu(method._id)}
                      title="More options"
                    >
                      ⋮
                    </button>
                    {openMenuId === method._id && (
                      <div data-dropdown style={styles.dropdown}>
                        <button
                          style={styles.dropdownItem}
                          onClick={() => handleEditClick(method)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          style={styles.dropdownItem}
                          onClick={() => {
                            navigate(`/transactions?paymentMethodId=${method._id}`);
                            setOpenMenuId(null);
                          }}
                        >
                          📜 View Transactions
                        </button>
                        {!method.isDefault && method.status !== 'removed' && (
                          <button
                            style={styles.dropdownItem}
                            onClick={() => {
                              handleSetDefault(method._id);
                              setOpenMenuId(null);
                            }}
                          >
                            ⭐ Set as Default
                          </button>
                        )}
                        {method.status !== 'removed' && (
                          <button
                            style={{...styles.dropdownItem, color: '#f44336'}}
                            onClick={() => handleRemove(method._id)}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.methodDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Billing Name:</span>
                  <span style={styles.detailValue}>{method.billingName}</span>
                </div>
                {method.billingEmail && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Email:</span>
                    <span style={styles.detailValue}>{method.billingEmail}</span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  {getStatusBadge(method)}
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Transactions:</span>
                  <span style={styles.detailValue}>{method.transactionCount}</span>
                </div>
                {method.lastTransactionDate && (
                  <>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Last Used:</span>
                      <span style={styles.detailValue}>{formatDate(method.lastTransactionDate)}</span>
                    </div>
                    {method.lastTransactionAmount && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Last Amount:</span>
                        <span style={styles.detailValue}>{formatAmount(method.lastTransactionAmount)}</span>
                      </div>
                    )}
                    {method.lastTransactionStatus && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Last Status:</span>
                        <span style={{
                          ...styles.detailValue,
                          color: method.lastTransactionStatus === 'success' ? '#4CAF50' : 
                                 method.lastTransactionStatus === 'failed' ? '#f44336' : '#ff9800'
                        }}>
                          {method.lastTransactionStatus.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Transaction History Section */}
              {method.transactionCount && method.transactionCount > 0 && (
                <div style={styles.transactionSection}>
                  <button
                    style={styles.transactionToggle}
                    onClick={() => toggleTransactions(method._id)}
                  >
                    <span>Transaction History ({method.transactionCount})</span>
                    <span>{expandedMethodId === method._id ? '▼' : '▶'}</span>
                  </button>

                  {expandedMethodId === method._id && (
                    <div style={styles.transactionList}>
                      {loadingTransactions ? (
                        <div style={styles.transactionLoading}>Loading transactions...</div>
                      ) : methodTransactions[method._id]?.length > 0 ? (
                        <>
                          {methodTransactions[method._id].map((txn) => (
                            <div key={txn._id} style={styles.transactionItem}>
                              <div style={styles.transactionMain}>
                                <span style={styles.transactionProduct}>
                                  {txn.productName || 'Transaction'}
                                </span>
                                <span style={{
                                  ...styles.transactionAmount,
                                  color: txn.status === 'success' ? '#4CAF50' : '#f44336'
                                }}>
                                  {formatAmount(txn.amount)}
                                </span>
                              </div>
                              <div style={styles.transactionMeta}>
                                <span style={styles.transactionDate}>
                                  {formatDate(txn.createdAt)}
                                </span>
                                <span style={{
                                  ...styles.transactionStatus,
                                  color: txn.status === 'success' ? '#4CAF50' : '#f44336'
                                }}>
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          <button
                            style={styles.viewAllTransactions}
                            onClick={() => navigate('/transactions')}
                          >
                            View All Transactions →
                          </button>
                        </>
                      ) : (
                        <div style={styles.noTransactions}>No recent transactions</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingMethod && (
        <div style={styles.modalOverlay} onClick={() => setEditingMethod(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Payment Method</h2>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Name</label>
                <input
                  type="text"
                  value={editForm.billingName}
                  onChange={(e) => setEditForm({...editForm, billingName: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Email</label>
                <input
                  type="email"
                  value={editForm.billingEmail}
                  onChange={(e) => setEditForm({...editForm, billingEmail: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={editForm.cardExpMonth}
                    onChange={(e) => setEditForm({...editForm, cardExpMonth: parseInt(e.target.value)})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Year</label>
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    value={editForm.cardExpYear}
                    onChange={(e) => setEditForm({...editForm, cardExpYear: parseInt(e.target.value)})}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setEditingMethod(null)}
              >
                Cancel
              </button>
              <button
                style={styles.saveButton}
                onClick={handleEditSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add Payment Method</h2>
            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Card Brand *</label>
                  <select
                    value={addForm.cardBrand}
                    onChange={(e) => setAddForm({...addForm, cardBrand: e.target.value})}
                    style={styles.input}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last 4 Digits *</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={addForm.cardLast4}
                    onChange={(e) => setAddForm({...addForm, cardLast4: e.target.value.replace(/\\D/g, '')})}
                    placeholder="4242"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Security Code (CVV) *</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={addForm.securityCode}
                    onChange={(e) => setAddForm({...addForm, securityCode: e.target.value.replace(/\\D/g, '')})}
                    placeholder="123"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>&nbsp;</label>
                  <div style={{fontSize: '0.85rem', color: '#666', paddingTop: '0.5rem'}}>
                    3-4 digits on back of card
                  </div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Month *</label>
                  <select
                    value={addForm.cardExpMonth}
                    onChange={(e) => setAddForm({...addForm, cardExpMonth: parseInt(e.target.value)})}
                    style={styles.input}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Year *</label>
                  <select
                    value={addForm.cardExpYear}
                    onChange={(e) => setAddForm({...addForm, cardExpYear: parseInt(e.target.value)})}
                    style={styles.input}
                  >
                    {Array.from({length: 15}, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Name *</label>
                <input
                  type="text"
                  value={addForm.billingName}
                  onChange={(e) => setAddForm({...addForm, billingName: e.target.value})}
                  placeholder="John Doe"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Email *</label>
                <input
                  type="email"
                  value={addForm.billingEmail}
                  onChange={(e) => setAddForm({...addForm, billingEmail: e.target.value})}
                  placeholder="john@example.com"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Address Line 1 *</label>
                <input
                  type="text"
                  value={addForm.line1}
                  onChange={(e) => setAddForm({...addForm, line1: e.target.value})}
                  placeholder="123 Main Street"
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({...addForm, city: e.target.value})}
                    placeholder="Los Angeles"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>State *</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={addForm.state}
                    onChange={(e) => setAddForm({...addForm, state: e.target.value.toUpperCase()})}
                    placeholder="CA"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Postal Code *</label>
                  <input
                    type="text"
                    value={addForm.postalCode}
                    onChange={(e) => setAddForm({...addForm, postalCode: e.target.value})}
                    placeholder="90210"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Country *</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={addForm.country}
                    onChange={(e) => setAddForm({...addForm, country: e.target.value.toUpperCase()})}
                    placeholder="US"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.saveButton}
                onClick={handleAddPaymentMethod}
              >
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.securityNote}>
        <span style={styles.securityIcon}>🔒</span>
        <p style={styles.securityText}>
          All payment information is encrypted and securely stored. We never store your complete card number.
        </p>
      </div>
    </div>
  );
};

export default Payment;
