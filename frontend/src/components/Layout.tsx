import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import Sidebar from './Sidebar';
import SettingsDropdown from './SettingsDropdown';
import CircuitMonitor from './CircuitMonitor';
import MaintenanceNotification from './MaintenanceNotification';
import { styles } from '../styles/Layout.styles';
import { LayoutProps } from '../types';
import { UserRole } from '../types/shared';

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { logout, user, hasRole } = useAuth();
  const isAuthenticated = !!user;
  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    message: string;
    reconnectIn: number;
    timestamp: string;
  } | null>(null);

  // Socket.IO connection for maintenance notifications
  const { isReconnecting } = useSocket({
    autoConnect: isAuthenticated,
    onMaintenance: (data) => {
      console.log('[Layout] Maintenance notification received:', data);
      setMaintenanceInfo(data);
    },
    onConnect: () => {
      // Clear maintenance notification on successful reconnection
      if (maintenanceInfo) {
        console.log('[Layout] Reconnected - clearing maintenance notification');
        setTimeout(() => setMaintenanceInfo(null), 2000);
      }
    }
  });

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

  const handleLogout = async () => {
    await logout();
    navigate('/home');
  };

  return (
    <>
      {/* Maintenance Notification */}
      {(maintenanceInfo || isReconnecting) && (
        <MaintenanceNotification
          message={maintenanceInfo?.message || 'Reconnecting to server...'}
          reconnectIn={maintenanceInfo?.reconnectIn}
          isReconnecting={isReconnecting}
        />
      )}
      
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                minHeight: '40px',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              title="Go to Home"
            >
              ⌂ Home
            </button>
          )}
          <h1 
            style={{
              ...styles.companyName, 
              ...(isMobile ? styles.companyNameMobile : {}),
              cursor: 'pointer',
              margin: 0
            }}
            onClick={() => navigate('/home')}
          >
            Infero Agents
          </h1>
        </div>
        {!isAuthenticated && (
          <button
            onClick={() => navigate('/login')}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '10px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              minHeight: '44px',
              zIndex: 1000
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#45a049')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
          >
            Sign In
          </button>
        )}
      </header>
      {isAuthenticated && (
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
      )}
      
      {/* Overlay for mobile when sidebar is open */}
      {isAuthenticated && isMobile && isSidebarOpen && (
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
      
      {isAuthenticated && (
        <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      )}
      <main id="main-content" style={{
        ...styles.main,
        marginLeft: isMobile ? '0' : (isAuthenticated && isSidebarOpen ? '250px' : '0'),
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
