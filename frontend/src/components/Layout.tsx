import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import SettingsDropdown from './SettingsDropdown';
import CircuitMonitor from './CircuitMonitor';
import { styles } from '../styles/Layout.styles';
import { LayoutProps } from '../types';
import { UserRole } from '../types/shared';

const Layout = ({ children }: LayoutProps) => {
  const { logout, user, hasRole } = useAuth();
  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size and update sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Close sidebar by default on mobile
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const copyTenantId = () => {
    if (user?.tenantId) {
      navigator.clipboard.writeText(user.tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN': return '#dc3545';
      case 'PROJECT_ADMIN': return '#e83e8c';
      case 'ANALYST': return '#17a2b8';
      case 'DEVELOPER': return '#28a745';
      case 'CLIENT': return '#ffc107';
      default: return '#6c757d';
    }
  };

  return (
    <>
      <header style={styles.header}>
        <h1 style={{...styles.companyName, ...(isMobile ? styles.companyNameMobile : {})}}>
          Infero Agents
        </h1>
      </header>
      <div id="user-info-container" style={{
        ...styles.userInfoContainer,
        ...(isMobile ? styles.userInfoContainerMobile : {}),
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexDirection: 'row'
      }}>
        {/* Circuit Breaker Status Monitor */}
        <CircuitMonitor compact={true} />
        
        {isProjectAdmin && <SettingsDropdown />}
        <div id="user-info" style={{...styles.userInfo, ...(isMobile ? styles.userInfoMobile : {})}}>
          <div id="user-details">
            <span style={{...styles.userName, ...(isMobile ? styles.userNameMobile : {})}}>{user?.name}</span>
            {!isMobile && (
              <div id="tenant-id-container" style={styles.tenantIdContainer}>
                <span style={styles.tenantId}>Tenant: {user?.tenantId}</span>
                <button
                  onClick={copyTenantId}
                  style={styles.copyButton}
                  title="Copy Tenant ID"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            )}
          </div>
          <span style={{...styles.roleBadge, backgroundColor: getRoleBadgeColor(user?.role)}}>
            {user?.role}
          </span>
        </div>
      </div>
      
      {/* Overlay for mobile when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div
          id="mobile-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main id="main-content" style={{
        ...styles.main,
        marginLeft: isMobile ? '0' : (isSidebarOpen ? '250px' : '0'),
        padding: isMobile ? '1rem' : '2rem',
        transition: 'margin-left 0.3s ease-in-out'
      }}>
        {children}
      </main>
      <footer style={{...styles.footer, ...(isMobile ? styles.footerMobile : {})}}>
        <div id="footer-links" style={{...styles.footerLinks, ...(isMobile ? styles.footerLinksMobile : {})}}>
          <a href="#" style={styles.footerLink} title="Contact Us">
            <span style={styles.footerIcon}>📧</span>
          </a>
          <a href="#" style={styles.footerLink} title="Privacy">
            <span style={styles.footerIcon}>🔒</span>
          </a>
          <a href="#" style={styles.footerLink} title="About Us">
            <span style={styles.footerIcon}>ℹ️</span>
          </a>
        </div>
        {!isMobile && (
          <div id="footer-copyright" style={styles.copyright}>
            <span>© {new Date().getFullYear()} Infero Agents</span>
          </div>
        )}
      </footer>
    </>
  );
};

export default Layout;
