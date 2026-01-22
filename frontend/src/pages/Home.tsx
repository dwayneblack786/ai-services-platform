import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { getApiUrl } from '../config/api';
import { logger } from '../utils/logger';
import { styles } from '../styles/Home.styles';
import { Product } from '../types';

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<string>('All');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(getApiUrl('api/products'));
      if (response.data.success) {
        // Show all products including inactive ones
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from products
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Filter products by active tab
  const filteredProducts = activeTab === 'All' 
    ? products 
    : products.filter(p => p.category === activeTab);

  const getProductVisuals = (product: Product) => {
    const name = product.name.toLowerCase();
    const description = product.description.toLowerCase();
    
    // Healthcare
    if (name.includes('healthcare') || name.includes('medical') || description.includes('healthcare')) {
      return {
        primary: '🏥',
        secondary: '⚕️',
        gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' // Medical blue
      };
    }
    
    // Real Estate
    if (name.includes('real estate') || name.includes('property') || description.includes('real estate')) {
      return {
        primary: '🏡',
        secondary: '🔑',
        gradient: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' // Warm orange-yellow
      };
    }
    
    // Financial Services
    if (name.includes('financial') || name.includes('banking') || description.includes('financial')) {
      return {
        primary: '💰',
        secondary: '📊',
        gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' // Money green
      };
    }
    
    // E-commerce
    if (name.includes('ecommerce') || name.includes('e-commerce') || name.includes('retail') || description.includes('ecommerce')) {
      return {
        primary: '🛍️',
        secondary: '💳',
        gradient: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' // Vibrant red-orange
      };
    }
    
    // Education
    if (name.includes('education') || name.includes('learning') || description.includes('education')) {
      return {
        primary: '🎓',
        secondary: '📚',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' // Academic purple
      };
    }
    
    // Legal Services
    if (name.includes('legal') || name.includes('law') || description.includes('legal')) {
      return {
        primary: '⚖️',
        secondary: '📜',
        gradient: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' // Professional dark blue
      };
    }
    
    // Customer Support
    if (name.includes('support') || name.includes('customer') || description.includes('customer support')) {
      return {
        primary: '🎧',
        secondary: '💬',
        gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)' // Support purple
      };
    }
    
    // Default fallback based on category
    const category = product.category;
    if (category === 'Virtual Assistant') {
      return {
        primary: '💬',
        secondary: '🎤',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      };
    } else if (category === 'IDP') {
      return {
        primary: '📑',
        secondary: '🔍',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      };
    } else if (category === 'Computer Vision') {
      return {
        primary: '📸',
        secondary: '🖼️',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      };
    }
    
    return {
      primary: '⚡',
      secondary: '✨',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
  };

  const handleExploreProduct = (productId?: string) => {
    if (productId) {
      navigate(`/products`);
    }
  };

  const handleViewAllProducts = () => {
    navigate('/products');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading amazing AI services...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <section style={isMobile ? styles.heroMobile : styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={isMobile ? styles.heroTitleMobile : styles.heroTitle}>
            Transform Your Business with AI
          </h1>
          <p style={isMobile ? styles.heroSubtitleMobile : styles.heroSubtitle}>
            Powerful AI-driven solutions to automate, analyze, and accelerate your workflows
          </p>
          <button
            onClick={handleViewAllProducts}
            style={isMobile ? styles.ctaButtonMobile : styles.ctaButton}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Explore All Products
          </button>
        </div>
        <div style={styles.heroImage}>
          <div style={styles.heroImagePlaceholder}>
            <span style={styles.heroImageIcon}>🚀</span>
          </div>
        </div>
      </section>

      <section style={styles.featuresSection}>
        <h2 style={isMobile ? styles.sectionTitleMobile : styles.sectionTitle}>
          Why Choose Infero Agents?
        </h2>
        <div style={isMobile ? styles.featuresGridMobile : styles.featuresGrid}>
          <div 
            style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.featureIcon}>⚡</div>
            <h3 style={styles.featureTitle}>Lightning Fast</h3>
            <p style={styles.featureDescription}>
              Deploy AI solutions in minutes, not months
            </p>
          </div>
          <div 
            style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.featureIcon}>🔒</div>
            <h3 style={styles.featureTitle}>Enterprise Security</h3>
            <p style={styles.featureDescription}>
              Bank-grade security with multi-tenant isolation
            </p>
          </div>
          <div 
            style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.featureIcon}>🎯</div>
            <h3 style={styles.featureTitle}>Customizable</h3>
            <p style={styles.featureDescription}>
              Tailor every aspect to fit your business needs
            </p>
          </div>
          <div 
            style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Analytics Built-in</h3>
            <p style={styles.featureDescription}>
              Real-time insights and comprehensive reporting
            </p>
          </div>
        </div>
      </section>

      <section style={styles.productsSection}>
        <h2 style={isMobile ? styles.sectionTitleMobile : styles.sectionTitle}>
          Our AI Solutions
        </h2>
        <p style={styles.sectionSubtitle}>
          Discover cutting-edge AI products designed to solve real business challenges
        </p>
        
        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '40px',
          flexWrap: 'wrap',
          padding: isMobile ? '0 20px' : '0'
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: activeTab === category ? '#4CAF50' : 'white',
                color: activeTab === category ? 'white' : '#333',
                border: `2px solid ${activeTab === category ? '#4CAF50' : '#e0e0e0'}`,
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minHeight: '44px',
                boxShadow: activeTab === category ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== category) {
                  e.currentTarget.style.borderColor = '#4CAF50';
                  e.currentTarget.style.color = '#4CAF50';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== category) {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.color = '#333';
                }
              }}
            >
              {category}
            </button>
          ))}
        </div>

        <div style={isMobile ? styles.productsGridMobile : styles.productsGrid}>
          {filteredProducts.map((product) => {
            const visuals = getProductVisuals(product);
            const isComingSoon = product.status === 'coming-soon' || product.status === 'beta';
            
            return (
            <div 
              key={product._id} 
              style={{
                ...styles.productCard,
                opacity: isComingSoon ? 0.85 : 1,
                position: 'relative' as const
              }}
              onMouseEnter={(e) => {
                if (!isComingSoon) {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isComingSoon) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                }
              }}
            >
              {isComingSoon && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)',
                  zIndex: 10,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.5px'
                }}>
                  🚀 Coming Soon
                </div>
              )}
              <div style={{
                ...styles.productImageContainer,
                background: visuals.gradient,
                filter: isComingSoon ? 'grayscale(30%)' : 'none'
              }}>
                <div style={styles.productImage}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={styles.productImageIcon}>
                      {visuals.primary}
                    </span>
                    <span style={{
                      fontSize: '40px',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                      opacity: 0.9
                    }}>
                      {visuals.secondary}
                    </span>
                  </div>
                </div>
                <div style={styles.productCategoryBadge}>
                  {product.category}
                </div>
              </div>
              
              <div style={styles.productContent}>
                <h3 style={styles.productTitle}>{product.name}</h3>
                <p style={styles.productDescription}>
                  {product.description.substring(0, 120)}...
                </p>
                
                <div style={styles.productFeatures}>
                  {product.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} style={styles.productFeatureItem}>
                      <span style={styles.checkIcon}>✓</span>
                      <span>{feature.substring(0, 40)}{feature.length > 40 ? '...' : ''}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.productFooter}>
                  <div style={styles.productPricing}>
                    {product.pricing.tiers && product.pricing.tiers.length > 0 ? (
                      <>
                        <span style={styles.priceLabel}>Starting at</span>
                        <span style={styles.priceValue}>
                          ${Math.min(...product.pricing.tiers.map(t => t.price))}/mo
                        </span>
                      </>
                    ) : (
                      <span style={styles.pricingModel}>{product.pricing.model}</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => !isComingSoon && handleExploreProduct(product._id)}
                    style={{
                      ...styles.exploreButton,
                      backgroundColor: isComingSoon ? '#9e9e9e' : '#4CAF50',
                      cursor: isComingSoon ? 'not-allowed' : 'pointer',
                      opacity: isComingSoon ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isComingSoon) {
                        e.currentTarget.style.backgroundColor = '#45a049';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isComingSoon) {
                        e.currentTarget.style.backgroundColor = '#4CAF50';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                    disabled={isComingSoon}
                  >
                    {isComingSoon ? 'Coming Soon' : 'Explore More →'}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section style={styles.ctaSection}>
        <div style={styles.ctaContent}>
          <h2 style={isMobile ? styles.ctaTitleMobile : styles.ctaTitle}>
            Ready to Get Started?
          </h2>
          <p style={isMobile ? styles.ctaSubtitleMobile : styles.ctaSubtitle}>
            Join thousands of businesses already using our AI solutions
          </p>
          <div style={styles.ctaButtons}>
            <button
              onClick={() => navigate('/signup')}
              style={styles.ctaPrimaryButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#45a049')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
            >
              Sign Up Free
            </button>
            <button
              onClick={handleViewAllProducts}
              style={styles.ctaSecondaryButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Browse Products
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
