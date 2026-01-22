import { CSSProperties } from 'react';

export const styles: { [key: string]: CSSProperties } = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '20px',
  },

  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #4CAF50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // Hero Section
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '80px 60px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    minHeight: '500px',
    gap: '40px',
  },

  heroMobile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    minHeight: '400px',
    textAlign: 'center',
  },

  heroContent: {
    flex: 1,
    maxWidth: '600px',
  },

  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: '1.2',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },

  heroTitleMobile: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    lineHeight: '1.3',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },

  heroSubtitle: {
    fontSize: '1.3rem',
    marginBottom: '40px',
    opacity: 0.95,
    lineHeight: '1.6',
  },

  heroSubtitleMobile: {
    fontSize: '1rem',
    marginBottom: '30px',
    opacity: 0.95,
    lineHeight: '1.5',
  },

  ctaButton: {
    padding: '16px 40px',
    fontSize: '1.2rem',
    fontWeight: '600',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    minHeight: '50px',
  },

  ctaButtonMobile: {
    padding: '14px 32px',
    fontSize: '1rem',
    fontWeight: '600',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    minHeight: '48px',
    width: '100%',
    maxWidth: '300px',
  },

  heroImage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroImagePlaceholder: {
    width: '400px',
    height: '400px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255,255,255,0.2)',
  },

  heroImageIcon: {
    fontSize: '150px',
  },

  // Features Section
  featuresSection: {
    padding: '80px 60px',
    backgroundColor: 'white',
  },

  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333',
  },

  sectionTitleMobile: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '16px',
    color: '#333',
    padding: '0 20px',
  },

  sectionSubtitle: {
    fontSize: '1.2rem',
    textAlign: 'center',
    marginBottom: '50px',
    color: '#666',
    maxWidth: '700px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },

  featuresGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '0 20px',
  },

  featureCard: {
    padding: '30px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
  },

  featureIcon: {
    fontSize: '3rem',
    marginBottom: '20px',
  },

  featureTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333',
  },

  featureDescription: {
    fontSize: '1rem',
    color: '#666',
    lineHeight: '1.6',
  },

  // Products Section
  productsSection: {
    padding: '80px 60px',
    backgroundColor: '#f8f9fa',
  },

  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  productsGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '0 20px',
  },

  productCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
  },

  productImageContainer: {
    position: 'relative',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productImageIcon: {
    fontSize: '80px',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
  },

  productCategoryBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    fontSize: '2.5rem',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))',
    lineHeight: '1',
  },

  productContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },

  productTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#333',
  },

  productDescription: {
    fontSize: '0.95rem',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '20px',
    flex: 1,
  },

  productFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },

  productFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#555',
  },

  checkIcon: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: '1rem',
  },

  productFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
    gap: '15px',
  },

  productPricing: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  priceLabel: {
    fontSize: '0.8rem',
    color: '#888',
  },

  priceValue: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#4CAF50',
  },

  pricingModel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#666',
  },

  exploreButton: {
    padding: '10px 24px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '44px',
    whiteSpace: 'nowrap',
  },

  viewAllContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '50px',
  },

  viewAllButton: {
    padding: '14px 40px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
    minHeight: '50px',
  },

  // CTA Section
  ctaSection: {
    padding: '80px 60px',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: 'white',
    textAlign: 'center',
  },

  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },

  ctaTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },

  ctaTitleMobile: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    padding: '0 20px',
  },

  ctaSubtitle: {
    fontSize: '1.2rem',
    marginBottom: '40px',
    opacity: 0.95,
  },

  ctaSubtitleMobile: {
    fontSize: '1rem',
    marginBottom: '30px',
    opacity: 0.95,
    padding: '0 20px',
  },

  ctaButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  ctaPrimaryButton: {
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: '600',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    minHeight: '50px',
    minWidth: '180px',
  },

  ctaSecondaryButton: {
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '50px',
    minWidth: '180px',
  },
};
