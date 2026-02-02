import React from 'react';

export const statusBadge = (status?: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '0.375rem 0.75rem',
  borderRadius: '20px',
  fontSize: '0.85rem',
  fontWeight: '500',
  textTransform: 'capitalize',
  backgroundColor: 
    status === 'success' ? '#e8f5e9' :
    status === 'failed' ? '#ffebee' :
    status === 'pending' ? '#fff3e0' :
    status === 'refunded' ? '#e3f2fd' : '#f5f5f5',
  color:
    status === 'success' ? '#2e7d32' :
    status === 'failed' ? '#c62828' :
    status === 'pending' ? '#ef6c00' :
    status === 'refunded' ? '#1565c0' : '#666'
});

export const styles: {
  [key: string]: React.CSSProperties;
} = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
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
  filterContainer: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchInput: {
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    minWidth: '300px',
    backgroundColor: 'white',
    minHeight: '44px'
  },
  backButton: {
    backgroundColor: '#fff',
    color: '#4CAF50',
    padding: '0.75rem 1.25rem',
    border: '1px solid #4CAF50',
    borderRadius: '8px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterSelect: {
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  summary: {
    marginBottom: '1rem',
    color: '#666'
  },
  summaryText: {
    fontSize: '0.95rem'
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
    marginBottom: '1.5rem',
    border: '1px solid #ef9a9a'
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
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0'
  },
  tableHeader: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#555',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s'
  },
  tableCell: {
    padding: '1rem',
    color: '#333',
    fontSize: '0.95rem'
  },
  amount: {
    fontWeight: '600',
    fontSize: '1rem',
    color: '#2e7d32'
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textTransform: 'capitalize'
  },
  typeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    textTransform: 'capitalize'
  },
  viewButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
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
    padding: 0,
    maxWidth: '700px',
    width: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #f0f0f0'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0.25rem 0.5rem',
    lineHeight: '1'
  },
  modalBody: {
    padding: '2rem'
  },
  detailSection: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #4CAF50'
  },
  detailGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0'
  },
  detailLabel: {
    fontWeight: '500',
    color: '#666',
    fontSize: '0.95rem'
  },
  detailValue: {
    color: '#333',
    fontSize: '0.95rem',
    textAlign: 'right'
  },
  amountLarge: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2e7d32'
  },
  failureBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef9a9a',
    borderRadius: '8px',
    padding: '1rem'
  },
  failureReason: {
    color: '#c62828',
    fontSize: '0.95rem',
    margin: '0 0 0.5rem 0'
  },
  failureCode: {
    color: '#666',
    fontSize: '0.85rem',
    margin: 0,
    fontFamily: 'monospace'
  },
  modalFooter: {
    padding: '1rem 2rem',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  closeModalButton: {
    padding: '0.75rem 2rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  }
};
