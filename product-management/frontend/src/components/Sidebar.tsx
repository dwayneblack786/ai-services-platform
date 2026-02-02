import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../styles/Sidebar.styles';
import { SidebarProps } from '../types';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ onLogout, isOpen, setIsOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyRole } = useAuth();

  // Check if user is admin or project admin
  const isAdminUser = hasAnyRole('ADMIN', 'PROJECT_ADMIN');
 
  // Core menu items (always visible)
  const coreMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { path: '/users?view=tenant', label: 'Users', icon: '◯' },
    { path: '/products', label: 'Products', icon: '▣' },
    { path: '/subscriptions', label: 'Subscriptions', icon: '⟳' },
    { path: '/payment', label: 'Payment', icon: '≡' },
    { path: '/reports?view=tenant', label: 'Reports', icon: '▤' },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { path: '/admin', label: 'Admin Dashboard', icon: '⚙' },
  ];

  // Combine menu items based on role
  const menuItems = isAdminUser 
    ? [...coreMenuItems, ...adminMenuItems]
    : coreMenuItems;

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await onLogout();
    navigate('/home');
  };

  return (
    <>
      <button onClick={toggleSidebar} style={styles.toggleButton}>
        {isOpen ? '✕' : '☰'}
      </button>
      <div 
        style={isOpen ? styles.sidebar : styles.sidebarClosed}
        onClick={(e) => {
          // Close sidebar if clicking on the background (not on buttons)
          if (isOpen && e.target === e.currentTarget) {
            toggleSidebar();
          }
        }}
      >
        {isOpen && (
          <div style={styles.header}>
            <h2 style={styles.title}>Menu</h2>
          </div>
        )}
        <nav style={isOpen ? styles.nav : styles.navCollapsed}>
          {menuItems.map((item, index) => (
            <button
              key={item.path || `action-${index}`}
              onClick={() => navigate(item.path)}
              style={
                item.path && location.pathname === item.path
                  ? { ...(isOpen ? styles.navItem : styles.navItemCollapsed), ...styles.navItemActive }
                  : (isOpen ? styles.navItem : styles.navItemCollapsed)
              }
              title={!isOpen ? item.label : undefined}
            >
              <span style={styles.icon}>{item.icon}</span>
              {isOpen && <span style={styles.label}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.footer}>
          <button 
            onClick={handleLogout} 
            style={isOpen ? styles.logoutButton : styles.logoutButtonCollapsed}
            title={!isOpen ? 'Logout' : undefined}
          >
            <span style={styles.icon}>⏻</span>
            {isOpen && <span style={styles.label}>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
