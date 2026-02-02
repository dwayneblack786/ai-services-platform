import React from 'react';
import { ConfirmationStepProps } from '../../types';

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  product,
  selectedTier,
  subscribing,
  onBack,
  onComplete,
  styles
}) => {
  const selectedTierInfo = selectedTier && product?.pricing.tiers?.find(t => t.name === selectedTier);

  return (
    <>
      <h2 style={styles.stepTitle}>
        Confirm Subscription
      </h2>
      
      <div style={styles.validationSuccessBadge}>
        <p style={styles.validationSuccessTitle}>
          ✓ Payment Method Validated
        </p>
        <p style={styles.validationSuccessText}>
          Your payment information has been verified successfully.
        </p>
      </div>

      <div style={styles.summaryBox}>
        <h3 style={styles.summaryTitle}>Subscription Summary</h3>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Product:</span>
          <span style={styles.summaryValue}>{product?.name}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Plan:</span>
          <span style={styles.summaryValue}>
            {selectedTierInfo?.displayName}
          </span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Price:</span>
          <span style={styles.summaryValue}>
            ${selectedTierInfo?.price}/month
          </span>
        </div>
        <div style={styles.summaryDivider}>
          <p style={styles.summaryFooter}>
            By clicking "Complete Signup", a subscription will be created and your first payment will be processed.
          </p>
        </div>
      </div>

      <div style={styles.buttonContainer}>
        <button
          onClick={onBack}
          style={styles.cancelButton}
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={subscribing}
          style={{
            ...styles.continueButton,
            ...(subscribing ? styles.continueButtonDisabled : styles.continueButtonEnabled)
          }}
        >
          {subscribing ? 'Processing...' : 'Complete Signup'}
        </button>
      </div>
    </>
  );
};

export default ConfirmationStep;
