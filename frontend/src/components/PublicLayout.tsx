import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../styles/Layout.styles';
import { LayoutProps } from '../types';

const PublicLayout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <header style={styles.header}>
        <h1 
          style={{
            ...styles.companyName, 
            ...(isMobile ? styles.companyNameMobile : {}),
            cursor: 'pointer'
          }}
          onClick={() => navigate('/home')}
        >
          Infero Agents
        </h1>
      </header>
      
      <main id="main-content" style={{
        ...styles.main,
        marginLeft: '0',
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

export default PublicLayout;
