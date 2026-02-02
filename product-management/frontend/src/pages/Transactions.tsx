import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles, statusBadge } from '../styles/Transactions.styles';
import { getApiUrl } from '../config/api';
import { Transaction } from '../types';

const Transactions = () => {
      const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentMethodIdParam = searchParams.get('paymentMethodId');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus, paymentMethodIdParam]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (paymentMethodIdParam) {
        params.paymentMethodId = paymentMethodIdParam;
      }

      const response = await apiClient.get(getApiUrl('api/transactions'), {
        params
      });
      setTransactions(response.data.transactions || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      success: '✓',
      failed: '✗',
      pending: '⏳',
      refunded: '↩'
    };
    return icons[status as keyof typeof icons] || '?';
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

  const formatAmount = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(txn => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      txn.transactionId.toLowerCase().includes(search) ||
      txn.productName?.toLowerCase().includes(search) ||
      txn.description?.toLowerCase().includes(search) ||
      txn.cardLast4.includes(search)
    );
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Loading transactions...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          {paymentMethodIdParam ? 'Payment Method Transactions' : 'Transaction History'}
        </h1>
        <div style={styles.filterContainer}>
          {paymentMethodIdParam && (
            <button
              style={styles.backButton}
              onClick={() => navigate('/payment')}
            >
              ← Back to Payment Methods
            </button>
          )}
          <input
            type="text"
            placeholder="Search by transaction ID, product, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            style={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Transactions</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      <div style={styles.summary}>
        <span style={styles.summaryText}>
          Showing {filteredTransactions.length} of {total} transactions
        </span>
      </div>

      {filteredTransactions.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>
            {transactions.length === 0 ? 'No transactions found.' : 'No transactions match your search criteria.'}
          </p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Amount</th>
                <th style={styles.tableHeader}>Product/Service</th>
                <th style={styles.tableHeader}>Payment Method</th>
                <th style={styles.tableHeader}>Type</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr 
                  key={transaction._id} 
                  style={styles.tableRow}
                >
                  <td style={styles.tableCell}>
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={statusBadge(transaction.status)}>
                      {getStatusIcon(transaction.status)} {transaction.status}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.amount}>
                      {formatAmount(transaction.amount, transaction.currency)}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    {transaction.productName || transaction.description || 'N/A'}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.cardInfo}>
                      {getCardIcon(transaction.cardBrand)}{' '}
                      {transaction.cardBrand} ****{transaction.cardLast4}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.typeBadge}>
                      {transaction.type}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      style={styles.viewButton}
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div 
          style={styles.modalOverlay}
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Transaction Details</h2>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedTransaction(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.detailSection}>
                <h3 style={styles.sectionTitle}>Transaction Information</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Transaction ID:</span>
                    <span style={styles.detailValue}>{selectedTransaction.transactionId}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Date:</span>
                    <span style={styles.detailValue}>{formatDate(selectedTransaction.createdAt)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={statusBadge(selectedTransaction.status)}>
                      {getStatusIcon(selectedTransaction.status)} {selectedTransaction.status}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>{selectedTransaction.type}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.sectionTitle}>Payment Details</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Amount:</span>
                    <span style={{...styles.detailValue, ...styles.amountLarge}}>
                      {formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Payment Method:</span>
                    <span style={styles.detailValue}>
                      {getCardIcon(selectedTransaction.cardBrand)}{' '}
                      {selectedTransaction.cardBrand} ****{selectedTransaction.cardLast4}
                    </span>
                  </div>
                  {selectedTransaction.productName && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Product/Service:</span>
                      <span style={styles.detailValue}>{selectedTransaction.productName}</span>
                    </div>
                  )}
                  {selectedTransaction.description && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Description:</span>
                      <span style={styles.detailValue}>{selectedTransaction.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedTransaction.status === 'failed' && selectedTransaction.failureReason && (
                <div style={styles.detailSection}>
                  <h3 style={styles.sectionTitle}>Failure Information</h3>
                  <div style={styles.failureBox}>
                    <p style={styles.failureReason}>{selectedTransaction.failureReason}</p>
                    {selectedTransaction.failureCode && (
                      <p style={styles.failureCode}>Code: {selectedTransaction.failureCode}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.closeModalButton}
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
