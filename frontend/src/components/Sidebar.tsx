import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../styles/Sidebar.styles';
import { SidebarProps } from '../types';

const Sidebar = ({ onLogout, isOpen, setIsOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Core menu items (always visible)
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/users?view=tenant', label: 'Users', icon: '👥' },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/subscriptions', label: 'Subscriptions', icon: '🔔' },
    { path: '/payment', label: 'Payment', icon: '💳' },
    { path: '/reports?view=tenant', label: 'Reports', icon: '📊' },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button onClick={toggleSidebar} style={styles.toggleButton}>
        {isOpen ? '✕' : '☰'}
      </button>
      <div style={isOpen ? styles.sidebar : styles.sidebarClosed}>
        <div style={styles.header}>
          <h2 style={styles.title}>Menu</h2>
        </div>
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={
                location.pathname === item.path
                  ? { ...styles.navItem, ...styles.navItemActive }
                  : styles.navItem
              }
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={styles.footer}>
          <button onClick={onLogout} style={styles.logoutButton}>
            <span style={styles.icon}>🚪</span>
            <span style={styles.label}>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
