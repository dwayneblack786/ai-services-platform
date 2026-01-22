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
        const activeProducts = response.data.products.filter(
          (p: Product) => p.status === 'active'
        );
        setProducts(activeProducts);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProductIcon = (category: string) => {
    switch (category) {
      case 'Virtual Assistant':
        return '🤖';
      case 'IDP':
        return '📄';
      case 'Computer Vision':
        return '👁️';
      default:
        return '⚡';
    }
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
        
        <div style={isMobile ? styles.productsGridMobile : styles.productsGrid}>
          {products.slice(0, 6).map((product) => (
            <div 
              key={product._id} 
              style={styles.productCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
            >
              <div style={styles.productImageContainer}>
                <div style={styles.productImage}>
                  <span style={styles.productImageIcon}>
                    {getProductIcon(product.category)}
                  </span>
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
                    onClick={() => handleExploreProduct(product._id)}
                    style={styles.exploreButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#45a049';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#4CAF50';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    Explore More →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length > 6 && (
          <div style={styles.viewAllContainer}>
            <button
              onClick={handleViewAllProducts}
              style={styles.viewAllButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1976D2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
            >
              View All {products.length} Products
            </button>
          </div>
        )}
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
