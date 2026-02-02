export const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    textAlign: 'center' as const
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '32px',
    textAlign: 'center' as const
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold' as const,
    marginBottom: '16px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box' as const
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px'
  },
  error: {
    color: '#f44336',
    fontSize: '0.9rem',
    marginBottom: '16px',
    textAlign: 'center' as const,
    padding: '12px',
    background: '#ffebee',
    borderRadius: '8px'
  },
  successMessage: {
    padding: '16px',
    background: '#e8f5e9',
    borderRadius: '8px',
    marginBottom: '20px',
    color: '#4CAF50',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const
  },
  errorMessage: {
    padding: '16px',
    background: '#ffebee',
    borderRadius: '8px',
    marginBottom: '20px',
    color: '#f44336',
    textAlign: 'left' as const
  },
  errorTitle: {
    margin: '0 0 8px',
    fontWeight: 'bold' as const
  },
  errorDetails: {
    margin: '0',
    fontSize: '0.85rem'
  },
  inputNoMargin: {
    marginBottom: 0
  }
};
