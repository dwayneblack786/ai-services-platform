import React from 'react';

export const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#667eea'
  },
  paymentMethodCard: (isSelected: boolean): React.CSSProperties => ({
    border: isSelected ? '2px solid #667eea' : '2px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: isSelected ? '#f8f9ff' : 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }),
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  cardIcon: {
    fontSize: '2rem'
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  cardBrand: {
    fontWeight: 'bold',
    textTransform: 'capitalize' as const,
    fontSize: '1rem'
  },
  cardNumber: {
    color: '#666',
    fontSize: '0.9rem'
  },
  defaultBadge: {
    background: '#4CAF50',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  addNewButton: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: '2px dashed #667eea',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#333'
  },
  input: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.2s'
  },
  button: {
    padding: '14px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  secondaryButton: {
    padding: '14px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  error: {
    color: '#f44336',
    fontSize: '0.9rem',
    marginTop: '8px'
  },
  success: {
    color: '#4CAF50',
    fontSize: '0.9rem',
    marginTop: '8px'
  },
  securityNote: {
    background: '#f8f9ff',
    border: '1px solid #667eea',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px',
    display: 'flex',
    alignItems: 'start',
    gap: '12px'
  },
  securityIcon: {
    fontSize: '1.5rem'
  },
  securityText: {
    fontSize: '0.85rem',
    color: '#666',
    lineHeight: '1.6'
  }
};
