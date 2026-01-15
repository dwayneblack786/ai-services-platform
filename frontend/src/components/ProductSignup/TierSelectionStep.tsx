import React from 'react';
import { TierSelectionStepProps } from '../../types';

const TierSelectionStep: React.FC<TierSelectionStepProps> = ({
  product,
  selectedTier,
  onTierSelect,
  onCancel,
  onContinue,
  styles
}) => {
  return (
    <>
      <h2 style={styles.stepTitle}>
        Choose Your Plan
      </h2>
      <p style={styles.stepDescription}>
        Select the plan that best fits your business size and needs.
      </p>

      {!product ? (
        <div style={styles.loadingContainer}>
          <p>Loading pricing information...</p>
        </div>
      ) : !product.pricing?.tiers || product.pricing.tiers.length === 0 ? (
        <div style={styles.errorContainer}>
          <p>No pricing tiers available for this product.</p>
          <p style={styles.errorSubtext}>Please contact support.</p>
        </div>
      ) : (
        <div style={styles.tiersContainer}>
          {product.pricing.tiers.map((tier) => (
            <div
              key={tier.name}
              onClick={() => onTierSelect(tier.name)}
              style={{
                ...styles.tierCard,
                ...(selectedTier === tier.name ? styles.tierCardSelected : {})
              }}
            >
              <h3 style={styles.tierTitle}>
                {tier.displayName}
              </h3>
              <div style={styles.tierPrice}>
                ${tier.price}
                <span style={styles.tierPriceUnit}>/month</span>
              </div>
              <p style={styles.tierDescription}>
                {tier.description}
              </p>
              <div style={styles.tierFeaturesContainer}>
                <p style={styles.tierFeaturesTitle}>Features:</p>
                <ul style={styles.tierFeaturesList}>
                  {tier.features?.map((feature, idx) => (
                    <li key={idx} style={styles.tierFeatureItem}>{feature}</li>
                  ))}
                </ul>
              </div>
              {selectedTier === tier.name && (
                <div style={styles.tierSelectedBadge}>
                  ✓ Selected
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={styles.buttonContainer}>
        <button
          onClick={onCancel}
          style={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedTier}
          style={{
            ...styles.continueButton,
            ...(!selectedTier ? styles.continueButtonDisabled : styles.continueButtonEnabled)
          }}
        >
          Continue to Terms
        </button>
      </div>
    </>
  );
};

export default TierSelectionStep;
