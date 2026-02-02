import { CSSProperties } from 'react';

export const registrationStyles: { [key: string]: CSSProperties | ((arg: any) => CSSProperties) } = {
  // Container & Layout
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  } as CSSProperties,

  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  } as CSSProperties,

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  } as CSSProperties,

  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  } as CSSProperties,

  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '16px',
  } as CSSProperties,

  // Progress Bar
  progressBar: {
    height: '4px',
    background: '#e0e0e0',
    borderRadius: '2px',
    marginBottom: '32px',
    overflow: 'hidden',
  } as CSSProperties,

  progressFill: (progress: number): CSSProperties => ({
    height: '100%',
    background: '#667eea',
    width: `${progress}%`,
    transition: 'width 0.3s ease',
  }),

  // Progress Steps (circles)
  progressSteps: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '32px',
    position: 'relative',
  } as CSSProperties,

  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    position: 'relative',
    zIndex: 2,
  } as CSSProperties,

  progressCircle: (active: boolean): CSSProperties => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1rem',
    background: active ? '#667eea' : '#e0e0e0',
    color: active ? 'white' : '#999',
    transition: 'all 0.3s',
  }),

  progressLabel: (active: boolean): CSSProperties => ({
    fontSize: '0.75rem',
    color: active ? '#667eea' : '#999',
    textAlign: 'center',
    maxWidth: '80px',
  }),

  progressLine: {
    position: 'absolute',
    top: '20px',
    left: '0',
    right: '0',
    height: '2px',
    background: '#e0e0e0',
    zIndex: 1,
  } as CSSProperties,

  // Sections
  section: {
    marginBottom: '24px',
  } as CSSProperties,

  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,

  sectionIcon: {
    fontSize: '1.3rem',
  } as CSSProperties,

  // Form Elements (covered by FormInput and FormButton components)
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  } as CSSProperties,

  // Buttons
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    marginTop: '24px',
  } as CSSProperties,

  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flex: 1,
  } as CSSProperties,

  // Info boxes
  infoBox: {
    padding: '16px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '20px',
  } as CSSProperties,

  infoBoxTitle: {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  } as CSSProperties,

  infoBoxText: {
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: '1.5',
  } as CSSProperties,

  // Review/Summary
  summarySection: {
    marginBottom: '20px',
    padding: '16px',
    background: '#f9f9f9',
    borderRadius: '8px',
  } as CSSProperties,

  summaryTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#333',
  } as CSSProperties,

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e0e0e0',
  } as CSSProperties,

  summaryLabel: {
    color: '#666',
    fontSize: '0.9rem',
  } as CSSProperties,

  summaryValue: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  } as CSSProperties,

  // Success/Completion
  successIcon: {
    fontSize: '4rem',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: '16px',
  } as CSSProperties,

  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: '12px',
  } as CSSProperties,

  successMessage: {
    fontSize: '1rem',
    color: '#666',
    textAlign: 'center',
    lineHeight: '1.6',
    marginBottom: '24px',
  } as CSSProperties,

  // Link
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
  } as CSSProperties,

  linkContainer: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '0.9rem',
    color: '#666',
  } as CSSProperties,

  // Checkbox
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  } as CSSProperties,

  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    flexShrink: 0,
    marginTop: '2px',
  } as CSSProperties,

  checkboxLabel: {
    fontSize: '0.9rem',
    color: '#333',
    lineHeight: '1.5',
    cursor: 'pointer',
  } as CSSProperties,

  // List
  list: {
    listStyle: 'disc',
    paddingLeft: '20px',
    marginBottom: '16px',
  } as CSSProperties,

  listItem: {
    marginBottom: '8px',
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: '1.5',
  } as CSSProperties,

  // Badge
  badge: (color: string): CSSProperties => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    background: color === 'primary' ? '#667eea' : '#e0e0e0',
    color: color === 'primary' ? 'white' : '#666',
  }),

  // Divider
  divider: {
    height: '1px',
    background: '#e0e0e0',
    margin: '24px 0',
  } as CSSProperties,

  // Help Text
  helpText: {
    fontSize: '0.85rem',
    color: '#999',
    marginTop: '4px',
    marginBottom: '8px',
  } as CSSProperties,
};
