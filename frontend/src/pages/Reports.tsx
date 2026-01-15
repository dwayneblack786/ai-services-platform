import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/shared';
import { styles } from '../styles/Reports.styles';

const Reports = () => {
  const { hasRole } = useAuth();
  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);

  if (!isProjectAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Access Denied</h1>
          <p style={styles.description}>
            Only PROJECT_ADMIN users can view reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Reports</h1>
        <p style={styles.description}>
          View and generate comprehensive reports on your business analytics, performance metrics, and data insights.
        </p>
      </div>
      <div style={styles.card}>
        <div style={styles.content}>
          <p>Reports functionality coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
