import { styles } from '../../src/styles/Billing.styles';

const Billing = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Billing</h1>
        <p style={styles.description}>
          Access billing information and invoices. This section provides detailed billing records,
          payment history, and financial transaction management.
        </p>
      </div>
    </div>
  );
};

export default Billing;
