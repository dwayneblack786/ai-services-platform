import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { productSignupStyles } from '../styles/ProductSignup.styles';
import { getApiUrl } from '../config/api';
import { Product } from '../types';

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
    <div style={productSignupStyles.container}>
      <button
        onClick={() => navigate('/products')}
        style={productSignupStyles.backButton}
      >
        ← Back to Products
      </button>

      <div style={styles.card}>
        <div style={productSignupStyles.header}>
          <div>
            <h1 style={productSignupStyles.title}>{product.name}</h1>
            <p style={productSignupStyles.category}>
              {product.category}{product.subCategory && ` - ${product.subCategory}`}
            </p>
          </div>
          <span style={{
            ...productSignupStyles.statusBadge,
            ...(product.status === 'active' ? productSignupStyles.statusActive : productSignupStyles.statusInactive)
          }}>
            {product.status}
          </span>
        </div>

        <div style={productSignupStyles.section}>
          <h2 style={productSignupStyles.sectionTitle}>Description</h2>
          <p style={productSignupStyles.description}>
            {product.description}
          </p>
        </div>

        <div style={productSignupStyles.section}>
          <h2 style={productSignupStyles.sectionTitle}>Key Features</h2>
          <ul style={productSignupStyles.featureList}>
            {product.features.map((feature, index) => (
              <li key={index} style={productSignupStyles.featureItem}>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div style={productSignupStyles.pricingBox}>
          <h2 style={productSignupStyles.sectionTitle}>Pricing</h2>
          <p style={productSignupStyles.pricingText}>
            {product.pricing.model.charAt(0).toUpperCase() + product.pricing.model.slice(1)}
            {product.pricing.tiers && product.pricing.tiers.length > 0 && (
              <span style={productSignupStyles.pricingDetail}>
                {' '}starting at ${Math.min(...product.pricing.tiers.map(t => t.price))}/month
              </span>
            )}
          </p>
          
          {/* Show pricing tiers */}
          {product.pricing.tiers && product.pricing.tiers.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ ...productSignupStyles.sectionTitle, fontSize: '1.1rem', marginBottom: '16px' }}>
                Available Plans
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '16px' 
              }}>
                {product.pricing.tiers.map((tier) => (
                  <div
                    key={tier.name}
                    style={{
                      padding: '20px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '1.1rem', 
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {tier.displayName}
                    </h4>
                    <div style={{ 
                      fontSize: '2rem', 
                      fontWeight: '700', 
                      color: '#4CAF50',
                      margin: '8px 0'
                    }}>
                      ${tier.price}
                      <span style={{ fontSize: '1rem', fontWeight: '400', color: '#666' }}>/month</span>
                    </div>
                    <p style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      margin: '8px 0'
                    }}>
                      {tier.description}
                    </p>
                    {tier.features && tier.features.length > 0 && (
                      <ul style={{ 
                        margin: '12px 0 0 0', 
                        padding: '0 0 0 20px',
                        fontSize: '0.85rem',
                        color: '#555'
                      }}>
                        {tier.features.map((feature, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {product.industries && product.industries.length > 0 && (
          <div style={productSignupStyles.section}>
            <h2 style={productSignupStyles.sectionTitle}>Industries</h2>
            <div style={productSignupStyles.tagContainer}>
              {product.industries.map((industry, index) => (
                <span key={index} style={productSignupStyles.industryTag}>
                  {industry}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={productSignupStyles.section}>
          <h2 style={productSignupStyles.sectionTitle}>Tags</h2>
          <div style={productSignupStyles.tagContainer}>
            {product.tags.map((tag, index) => (
              <span key={index} style={productSignupStyles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={productSignupStyles.signupSection}>
          {user && isSubscribed ? (
            <div style={productSignupStyles.subscribedContainer}>
              <div style={productSignupStyles.subscribedBadge}>
                <p style={productSignupStyles.subscribedText}>
                  ✓ You are subscribed to this product
                </p>
              </div>
              <button
                onClick={() => navigate(`/products/${productId}/configure`)}
                style={{
                  ...productSignupStyles.signupButton,
                  ...productSignupStyles.signupButtonEnabled
                }}
              >
                Configure Product
              </button>
            </div>
          ) : (
            <div style={productSignupStyles.signupContainer}>
              <h2 style={productSignupStyles.signupTitle}>
                Ready to get started?
              </h2>
              <p style={productSignupStyles.signupDescription}>
                {user 
                  ? 'Sign up now to access this product and unlock all its features.'
                  : 'Create an account or sign in to get started with this product.'}
              </p>
              <button
                onClick={handleGetStarted}
                style={{
                  ...productSignupStyles.signupButton,
                  ...productSignupStyles.signupButtonEnabled
                }}
              >
                {user ? 'Sign Up Now' : 'Get Started'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductExplore;
