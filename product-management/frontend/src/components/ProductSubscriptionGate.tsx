import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

interface PricingTier {
  name: string;
  displayName: string;
  description: string;
  price: number;
  features: string[];
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  pricing: {
    model: string;
    tiers?: PricingTier[];
  };
  status: string;
}

interface ProductSubscriptionGateProps {
  /** Product slug (e.g. "listing-lift") — used to look up the product and subscription */
  productSlug: string;
  /** Rendered if the user has an active subscription */
  children: ReactNode;
}

/**
 * Wraps a product page. If the user does not have an active subscription for the
 * given product, renders a detailed gate page with pricing tiers and a sign-up CTA.
 */
const ProductSubscriptionGate = ({ productSlug, children }: ProductSubscriptionGateProps) => {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole('ADMIN', 'PROJECT_ADMIN');

  const [product, setProduct] = useState<Product | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  // Admins skip the subscription check entirely
  const [loading, setLoading] = useState(!isAdmin);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    checkSubscription();
  }, [productSlug, isAdmin]);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setFetchError(false);

      const [productsRes, subsRes] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/subscriptions').catch(() => ({ data: { subscriptions: [] } })),
      ]);

      const allProducts: Product[] = productsRes.data.products || [];
      const found = allProducts.find(p => p.slug === productSlug || p.name.toLowerCase().replace(/\s+/g, '-') === productSlug);

      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProduct(found);

      const subscriptions: any[] = subsRes.data.subscriptions || [];
      const active = subscriptions.some(
        s => String(s.productId) === String(found._id) && ['active', 'trial'].includes(s.status)
      );
      setIsSubscribed(active);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p style={{ color: '#9ca3af', marginTop: '16px' }}>Loading...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={errorPageStyle}>
        <div style={errorIconStyle}>⚠</div>
        <h2 style={errorTitleStyle}>Unable to verify subscription</h2>
        <p style={errorBodyStyle}>
          We couldn't reach the server to check your access. Please check your connection and try again.
        </p>
        <button style={primaryCtaStyle} onClick={checkSubscription}>Retry</button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={errorPageStyle}>
        <div style={errorIconStyle}>🏗</div>
        <h2 style={errorTitleStyle}>Product not set up yet</h2>
        <p style={errorBodyStyle}>
          <strong style={{ color: '#f9fafb' }}>ListingLift</strong> hasn't been registered in the platform
          database. This usually means the product seed script hasn't been run.
        </p>
        <div style={instructionBoxStyle}>
          <p style={instructionTitleStyle}>To fix this, run the seed script from the backend:</p>
          <code style={codeStyle}>npx ts-node src/scripts/seed-listinglift.ts</code>
        </div>
        <div style={ctaRowStyle}>
          <button style={primaryCtaStyle} onClick={checkSubscription}>Check again</button>
          <button style={secondaryCtaStyle} onClick={() => navigate('/products')}>Browse all products</button>
        </div>
      </div>
    );
  }

  // Admins and subscribed users get full access
  if (isAdmin || isSubscribed) {
    return <>{children}</>;
  }

  // Not subscribed — show gate page
  return (
    <div style={gatePageStyle}>
      {/* Product hero */}
      <div style={heroStyle}>
        <div style={heroBadgeStyle}>Real Estate AI</div>
        <h1 style={heroTitleStyle}>{product?.name}</h1>
        <p style={heroDescStyle}>{product?.description}</p>
        <div style={ctaRowStyle}>
          <button
            style={primaryCtaStyle}
            onClick={() => navigate(`/product-signup/${product?._id}`)}
          >
            Get Started →
          </button>
          <button style={secondaryCtaStyle} onClick={() => navigate('/products')}>
            View All Products
          </button>
        </div>
      </div>

      {/* Feature list */}
      {product?.features && product.features.length > 0 && (
        <div style={featuresSection}>
          <h2 style={sectionTitleStyle}>What's included</h2>
          <div style={featuresGrid}>
            {product.features.map((f, i) => (
              <div key={i} style={featureItemStyle}>
                <span style={checkmarkStyle}>✓</span>
                <span style={{ color: '#d1d5db', fontSize: '14px' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing tiers */}
      {product?.pricing?.tiers && product.pricing.tiers.length > 0 && (
        <div style={pricingSection}>
          <h2 style={sectionTitleStyle}>Pricing</h2>
          <div style={tiersGrid}>
            {product.pricing.tiers.map((tier, i) => {
              const isPopular = i === 1;
              return (
                <div key={tier.name} style={{ ...tierCardStyle, ...(isPopular ? popularTierStyle : {}) }}>
                  {isPopular && <div style={popularBadgeStyle}>Most Popular</div>}
                  <h3 style={tierNameStyle}>{tier.displayName}</h3>
                  <p style={tierDescStyle}>{tier.description}</p>
                  <div style={tierPriceStyle}>
                    <span style={dollarStyle}>$</span>
                    <span style={priceNumStyle}>{tier.price}</span>
                    <span style={perMonthStyle}>/mo</span>
                  </div>
                  <ul style={tierFeatureListStyle}>
                    {tier.features.map((f, fi) => (
                      <li key={fi} style={tierFeatureItemStyle}>
                        <span style={checkmarkStyle}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    style={isPopular ? primaryCtaStyle : outlineTierBtnStyle}
                    onClick={() => navigate(`/product-signup/${product?._id}?tier=${tier.name}`)}
                  >
                    Start {tier.displayName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Not ready CTA */}
      <div style={footerCtaStyle}>
        <p style={{ color: '#9ca3af', marginBottom: '12px' }}>
          Already subscribed?{' '}
          <button style={linkBtnStyle} onClick={checkSubscription}>
            Refresh subscription status
          </button>
        </p>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>
          Questions? Visit{' '}
          <button style={linkBtnStyle} onClick={() => navigate('/products')}>
            the products page
          </button>{' '}
          to learn more or contact support.
        </p>
      </div>
    </div>
  );
};

// Styles
const gatePageStyle: React.CSSProperties = { padding: '40px 32px', maxWidth: '1000px', margin: '0 auto' };
const loadingStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px' };
const spinnerStyle: React.CSSProperties = { width: '32px', height: '32px', border: '3px solid #374151', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' };

const errorPageStyle: React.CSSProperties = { maxWidth: '560px', margin: '80px auto', padding: '0 24px', textAlign: 'center' };
const errorIconStyle: React.CSSProperties = { fontSize: '48px', marginBottom: '20px' };
const errorTitleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#f9fafb', margin: '0 0 12px' };
const errorBodyStyle: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: 1.7, marginBottom: '24px' };
const instructionBoxStyle: React.CSSProperties = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '10px', padding: '16px 20px', marginBottom: '28px', textAlign: 'left' };
const instructionTitleStyle: React.CSSProperties = { fontSize: '13px', color: '#6b7280', marginBottom: '10px', margin: '0 0 10px' };
const codeStyle: React.CSSProperties = { display: 'block', fontFamily: 'monospace', fontSize: '13px', color: '#10b981', backgroundColor: '#0d1117', padding: '10px 14px', borderRadius: '6px', wordBreak: 'break-all' };

const heroStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '56px' };
const heroBadgeStyle: React.CSSProperties = { display: 'inline-block', backgroundColor: '#064e3b', color: '#6ee7b7', padding: '4px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' };
const heroTitleStyle: React.CSSProperties = { fontSize: '40px', fontWeight: 700, color: '#f9fafb', margin: '0 0 16px' };
const heroDescStyle: React.CSSProperties = { fontSize: '16px', color: '#9ca3af', maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.7 };
const ctaRowStyle: React.CSSProperties = { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' };
const primaryCtaStyle: React.CSSProperties = { backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' };
const secondaryCtaStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: '8px', padding: '12px 28px', cursor: 'pointer', fontSize: '15px' };

const featuresSection: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '32px', marginBottom: '40px' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' };
const featuresGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' };
const featureItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '10px' };
const checkmarkStyle: React.CSSProperties = { color: '#10b981', fontWeight: 700, flexShrink: 0 };

const pricingSection: React.CSSProperties = { marginBottom: '40px' };
const tiersGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' };
const tierCardStyle: React.CSSProperties = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '28px', position: 'relative' };
const popularTierStyle: React.CSSProperties = { border: '2px solid #10b981', backgroundColor: '#111827' };
const popularBadgeStyle: React.CSSProperties = { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10b981', color: '#fff', padding: '3px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' };
const tierNameStyle: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: '#f9fafb', margin: '0 0 4px' };
const tierDescStyle: React.CSSProperties = { color: '#6b7280', fontSize: '13px', marginBottom: '16px' };
const tierPriceStyle: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '20px' };
const dollarStyle: React.CSSProperties = { color: '#9ca3af', fontSize: '18px' };
const priceNumStyle: React.CSSProperties = { fontSize: '42px', fontWeight: 700, color: '#f9fafb', lineHeight: 1 };
const perMonthStyle: React.CSSProperties = { color: '#6b7280', fontSize: '14px' };
const tierFeatureListStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' };
const tierFeatureItemStyle: React.CSSProperties = { color: '#d1d5db', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };
const outlineTierBtnStyle: React.CSSProperties = { width: '100%', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontWeight: 600 };

const footerCtaStyle: React.CSSProperties = { textAlign: 'center', paddingTop: '16px' };
const linkBtnStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' };

export default ProductSubscriptionGate;
