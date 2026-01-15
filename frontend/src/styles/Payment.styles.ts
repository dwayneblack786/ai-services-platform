import React from 'react';

export const statusBadge = (status?: string): React.CSSProperties => {
  const colors: { [key: string]: { bg: string; color: string } } = {
    active: { bg: '#e8f5e9', color: '#2e7d32' },
    inactive: { bg: '#fff3e0', color: '#e65100' },
    expired: { bg: '#ffebee', color: '#c62828' },
    removed: { bg: '#f5f5f5', color: '#757575' }
  };
  
  const style = colors[status || 'inactive'] || colors.inactive;
  
  return {
    backgroundColor: style.bg,
    color: style.color,
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase'
  };
};

export const styles: {
  [key: string]: React.CSSProperties;
} = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  addButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.1rem',
    color: '#666'
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  searchInput: {
    flex: 1,
    minWidth: '300px',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    minHeight: '44px'
  },
  filterSelect: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    minHeight: '44px',
    minWidth: '150px',
    backgroundColor: 'white'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px'
  },
  emptyStateText: {
    fontSize: '1.1rem',
    color: '#666',
    marginBottom: '1.5rem'
  },
  methodsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  methodsCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  viewToggle: {
    display: 'flex',
    gap: '0.25rem',
    backgroundColor: '#f5f5f5',
    padding: '0.25rem',
    borderRadius: '8px'
  },
  viewButton: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0.5rem 1rem',
    fontSize: '1.2rem',
    cursor: 'pointer',
    borderRadius: '6px',
    color: '#666',
    transition: 'all 0.2s'
  },
  viewButtonActive: {
    backgroundColor: 'white',
    color: '#4CAF50',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  methodCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'default'
  },
  methodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f0f0f0'
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  cardIcon: {
    fontSize: '2rem'
  },
  cardBrand: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.25rem'
  },
  cardExpiry: {
    fontSize: '0.875rem',
    color: '#666'
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  methodDetails: {
    marginBottom: '1rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #f9f9f9'
  },
  detailLabel: {
    fontSize: '0.875rem',
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '0.875rem',
    color: '#333',
    fontWeight: '500'
  },
  methodActions: {
    display: 'flex',
    gap: '0.75rem',
    paddingTop: '1rem'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '0.625rem 1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  removeButton: {
    flex: 1,
    backgroundColor: 'white',
    color: '#f44336',
    padding: '0.625rem 1rem',
    border: '1px solid #f44336',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  securityNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#f0f7ff',
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '2rem'
  },
  securityIcon: {
    fontSize: '1.5rem'
  },
  securityText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#1976d2',
    lineHeight: '1.5'
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '4px 8px',
    color: '#666',
    lineHeight: '1',
    transition: 'background-color 0.2s',
    borderRadius: '4px'
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: '180px',
    overflow: 'hidden'
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'white',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#333',
    transition: 'background-color 0.2s',
    display: 'block'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
    marginTop: 0,
    marginBottom: '1.5rem'
  },
  modalBody: {
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#555'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f0f0f0'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  transactionSection: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f0f0f0'
  },
  transactionToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#4CAF50'
  },
  transactionList: {
    marginTop: '1rem'
  },
  transactionLoading: {
    padding: '1rem',
    textAlign: 'center',
    color: '#666',
    fontSize: '0.9rem'
  },
  transactionItem: {
    padding: '0.75rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    marginBottom: '0.5rem',
    border: '1px solid #e0e0e0'
  },
  transactionMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  transactionProduct: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#333'
  },
  transactionAmount: {
    fontSize: '1rem',
    fontWeight: '600'
  },
  transactionMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem'
  },
  transactionDate: {
    color: '#666'
  },
  transactionStatus: {
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  viewAllTransactions: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.75rem',
    border: '1px solid #4CAF50',
    backgroundColor: 'transparent',
    color: '#4CAF50',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  noTransactions: {
    padding: '1rem',
    textAlign: 'center',
    color: '#999',
    fontSize: '0.9rem'
  }
};
