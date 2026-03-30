import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../styles/Sidebar.styles';
import { SidebarProps } from '../types';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

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
  Listing: () => <Icon d={['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0']} />,
  Lock: () => <Icon d={['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4']} />,
};

const Sidebar = ({ onLogout, isOpen, setIsOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyRole } = useAuth();

  const isAdminUser = hasAnyRole('ADMIN', 'PROJECT_ADMIN');
  const bypassSubscription = isAdminUser;

  // Track which Real Estate AI products the tenant is subscribed to
  const [subscribedSlugs, setSubscribedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const fetchSubscriptions = async () => {
      try {
        const [productsRes, subsRes] = await Promise.all([
          apiClient.get('/api/products'),
          apiClient.get('/api/subscriptions').catch(() => ({ data: { subscriptions: [] } })),
        ]);

        const products: any[] = productsRes.data.products || [];
        const subs: any[] = subsRes.data.subscriptions || [];

        const activeProductIds = new Set(
          subs
            .filter(s => ['active', 'trial'].includes(s.status))
            .map(s => String(s.productId))
        );

        const subscribed = new Set<string>();
        for (const product of products) {
          const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-');
          if (activeProductIds.has(String(product._id))) {
            subscribed.add(slug);
          }
        }

        if (!cancelled) setSubscribedSlugs(subscribed);
      } catch {
        // Non-critical — sidebar still renders, products just show as locked
      }
    };
    fetchSubscriptions();
    return () => { cancelled = true; };
  }, []);

  const coreMenuItems = [
    { path: '/home', label: 'Home', icon: <NavIcons.Home />, slug: undefined },
    { path: '/dashboard', label: 'Dashboard', icon: <NavIcons.Dashboard />, slug: undefined },
    { path: '/users?view=tenant', label: 'Users', icon: <NavIcons.Users />, slug: undefined },
    { path: '/products', label: 'Products', icon: <NavIcons.Products />, slug: undefined },
    { path: '/subscriptions', label: 'Subscriptions', icon: <NavIcons.Subscriptions />, slug: undefined },
    { path: '/payment', label: 'Payment', icon: <NavIcons.Payment />, slug: undefined },
    { path: '/reports?view=tenant', label: 'Reports', icon: <NavIcons.Reports />, slug: undefined },
    { path: '/listinglift', label: 'ListingLift', icon: <NavIcons.Listing />, slug: 'listing-lift' },
  ];

  const adminMenuItems = [
    { path: '/admin', label: 'Admin Dashboard', icon: <NavIcons.Admin />, slug: undefined },
  ];

  const menuItems = isAdminUser
    ? [...coreMenuItems, ...adminMenuItems]
    : coreMenuItems;

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout();
    navigate('/home');
  };

  const isActive = (path: string) => location.pathname === path.split('?')[0]
    || (path !== '/home' && location.pathname.startsWith(path.split('?')[0]));

  return (
    <>
      <div style={isOpen ? styles.sidebar : styles.sidebarClosed}>
        <div style={{ height: '72px', flexShrink: 0 }} />
        {isOpen && (
          <div style={styles.header}>
            <h2 style={styles.title}>Menu</h2>
          </div>
        )}

        {/* Core nav */}
        <nav style={isOpen ? styles.nav : styles.navCollapsed}>
          {menuItems.map((item, index) => {
            const locked = !!item.slug && !bypassSubscription && !subscribedSlugs.has(item.slug);
            const active = isActive(item.path);
            return (
              <button
                key={item.path || `action-${index}`}
                onClick={() => { setIsOpen(false); navigate(item.path); }}
                style={
                  active
                    ? { ...(isOpen ? styles.navItem : styles.navItemCollapsed), ...(isOpen ? styles.navItemActive : styles.navItemActiveCollapsed) }
                    : (isOpen ? styles.navItem : styles.navItemCollapsed)
                }
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                title={!isOpen ? item.label : undefined}
              >
                <span style={styles.iconWrapper}>
                  {locked ? <NavIcons.Lock /> : item.icon}
                </span>
                {isOpen && (
                  <span style={locked ? { ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } : styles.label}>
                    <span>{item.label}</span>
                    {locked && <span style={upgradeBadgeStyle}>Upgrade</span>}
                  </span>
                )}
              </button>
            );
          })}
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


const upgradeBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: '#10b981',
  padding: '2px 6px',
  borderRadius: '8px',
  flexShrink: 0,
};

export default Sidebar;
