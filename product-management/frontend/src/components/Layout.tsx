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
  const { logout, user, hasRole, refreshAuth } = useAuth();
  const isAuthenticated = !!user;
  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    },
    onError: (error) => {
      // Handle authentication failures from Socket.IO
      if (error.message === 'AUTH_FAILED') {
        console.warn('[Layout] Socket.IO authentication failed - refreshing auth state');
        refreshAuth().catch(err => {
          console.error('[Layout] Failed to refresh auth:', err);
        });
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
        {/* Real Estate Background SVG Pattern */}
        <div style={styles.headerBackground}>
          <svg 
            width="100%" 
            height="100%" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#000', stopOpacity: 0.4 }} />
                <stop offset="60%" style={{ stopColor: '#000', stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: '#000', stopOpacity: 0.95 }} />
              </linearGradient>
            </defs>
            <image 
              href="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80" 
              width="100%" 
              height="100%" 
              preserveAspectRatio="xMaxYMid slice"
              opacity="0.3"
            />
            <rect width="100%" height="100%" fill="url(#fadeGradient)" />
          </svg>
        </div>
        
        {/* Sidebar Toggle Button - Only show when authenticated */}
        {isAuthenticated && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1002,
              padding: '0.3rem 0.5rem',
              fontSize: '1rem',
              lineHeight: 1,
              color: '#e2e8f0',
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 6px rgba(0, 0, 0, 0.4)',
              height: '32px',
              width: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.8)';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
              e.currentTarget.style.boxShadow = '0 1px 6px rgba(0, 0, 0, 0.4)';
            }}
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
        )}
        
        {/* Company Name */}
        <div style={styles.headerContent}>
          <h1 
            style={{
              ...styles.companyName, 
              ...(isMobile ? styles.companyNameMobile : {})
            }}
            onClick={() => navigate('/home')}
          >
            Infero Agents
          </h1>
          {!isMobile && (
            <p style={styles.companyTagline}>Real Estate AI Platform</p>
          )}
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
      
      {/* Dim overlay when sidebar is open - click to close */}
      {isAuthenticated && isSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 998,
            cursor: 'pointer',
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Only show sidebar when authenticated */}
      {isAuthenticated && (
        <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      )}
      <main id="main-content" style={{
        ...styles.main,
        // Always same margin regardless of sidebar open state (sidebar overlays)
        marginLeft: isMobile ? '0' : (isAuthenticated ? '50px' : '0'),
        padding: isMobile ? '1rem' : '2rem',
        transition: 'margin-left 0.3s ease-in-out'
      }}>
        {children}
      </main>
      <footer style={{
        ...styles.footer, 
        ...(isMobile ? styles.footerMobile : {}),
        left: isMobile ? 0 : (isAuthenticated ? '50px' : '0'),
        transition: 'left 0.3s ease-in-out'
      }}>
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
