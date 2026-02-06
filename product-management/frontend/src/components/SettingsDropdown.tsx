import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/shared';
import { styles } from '../styles/SettingsDropdown.styles';

const SettingsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);

  // Only show settings dropdown to PROJECT_ADMIN
  if (!isProjectAdmin) {
    return null;
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div style={styles.container}>
      <button onClick={toggleDropdown} style={styles.button}>
        <span style={styles.icon}>⚙️</span>
      </button>
      {isOpen && (
        <div style={styles.dropdown}>
          <button onClick={() => handleNavigation('/settings')} style={styles.dropdownItem}>
            <span style={styles.itemIcon}>⚙️</span>
            <span>Settings</span>
          </button>
          <button onClick={() => handleNavigation('/users?view=all')} style={styles.dropdownItem}>
            <span style={styles.itemIcon}>👥</span>
            <span>All Users</span>
          </button>
          <button onClick={() => handleNavigation('/tenants')} style={styles.dropdownItem}>
            <span style={styles.itemIcon}>🏢</span>
            <span>Tenants</span>
          </button>
          <button onClick={() => handleNavigation('/reports?view=all')} style={styles.dropdownItem}>
            <span style={styles.itemIcon}>📊</span>
            <span>All Reports</span>
          </button>
          <button onClick={() => handleNavigation('/prompts')} style={styles.dropdownItem}>
            <span style={styles.itemIcon}>📝</span>
            <span>Prompt Management</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;
