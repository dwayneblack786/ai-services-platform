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
      
      <header id="app-header" style={styles.header}>
        {/* Real Estate Background SVG Pattern */}
        <div id="header-background" style={styles.headerBackground}>
          <svg 
            width="100%" 
            height="100%" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <defs>
              {/* Warm-to-dark overlay: preserves vibrancy on left, fades to navy on right */}
              <linearGradient id="headerOverlay" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#0a0f1a', stopOpacity: 0.05 }} />
                <stop offset="40%" style={{ stopColor: '#0a0f1a', stopOpacity: 0.55 }} />
                <stop offset="100%" style={{ stopColor: '#0a0f1a', stopOpacity: 0.96 }} />
              </linearGradient>
              {/* Blue accent shimmer on the left edge */}
              <linearGradient id="accentEdge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 0.22 }} />
                <stop offset="25%" style={{ stopColor: '#2563eb', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {/* Vibrant luxury penthouse / aerial city at dusk — warm amber + deep blue sky */}
            <image 
              href="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1400&q=85"
              width="100%" 
              height="100%" 
              preserveAspectRatio="xMidYMid slice"
              opacity="0.55"
            />
            {/* Dark overlay fading right-to-opaque */}
            <rect width="100%" height="100%" fill="url(#headerOverlay)" />
            {/* Blue left-edge accent */}
            <rect width="100%" height="100%" fill="url(#accentEdge)" />
            {/* Thin blue bottom border line */}
            <line x1="0" y1="99%" x2="100%" y2="99%" stroke="rgba(37,99,235,0.5)" strokeWidth="1.5" />
          </svg>
        </div>
        
        {/* Sidebar Toggle Button - Only show when authenticated */}
        {isAuthenticated && (
          <button
            id="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
            aria-label={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
            style={styles.sidebarToggle}
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
        <div id="header-brand" style={styles.headerContent}>
          <h1
            id="company-name"
            style={{
              ...styles.companyName, 
              ...(isMobile ? styles.companyNameMobile : {})
            }}
            onClick={() => navigate('/home')}
            title="Go to home"
            aria-label="Infero Agents — Go to home"
          >
            Infero Agents
          </h1>
          {!isMobile && (
            <p id="company-tagline" style={styles.companyTagline}>Real Estate AI Platform</p>
          )}
        </div>
        {!isAuthenticated && (
          <button
            id="sign-in-btn"
            onClick={() => navigate('/login')}
            title="Sign in to your account"
            aria-label="Sign in to your account"
            style={{
              ...styles.signInButton,
              ...(isMobile ? styles.signInButtonMobile : {}),
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
          ...styles.userInfoRow,
        }}>
        {/* Circuit Breaker Status Monitor */}
        <div id="circuit-monitor">
          <CircuitMonitor compact={true} />
        </div>
        
        <div id="user-info" style={{...styles.userInfo, ...(isMobile ? styles.userInfoMobile : {})}}>
          {/* Admin settings — only visible to PROJECT_ADMIN */}
          {isProjectAdmin && <SettingsDropdown />}
          {/* Avatar circle */}
          <div id="user-avatar" style={styles.userAvatar} title={user?.name ? `Signed in as ${user.name}` : 'User avatar'}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          {/* Divider */}
          <div id="user-info-divider" style={styles.userInfoDivider} />
          <div id="user-details">
            <span style={{...styles.userName, ...(isMobile ? styles.userNameMobile : {})}}>{user?.name}</span>
            {!isMobile && (
              <div id="tenant-id-container" style={styles.tenantIdContainer}>
                <span style={styles.tenantId}>Tenant: {user?.tenantId}</span>
                <button
                  id="copy-tenant-btn"
                  onClick={copyTenantId}
                  style={styles.copyButton}
                  title="Copy Tenant ID"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            )}
          </div>
          <span id="user-role-badge" style={{...styles.roleBadge, backgroundColor: getRoleBadgeColor(user?.role)}} title={`Your role: ${user?.role ?? 'Unknown'}`}>
            {user?.role}
          </span>
        </div>
      </div>
      )}
      
      {/* Dim overlay when sidebar is open - click to close */}
      {isAuthenticated && isSidebarOpen && (
        <div
          id="sidebar-overlay"
          style={styles.sidebarOverlay}
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
      <footer id="app-footer" style={{
        ...styles.footer, 
        ...(isMobile ? styles.footerMobile : {}),
        left: isMobile ? 0 : (isAuthenticated ? '50px' : '0'),
        transition: 'left 0.3s ease-in-out'
      }}>
        <div id="footer-links" style={{...styles.footerLinks, ...(isMobile ? styles.footerLinksMobile : {})}}>
          <a href="/contact" style={styles.footerLink} title="Contact Us" aria-label="Contact Us">
            <span style={styles.footerIcon}>📧</span>
          </a>
          <a href="/privacy" style={styles.footerLink} title="Privacy Policy" aria-label="Privacy Policy">
            <span style={styles.footerIcon}>🔒</span>
          </a>
          <a href="/about" style={styles.footerLink} title="About Us" aria-label="About Infero Agents">
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
