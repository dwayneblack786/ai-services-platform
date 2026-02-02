import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/shared';
import { styles } from '../styles/Settings.styles';

const Settings = () => {
  const { hasRole } = useAuth();

  // Only PROJECT_ADMIN can access settings
  if (!hasRole(UserRole.PROJECT_ADMIN)) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Access Denied</h1>
          <p style={styles.description}>
            You need project administrator privileges to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Settings</h1>
        <p style={styles.description}>
          Configure your application settings and preferences. Manage system settings,
          user configurations, and application behavior.
        </p>
      </div>
    </div>
  );
};

export default Settings;
