import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { productSignupStyles } from '../styles/ProductSignup.styles';
import { getApiUrl } from '../config/api';
import TermsAgreementStep from '../components/ProductSignup/TermsAgreementStep';
import PaymentSelectionStep from '../components/ProductSignup/PaymentSelectionStep';
import ConfirmationStep from '../components/ProductSignup/ConfirmationStep';
import { Product } from '../types';

const ProductSignup = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Wizard states
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'small' | 'medium' | 'large' | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct();
    checkSubscription();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(getApiUrl(`api/products/${productId}`));
      if (response.data.success) {
        console.log('Product data received:', response.data.product);
        console.log('Pricing tiers:', response.data.product?.pricing?.tiers);
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

  const handleStartSignup = () => {
    // Check if user is authenticated
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/products/${productId}/signup`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!product) {
      alert('Product information is still loading. Please wait.');
      return;
    }
    if (!product.pricing?.tiers || product.pricing.tiers.length === 0) {
      alert('This product does not have pricing tiers configured. Please contact support.');
      console.error('Product pricing tiers missing:', product);
      return;
    }
    setCurrentStep(1);
  };

  const handleTierSelected = () => {
    if (selectedTier) {
      setCurrentStep(2);
    }
  };

  const handleAcceptTerms = () => {
    if (acceptedTerms) {
      setCurrentStep(3);
    }
  };

  const handlePaymentMethodSelected = (paymentMethodId: string) => {
    setSelectedPaymentMethod(paymentMethodId);
  };

  const handlePaymentContinue = async () => {
    if (!selectedPaymentMethod) return;
    
    try {
      setSubscribing(true);
      // Validate payment method
      const validationResponse = await apiClient.post(
        getApiUrl('api/subscriptions/validate-payment'),
        { paymentMethodId: selectedPaymentMethod }
      );
      
      if (validationResponse.data.success) {
        setCurrentStep(4);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment validation failed');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!productId || !selectedPaymentMethod || !selectedTier) return;
    
    try {
      setSubscribing(true);
      // Create subscription
      const response = await apiClient.post(
        getApiUrl('api/subscriptions/create'),
        { 
          productId,
          paymentMethodId: selectedPaymentMethod,
          pricingTier: selectedTier
        }
      );
      
      if (response.data.success) {
        setIsSubscribed(true);
        // Navigate to configuration page
        navigate(`/products/${productId}/configure`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete signup');
    } finally {
      setSubscribing(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // const handleCancelSignup = () => {
  //   setCurrentStep(0);
  //   setSelectedTier(null);
  //   setAcceptedTerms(false);
  //   setSelectedPaymentMethod(null);
  // };

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
          {isSubscribed ? (
            <div style={productSignupStyles.subscribedContainer}>
              <div style={productSignupStyles.subscribedBadge}>
                <p style={productSignupStyles.subscribedText}>
                  ✓ You are subscribed to this product
                </p>
              </div>
              <button
                onClick={() => navigate('/products')}
                style={productSignupStyles.browseButton}
              >
                Browse More Products
              </button>
            </div>
          ) : (
            <div style={productSignupStyles.signupContainer}>
              <h2 style={productSignupStyles.signupTitle}>
                Ready to get started?
              </h2>
              <p style={productSignupStyles.signupDescription}>
                Sign up now to access this product and unlock all its features.
              </p>
              <button
                onClick={handleStartSignup}
                disabled={subscribing}
                style={{
                  ...productSignupStyles.signupButton,
                  ...(subscribing ? productSignupStyles.signupButtonDisabled : productSignupStyles.signupButtonEnabled)
                }}
              >
                {subscribing ? 'Processing...' : 'Sign Up Now'}
              </button>

              {/* Multi-Step Wizard Modal */}
              {currentStep > 0 && (
                <div style={productSignupStyles.modalOverlay}>
                  <div style={productSignupStyles.modalContent}>
                    {/* Progress Steps */}
                    <div style={productSignupStyles.progressContainer}>
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} style={productSignupStyles.progressStep}>
                          <div style={{
                            ...productSignupStyles.progressCircle,
                            ...(currentStep >= step ? productSignupStyles.progressCircleActive : productSignupStyles.progressCircleInactive)
                          }}>
                            {step}
                          </div>
                          <div style={productSignupStyles.progressInfo}>
                            <div style={productSignupStyles.progressLabel}>Step {step}</div>
                            <div style={productSignupStyles.progressTitle}>
                              {step === 1 ? 'Plan' : step === 2 ? 'Terms' : step === 3 ? 'Payment' : 'Confirm'}
                            </div>
                          </div>
                          {step < 4 && (
                            <div style={{
                              ...productSignupStyles.progressLine,
                              ...(currentStep > step ? productSignupStyles.progressLineActive : productSignupStyles.progressLineInactive)
                            }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Select Pricing Tier */}
                    {currentStep === 1 && (
                      <>
                        <h2 style={productSignupStyles.stepTitle}>
                          Choose Your Plan
                        </h2>
                        <p style={productSignupStyles.stepDescription}>
                          Select the plan that best fits your business size and needs.
                        </p>

                        {!product ? (
                          <div style={productSignupStyles.loadingContainer}>
                            <p>Loading pricing information...</p>
                          </div>
                        ) : !product.pricing?.tiers || product.pricing.tiers.length === 0 ? (
                          <div style={productSignupStyles.errorContainer}>
                            <p>No pricing tiers available for this product.</p>
                            <p style={productSignupStyles.errorSubtext}>Please contact support.</p>
                          </div>
                        ) : (
                          <div style={productSignupStyles.tiersContainer}>
                            {product.pricing.tiers.map((tier) => (
                            <div
                              key={tier.name}
                              onClick={() => setSelectedTier(tier.name)}
                              style={{
                                ...productSignupStyles.tierCard,
                                ...(selectedTier === tier.name ? productSignupStyles.tierCardSelected : {})
                              }}
                            >
                              <h3 style={productSignupStyles.tierTitle}>
                                {tier.displayName}
                              </h3>
                              <div style={productSignupStyles.tierPrice}>
                                ${tier.price}
                                <span style={productSignupStyles.tierPriceUnit}>/month</span>
                              </div>
                              <p style={productSignupStyles.tierDescription}>
                                {tier.description}
                              </p>
                              <div style={productSignupStyles.tierFeaturesContainer}>
                                <p style={productSignupStyles.tierFeaturesTitle}>Features:</p>
                                <ul style={productSignupStyles.tierFeaturesList}>
                                  {tier.features?.map((feature, idx) => (
                                    <li key={idx} style={productSignupStyles.tierFeatureItem}>{feature}</li>
                                  ))}
                                </ul>
                              </div>
                              {selectedTier === tier.name && (
                                <div style={productSignupStyles.tierSelectedBadge}>
                                  ✓ Selected
                                </div>
                              )}
                            </div>
                          ))}
                          </div>
                        )}

                        <div style={productSignupStyles.buttonContainer}>
                          <button
                            onClick={() => setCurrentStep(0)}
                            style={productSignupStyles.cancelButton}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleTierSelected}
                            disabled={!selectedTier}
                            style={{
                              ...productSignupStyles.continueButton,
                              ...(!selectedTier ? productSignupStyles.continueButtonDisabled : productSignupStyles.continueButtonEnabled)
                            }}
                          >
                            Continue to Terms
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step 2: Terms and Agreement */}
                    {currentStep === 2 && (
                      <TermsAgreementStep
                        productName={product?.name}
                        acceptedTerms={acceptedTerms}
                        onTermsChange={setAcceptedTerms}
                        onBack={handleBackStep}
                        onContinue={handleAcceptTerms}
                        styles={productSignupStyles}
                      />
                    )}

                    {/* Step 3: Payment Method Selection */}
                    {currentStep === 3 && (
                      <PaymentSelectionStep
                        selectedPaymentMethod={selectedPaymentMethod}
                        subscribing={subscribing}
                        onPaymentMethodSelected={handlePaymentMethodSelected}
                        onBack={handleBackStep}
                        onContinue={handlePaymentContinue}
                        styles={productSignupStyles}
                      />
                    )}

                    {/* Step 4: Confirmation */}
                    {currentStep === 4 && (
                      <ConfirmationStep
                        product={product}
                        selectedTier={selectedTier}
                        subscribing={subscribing}
                        onBack={handleBackStep}
                        onComplete={handleCompleteSignup}
                        styles={productSignupStyles}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSignup;
