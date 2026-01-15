import React from 'react';

export const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  } as React.CSSProperties,
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  } as React.CSSProperties,
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    textAlign: 'center'
  } as React.CSSProperties,
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '32px',
    textAlign: 'center'
  } as React.CSSProperties,
  toggleContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    borderRadius: '12px',
    background: '#f5f5f5',
    padding: '6px'
  } as React.CSSProperties,
  toggleButton: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#667eea' : 'transparent',
    color: active ? 'white' : '#666',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }),
  section: {
    marginBottom: '24px'
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '8px'
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  } as React.CSSProperties,
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  } as React.CSSProperties,
  button: {
    width: '100%',
    padding: '14px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px'
  } as React.CSSProperties,
  secondaryButton: {
    width: '100%',
    padding: '12px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: '16px'
  } as React.CSSProperties,
  error: {
    color: '#f44336',
    fontSize: '0.9rem',
    marginBottom: '16px',
    textAlign: 'center'
  } as React.CSSProperties,
  success: {
    color: '#4CAF50',
    fontSize: '0.9rem',
    marginBottom: '16px',
    padding: '12px',
    background: '#e8f5e9',
    borderRadius: '8px',
    textAlign: 'center'
  } as React.CSSProperties,
  successContainer: {
    padding: '24px'
  } as React.CSSProperties,
  successIcon: {
    fontSize: '3rem',
    marginBottom: '16px'
  } as React.CSSProperties,
  successTitle: {
    fontSize: '1.5rem',
    marginBottom: '12px',
    color: '#4CAF50'
  } as React.CSSProperties,
  successText: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '12px'
  } as React.CSSProperties,
  successSubText: {
    color: '#666',
    lineHeight: '1.6',
    fontSize: '0.9rem'
  } as React.CSSProperties,
  tenantDescription: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '12px'
  } as React.CSSProperties,
  validatedCompany: {
    marginLeft: '12px',
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid #4CAF50',
    borderRadius: '4px',
    color: '#4CAF50',
    cursor: 'pointer',
    fontSize: '0.8rem'
  } as React.CSSProperties,
  checkboxContainer: (isNewCustomer: boolean): React.CSSProperties => ({
    marginBottom: '24px',
    padding: '16px',
    background: isNewCustomer ? '#e8f5e9' : '#f5f5f5',
    borderRadius: '8px',
    border: isNewCustomer ? '2px solid #4CAF50' : '2px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }),
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  } as React.CSSProperties,
  checkboxLabel: (isNewCustomer: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: isNewCustomer ? '#4CAF50' : '#666'
  }),
  adminDescription: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '12px'
  } as React.CSSProperties,
  errorContainer: {
    background: '#ffebee',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'left'
  } as React.CSSProperties,
  errorTitle: {
    margin: '0 0 8px',
    fontWeight: 'bold'
  } as React.CSSProperties,
  errorDetails: {
    margin: '0',
    fontSize: '0.85rem'
  } as React.CSSProperties,
  useTenantButton: {
    marginTop: '12px',
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  } as React.CSSProperties,
  link: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '0.95rem'
  } as React.CSSProperties,
  linkButton: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 'bold',
    cursor: 'pointer'
  } as React.CSSProperties,
};
