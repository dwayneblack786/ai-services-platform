import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { productSignupStyles } from '../styles/ProductSignup.styles';
import { getApiUrl } from '../config/api';
import { Product } from '../types';
import { getProductImage } from '../theme/images';
import { realEstateTheme } from '../theme/realEstateTheme';
import { CheckCircle2, ArrowRight, Building2, TrendingUp, Shield, Zap } from 'lucide-react';

const ProductExplore = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    fetchProduct();
    if (user) {
      checkSubscription();
    }
  }, [productId, user]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(getApiUrl(`api/products/${productId}`));
      if (response.data.success) {
        setProduct(response.data.product);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const response = await apiClient.get(getApiUrl('api/user-products'));
      if (response.data.success) {
        const hasSubscription = response.data.userProducts.some(
          (up: any) => up.productId === productId
        );
        setIsSubscribed(hasSubscription);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  };

  const handleGetStarted = () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/products/${productId}/signup`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    if (isSubscribed) {
      navigate(`/products/${productId}/configure`);
    } else {
      navigate(`/products/${productId}/signup`);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={productSignupStyles.errorText}>{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/products')}
            style={productSignupStyles.errorButton}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: realEstateTheme.colors.neutral.lightest,
    }}>
      {/* Hero Section with Image */}
      <div style={{
        position: 'relative',
        height: '400px',
        overflow: 'hidden',
        marginBottom: '60px',
      }}>
        <img 
          src={getProductImage(product.subCategory || '', product.category || '')}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            maxWidth: '900px',
            width: '100%',
            padding: '0 32px',
            color: 'white',
          }}>
            <button
              onClick={() => navigate('/products')}
              style={{
                marginBottom: '24px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              ← Back to Products
            </button>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}>
              <div>
                <h1 style={{
                  margin: '0 0 12px 0',
                  fontSize: '3rem',
                  fontWeight: realEstateTheme.typography.fontWeight.bold,
                  color: 'white',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  {product.name}
                </h1>
                <p style={{
                  margin: '0',
                  fontSize: '1.25rem',
                  color: 'rgba(255,255,255,0.9)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}>
                  {product.category}{product.subCategory && ` - ${product.subCategory}`}
                </p>
              </div>
              <span style={{
                padding: '12px 24px',
                borderRadius: '24px',
                fontSize: '16px',
                fontWeight: realEstateTheme.typography.fontWeight.bold,
                color: 'white',
                background: product.status === 'active' ? realEstateTheme.colors.success.main : realEstateTheme.colors.warning.main,
                boxShadow: realEstateTheme.shadows.lg,
              }}>
                {product.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 32px 80px',
      }}>
        {/* Description Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: realEstateTheme.borderRadius.xl,
          marginBottom: '32px',
          boxShadow: realEstateTheme.shadows.lg,
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: realEstateTheme.typography.fontWeight.semibold,
            color: realEstateTheme.colors.neutral.darkest,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Building2 size={32} color={realEstateTheme.colors.primary.main} />
            About This Product
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: realEstateTheme.colors.neutral.dark,
            lineHeight: '1.8',
            margin: 0,
          }}>
            {product.description}
          </p>
        </div>

        {/* Key Features Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: realEstateTheme.borderRadius.xl,
          marginBottom: '32px',
          boxShadow: realEstateTheme.shadows.lg,
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: realEstateTheme.typography.fontWeight.semibold,
            color: realEstateTheme.colors.neutral.darkest,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Zap size={32} color={realEstateTheme.colors.primary.main} />
            Key Features
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}>
            {product.features.map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: realEstateTheme.borderRadius.lg,
                  backgroundColor: realEstateTheme.colors.neutral.lightest,
                  border: `1px solid ${realEstateTheme.colors.neutral.light}`,
                  transition: 'all 0.2s',
                }}
              >
                <CheckCircle2 
                  size={24} 
                  color={realEstateTheme.colors.success.main} 
                  style={{ flexShrink: 0, marginTop: '2px' }}
                />
                <span style={{
                  fontSize: '1rem',
                  color: realEstateTheme.colors.neutral.dark,
                  lineHeight: '1.6',
                }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: realEstateTheme.borderRadius.xl,
          marginBottom: '32px',
          boxShadow: realEstateTheme.shadows.lg,
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: realEstateTheme.typography.fontWeight.semibold,
            color: realEstateTheme.colors.neutral.darkest,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <TrendingUp size={32} color={realEstateTheme.colors.primary.main} />
            Pricing Plans
          </h2>
          <p style={{
            fontSize: '1.25rem',
            fontWeight: realEstateTheme.typography.fontWeight.semibold,
            color: realEstateTheme.colors.primary.main,
            marginBottom: '24px',
          }}>
            {product.pricing.model.charAt(0).toUpperCase() + product.pricing.model.slice(1)}
            {product.pricing.tiers && product.pricing.tiers.length > 0 && (
              <span style={{
                fontSize: '1rem',
                color: realEstateTheme.colors.neutral.medium,
                fontWeight: realEstateTheme.typography.fontWeight.normal,
                marginLeft: '8px',
              }}>
                starting at ${Math.min(...product.pricing.tiers.map(t => t.price))}/month
              </span>
            )}
          </p>
          
          {/* Pricing Tiers */}
          {product.pricing.tiers && product.pricing.tiers.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '24px',
              marginTop: '24px',
            }}>
              {product.pricing.tiers.map((tier, index) => (
                <div
                  key={tier.name}
                  style={{
                    padding: '32px',
                    border: `2px solid ${index === 1 ? realEstateTheme.colors.primary.main : realEstateTheme.colors.neutral.light}`,
                    borderRadius: realEstateTheme.borderRadius.xl,
                    backgroundColor: index === 1 ? realEstateTheme.colors.primary.lighter : 'white',
                    position: 'relative',
                    transition: 'all 0.3s',
                    boxShadow: index === 1 ? realEstateTheme.shadows.xl : realEstateTheme.shadows.sm,
                  }}
                >
                  {index === 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '24px',
                      background: realEstateTheme.colors.primary.main,
                      color: 'white',
                      padding: '6px 16px',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: realEstateTheme.typography.fontWeight.bold,
                    }}>
                      POPULAR
                    </div>
                  )}
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '1.5rem', 
                    fontWeight: realEstateTheme.typography.fontWeight.bold,
                    color: realEstateTheme.colors.neutral.darkest,
                  }}>
                    {tier.displayName}
                  </h4>
                  <div style={{ 
                    fontSize: '3rem', 
                    fontWeight: realEstateTheme.typography.fontWeight.bold, 
                    color: realEstateTheme.colors.primary.main,
                    margin: '16px 0',
                    lineHeight: '1',
                  }}>
                    ${tier.price}
                    <span style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: realEstateTheme.typography.fontWeight.normal, 
                      color: realEstateTheme.colors.neutral.medium,
                    }}>/month</span>
                  </div>
                  <p style={{ 
                    fontSize: '1rem', 
                    color: realEstateTheme.colors.neutral.dark,
                    margin: '16px 0',
                    lineHeight: '1.6',
                  }}>
                    {tier.description}
                  </p>
                  {tier.features && tier.features.length > 0 && (
                    <ul style={{ 
                      margin: '24px 0 0 0', 
                      padding: '0',
                      listStyle: 'none',
                    }}>
                      {tier.features.map((feature, idx) => (
                        <li key={idx} style={{ 
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}>
                          <CheckCircle2 
                            size={20} 
                            color={realEstateTheme.colors.success.main}
                            style={{ flexShrink: 0, marginTop: '2px' }}
                          />
                          <span style={{
                            fontSize: '0.9375rem',
                            color: realEstateTheme.colors.neutral.dark,
                          }}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Industries & Tags */}
        {product.industries && product.industries.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: realEstateTheme.borderRadius.xl,
            marginBottom: '32px',
            boxShadow: realEstateTheme.shadows.lg,
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: realEstateTheme.typography.fontWeight.semibold,
              color: realEstateTheme.colors.neutral.darkest,
              marginBottom: '20px',
            }}>
              Industries
            </h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {product.industries.map((industry, index) => (
                <span
                  key={index}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontSize: '0.9375rem',
                    background: realEstateTheme.colors.primary.lighter,
                    color: realEstateTheme.colors.primary.dark,
                    fontWeight: realEstateTheme.typography.fontWeight.medium,
                    border: `1px solid ${realEstateTheme.colors.primary.light}`,
                  }}
                >
                  {industry}
                </span>
              ))}
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: realEstateTheme.typography.fontWeight.semibold,
              color: realEstateTheme.colors.neutral.darkest,
              marginTop: '32px',
              marginBottom: '16px',
            }}>
              Tags
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {product.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '16px',
                    fontSize: '0.875rem',
                    background: realEstateTheme.colors.neutral.lightest,
                    color: realEstateTheme.colors.neutral.dark,
                    border: `1px solid ${realEstateTheme.colors.neutral.light}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: realEstateTheme.borderRadius.xl,
          boxShadow: realEstateTheme.shadows.xl,
          textAlign: 'center',
        }}>
          {product.status !== 'active' ? (
            <>
              <div style={{
                fontSize: '4rem',
                marginBottom: '24px',
              }}>
                🚀
              </div>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: realEstateTheme.typography.fontWeight.bold,
                color: realEstateTheme.colors.warning.dark,
                marginBottom: '16px',
              }}>
                Coming Soon!
              </h2>
              <p style={{
                fontSize: '1.125rem',
                color: realEstateTheme.colors.neutral.dark,
                marginBottom: '32px',
                lineHeight: '1.6',
              }}>
                This product is currently under development. Check out our other available products.
              </p>
              <button
                onClick={() => navigate('/products')}
                style={{
                  padding: '16px 48px',
                  borderRadius: realEstateTheme.borderRadius.lg,
                  border: 'none',
                  backgroundColor: realEstateTheme.colors.warning.main,
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: realEstateTheme.typography.fontWeight.bold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: realEstateTheme.shadows.lg,
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Browse Other Products
              </button>
            </>
          ) : user && isSubscribed ? (
            <>
              <div style={{
                padding: '24px',
                borderRadius: realEstateTheme.borderRadius.xl,
                background: realEstateTheme.colors.success.lighter,
                border: `2px solid ${realEstateTheme.colors.success.main}`,
                marginBottom: '24px',
              }}>
                <p style={{
                  fontSize: '1.5rem',
                  color: realEstateTheme.colors.success.dark,
                  fontWeight: realEstateTheme.typography.fontWeight.bold,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}>
                  <CheckCircle2 size={32} />
                  You are subscribed to this product
                </p>
              </div>
              <button
                onClick={() => navigate(`/products/${productId}/configure`)}
                style={{
                  padding: '16px 48px',
                  borderRadius: realEstateTheme.borderRadius.lg,
                  border: 'none',
                  backgroundColor: realEstateTheme.colors.primary.main,
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: realEstateTheme.typography.fontWeight.bold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: realEstateTheme.shadows.lg,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Configure Product
                <ArrowRight size={20} />
              </button>
            </>
          ) : (
            <>
              <Shield size={64} color={realEstateTheme.colors.primary.main} style={{ marginBottom: '24px' }} />
              <h2 style={{
                fontSize: '2rem',
                fontWeight: realEstateTheme.typography.fontWeight.bold,
                color: realEstateTheme.colors.neutral.darkest,
                marginBottom: '16px',
              }}>
                Ready to get started?
              </h2>
              <p style={{
                fontSize: '1.125rem',
                color: realEstateTheme.colors.neutral.dark,
                marginBottom: '32px',
                lineHeight: '1.6',
                maxWidth: '600px',
                margin: '0 auto 32px',
              }}>
                {user 
                  ? 'Sign up now to access this product and unlock all its powerful features designed for real estate professionals.'
                  : 'Create an account or sign in to get started with this product and transform your real estate business.'}
              </p>
              <button
                onClick={handleGetStarted}
                style={{
                  padding: '18px 56px',
                  borderRadius: realEstateTheme.borderRadius.lg,
                  border: 'none',
                  backgroundColor: realEstateTheme.colors.success.main,
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: realEstateTheme.typography.fontWeight.bold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: realEstateTheme.shadows.xl,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(76, 175, 80, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = realEstateTheme.shadows.xl;
                }}
              >
                {user ? 'Sign Up Now' : 'Get Started'}
                <ArrowRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductExplore;
