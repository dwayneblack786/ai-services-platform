import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../styles/Sidebar.styles';
import { SidebarProps } from '../types';
import { useAuth } from '../context/AuthContext';

// Consistent SVG icons at fixed 20x20 size
const Icon = ({ d, viewBox = '0 0 24 24' }: { d: string | string[]; viewBox?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
  >
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const NavIcons = {
  Home: () => <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  Dashboard: () => <Icon d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z']} />,
  Users: () => <Icon d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} />,
  Products: () => <Icon d={['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12']} />,
  Subscriptions: () => <Icon d={['M22 12h-4l-3 9L9 3l-3 9H2']} />,
  Payment: () => <Icon d={['M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M1 10h22']} />,
  Reports: () => <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']} />,
  Admin: () => <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} />,
  Logout: () => <Icon d={['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']} />,
};

const Sidebar = ({ onLogout, isOpen, setIsOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyRole } = useAuth();

  // Check if user is admin or project admin
  const isAdminUser = hasAnyRole('ADMIN', 'PROJECT_ADMIN');
 
  // Core menu items (always visible)
  const coreMenuItems = [
    { path: '/home', label: 'Home', icon: <NavIcons.Home /> },
    { path: '/dashboard', label: 'Dashboard', icon: <NavIcons.Dashboard /> },
    { path: '/users?view=tenant', label: 'Users', icon: <NavIcons.Users /> },
    { path: '/products', label: 'Products', icon: <NavIcons.Products /> },
    { path: '/subscriptions', label: 'Subscriptions', icon: <NavIcons.Subscriptions /> },
    { path: '/payment', label: 'Payment', icon: <NavIcons.Payment /> },
    { path: '/reports?view=tenant', label: 'Reports', icon: <NavIcons.Reports /> },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { path: '/admin', label: 'Admin Dashboard', icon: <NavIcons.Admin /> },
  ];

  // Combine menu items based on role
  const menuItems = isAdminUser 
    ? [...coreMenuItems, ...adminMenuItems]
    : coreMenuItems;

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout();
    navigate('/home');
  };

  return (
    <>
      <div 
        style={isOpen ? styles.sidebar : styles.sidebarClosed}
      >
        {/* Spacer to push content below the fixed header */}
        <div style={{ height: '100px', flexShrink: 0 }} />
        {isOpen && (
          <div style={styles.header}>
            <h2 style={styles.title}>Menu</h2>
          </div>
        )}
        <nav style={isOpen ? styles.nav : styles.navCollapsed}>
          {menuItems.map((item, index) => (
            <button
              key={item.path || `action-${index}`}
              onClick={() => { setIsOpen(false); navigate(item.path); }}
              style={
                item.path && location.pathname === item.path.split('?')[0]
                  ? { 
                      ...(isOpen ? styles.navItem : styles.navItemCollapsed), 
                      ...(isOpen ? styles.navItemActive : styles.navItemActiveCollapsed)
                    }
                  : (isOpen ? styles.navItem : styles.navItemCollapsed)
              }
              onMouseEnter={(e) => {
                if (!(item.path && location.pathname === item.path.split('?')[0])) {
                  e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!(item.path && location.pathname === item.path.split('?')[0])) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={!isOpen ? item.label : undefined}
            >
              <span style={styles.iconWrapper}>{item.icon}</span>
              {isOpen && <span style={styles.label}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.footer}>
          <button 
            onClick={handleLogout} 
            style={isOpen ? styles.logoutButton : styles.logoutButtonCollapsed}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
            }}
            title={!isOpen ? 'Logout' : undefined}
          >
            <span style={styles.iconWrapper}><NavIcons.Logout /></span>
            {isOpen && <span style={styles.label}>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
