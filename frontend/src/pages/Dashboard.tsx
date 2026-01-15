import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { styles } from '../styles/Dashboard.styles';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={isMobile ? styles.containerMobile : styles.container}>
        <div style={styles.header}>
          <h1 style={isMobile ? styles.titleMobile : styles.title}>Dashboard</h1>
        </div>
        <div style={isMobile ? styles.cardMobile : styles.card}>
        <div style={styles.profileSection}>
          {user?.picture && !isDev ? (
            <img src={user.picture} alt="Profile Img" style={isMobile ? styles.avatarMobile : styles.avatar} title='Profile Picture'  />
          ) : (
            <div style={isMobile ? styles.avatarPlaceholderMobile : styles.avatarPlaceholder} title='Missing picture or in local development'>🧑</div>
          ) }
          <h2 style={isMobile ? styles.nameMobile : styles.name}>{user?.name}</h2>
          <p style={styles.email}>{user?.email}</p>
        </div>
        <div style={styles.infoSection}>
          <h3 style={styles.sectionTitle}>Account Information</h3>
          <div style={styles.infoItem}>
            <span style={styles.label}>User ID:</span>
            <span style={styles.value}>{user?.id}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Email:</span>
            <span style={styles.value}>{user?.email}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Name:</span>
            <span style={styles.value}>{user?.name}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Role:</span>
            <span style={styles.value}>{user?.role}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Tenant ID:</span>
            <span style={styles.value}>{user?.tenantId}</span>
          </div>
        </div>
        <div style={styles.navigationSection}>
          <h3 style={styles.sectionTitle}>Quick Access</h3>
          <div style={isMobile ? styles.navGridMobile : styles.navGrid}>
            <button onClick={() => navigate('/users')} style={isMobile ? styles.navButtonMobile : styles.navButton}>
              <span style={styles.navIcon}>👥</span>
              <span style={styles.navLabel}>Users</span>
            </button>
            <button onClick={() => navigate('/products')} style={isMobile ? styles.navButtonMobile : styles.navButton}>
              <span style={styles.navIcon}>📦</span>
              <span style={styles.navLabel}>Products</span>
            </button>
            <button onClick={() => navigate('/billing')} style={isMobile ? styles.navButtonMobile : styles.navButton}>
              <span style={styles.navIcon}>💳</span>
              <span style={styles.navLabel}>Billing</span>
            </button>
            <button onClick={() => navigate('/reports')} style={isMobile ? styles.navButtonMobile : styles.navButton}>
              <span style={styles.navIcon}>📊</span>
              <span style={styles.navLabel}>Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
