import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { getApiUrl } from '../config/api';
import { styles } from '../styles/Home.styles';
import { Product } from '../types';
import { realEstateTheme, getCategoryStyle } from '../theme/realEstateTheme';
import { realEstateImages, getProductImage, getFeatureImage } from '../theme/images';

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
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category || 'Real Estate'))];
  const filteredProducts = activeTab === 'All' 
    ? products 
    : products.filter(p => (p.category || 'Real Estate') === activeTab);

  const handleExploreProduct = (productId?: string) => {
    if (productId) {
      navigate(`/products/${productId}/explore`);
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
          <p>Loading Real Estate AI Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={isMobile ? styles.heroMobile : styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={isMobile ? styles.heroTitleMobile : styles.heroTitle}>
            Transform Real Estate with AI
          </h1>
          <p style={isMobile ? styles.heroSubtitleMobile : styles.heroSubtitle}>
            Professional AI solutions built specifically for real estate professionals, brokers, and property managers
          </p>
          <button
            onClick={handleViewAllProducts}
            style={isMobile ? styles.ctaButtonMobile : styles.ctaButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = realEstateTheme.colors.secondary.light;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = realEstateTheme.colors.secondary.main;
            }}
          >
            Explore Products <ArrowRight size={20} />
          </button>
        </div>
        <div style={styles.heroImage}>
          <img 
            src={realEstateImages.hero.main}
            alt="Modern real estate cityscape"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: realEstateTheme.borderRadius['2xl'],
              boxShadow: realEstateTheme.shadows['2xl'],
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <h2 style={isMobile ? styles.sectionTitleMobile : styles.sectionTitle}>
          Why Real Estate Professionals Choose Us
        </h2>
        <div style={isMobile ? styles.featuresGridMobile : styles.featuresGrid}>
          {[
            {
              image: getFeatureImage('Lightning Fast'),
              title: 'Lightning Fast',
              description: 'Deploy listing content, reports, and compliance tools in minutes, not hours',
            },
            {
              image: getFeatureImage('Fair Housing Compliant'),
              title: 'Fair Housing Compliant',
              description: 'Built-in compliance monitoring to protect you from violations',
            },
            {
              image: getFeatureImage('Real Estate Focused'),
              title: 'Real Estate Focused',
              description: 'Every feature designed specifically for real estate workflows',
            },
            {
              image: getFeatureImage('Professional Results'),
              title: 'Professional Results',
              description: 'Enterprise-quality output that rivals large brokerages',
            },
          ].map((feature, index) => (
            <div
              key={index}
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = realEstateTheme.shadows.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = realEstateTheme.shadows.card;
              }}
            >
              <div style={{
                width: '100%',
                height: '180px',
                borderRadius: realEstateTheme.borderRadius.lg,
                overflow: 'hidden',
                marginBottom: realEstateTheme.spacing.md,
              }}>
                <img 
                  src={feature.image}
                  alt={feature.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products Section */}
      <section style={styles.productsSection}>
        <h2 style={isMobile ? styles.sectionTitleMobile : styles.sectionTitle}>
          Real Estate AI Solutions
        </h2>
        <p style={styles.sectionSubtitle}>
          Purpose-built tools to automate listing production, ensure compliance, and scale your real estate business
        </p>
        
        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: realEstateTheme.spacing.sm,
          marginBottom: realEstateTheme.spacing['3xl'],
          flexWrap: 'wrap',
          padding: isMobile ? `0 ${realEstateTheme.spacing.lg}` : '0'
        }}>
          {categories.map((category) => {
            const isActive = activeTab === category;
            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                style={isActive ? styles.tabButtonActive : styles.tabButton}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = realEstateTheme.colors.primary.main;
                    e.currentTarget.style.color = realEstateTheme.colors.primary.main;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = realEstateTheme.colors.neutral.light;
                    e.currentTarget.style.color = realEstateTheme.colors.neutral.darker;
                  }
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div style={isMobile ? styles.productsGridMobile : styles.productsGrid}>
          {filteredProducts.map((product) => {
            const isComingSoon = product.status !== 'active';
            const productImage = getProductImage(product.subCategory || '', product.category || '');
            const categoryStyle = getCategoryStyle(product.subCategory || product.category || 'Real Estate');
            
            return (
              <div
                key={product._id}
                style={{
                  ...styles.productCard,
                  opacity: isComingSoon ? 0.9 : 1,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isComingSoon) {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = realEstateTheme.shadows.cardHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isComingSoon) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = realEstateTheme.shadows.card;
                  }
                }}
              >
                {isComingSoon && (
                  <div style={{
                    position: 'absolute',
                    top: realEstateTheme.spacing.md,
                    left: realEstateTheme.spacing.md,
                    padding: `${realEstateTheme.spacing.xs} ${realEstateTheme.spacing.md}`,
                    backgroundColor: realEstateTheme.colors.secondary.main,
                    color: 'white',
                    borderRadius: realEstateTheme.borderRadius.full,
                    fontSize: realEstateTheme.typography.fontSize.xs,
                    fontWeight: realEstateTheme.typography.fontWeight.bold,
                    boxShadow: realEstateTheme.shadows.md,
                    zIndex: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: realEstateTheme.spacing.xs,
                  }}>
                    <Sparkles size={14} /> COMING SOON
                  </div>
                )}
                
                <div style={{
                  ...styles.productImageContainer,
                  background: 'transparent',
                  overflow: 'hidden',
                }}>
                  <img 
                    src={productImage}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  }} />
                </div>

                <div style={{
                  ...styles.productCategoryBadge,
                  color: categoryStyle.color,
                  backgroundColor: categoryStyle.bg,
                }}>
                  {product.subCategory || product.category || 'Real Estate'}
                </div>
                
                <div style={styles.productContent}>
                  <h3 style={styles.productTitle}>{product.name}</h3>
                  <p style={styles.productDescription}>
                    {product.description}
                  </p>
                  
                  <div style={styles.productFeatures}>
                    {product.features && product.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} style={styles.productFeatureItem}>
                        <CheckCircle2 
                          size={16} 
                          color={realEstateTheme.colors.accent.main}
                          style={{ flexShrink: 0 }}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div style={styles.productFooter}>
                    <div style={styles.productPricing}>
                      {product.pricing?.tiers && product.pricing.tiers.length > 0 ? (
                        <>
                          <span style={styles.priceLabel}>Starting at</span>
                          <span style={styles.priceValue}>
                            ${Math.min(...product.pricing.tiers.map(t => t.price))}/mo
                          </span>
                        </>
                      ) : product.pricing?.perUseRate ? (
                        <>
                          <span style={styles.priceLabel}>Pay as you go</span>
                          <span style={styles.priceValue}>
                            ${product.pricing.perUseRate}/{product.pricing.perUseUnit || 'unit'}
                          </span>
                        </>
                      ) : product.pricing?.enterprisePrice ? (
                        <>
                          <span style={styles.priceLabel}>Enterprise</span>
                          <span style={styles.priceValue}>
                            ${product.pricing.enterprisePrice}/mo
                          </span>
                        </>
                      ) : (
                        <span style={styles.pricingModel}>
                          {product.pricing?.model || 'Contact Us'}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleExploreProduct(product._id)}
                      style={styles.exploreButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.backgroundColor = realEstateTheme.colors.primary.dark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = realEstateTheme.colors.primary.main;
                      }}
                    >
                      {isComingSoon ? 'Learn More' : 'Explore'}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length > 6 && (
          <div style={styles.viewAllContainer}>
            <button
              onClick={handleViewAllProducts}
              style={styles.viewAllButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = realEstateTheme.colors.primary.dark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = realEstateTheme.colors.primary.main;
              }}
            >
              View All Products <ArrowRight size={20} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
