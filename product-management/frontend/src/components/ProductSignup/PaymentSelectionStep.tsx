import React from 'react';
import PaymentMethodSelector from '../PaymentMethodSelector';
import { PaymentSelectionStepProps } from '../../types';

const PaymentSelectionStep: React.FC<PaymentSelectionStepProps> = ({
  selectedPaymentMethod,
  subscribing,
  onPaymentMethodSelected,
  onBack,
  onContinue,
  styles
}) => {
  return (
    <>
      <h2 style={styles.stepTitle}>
        Select Payment Method
      </h2>
      <p style={styles.stepDescription}>
        Choose a payment method or add a new one to continue.
      </p>

      <PaymentMethodSelector
        onPaymentMethodSelected={onPaymentMethodSelected}
        selectedPaymentMethodId={selectedPaymentMethod || undefined}
      />

      <div style={styles.paymentContainer}>
        <div style={styles.buttonContainer}>
          <button
            onClick={onBack}
            style={styles.cancelButton}
          >
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={!selectedPaymentMethod || subscribing}
            style={{
              ...styles.continueButton,
              ...((!selectedPaymentMethod || subscribing) ? styles.continueButtonDisabled : styles.continueButtonEnabled)
            }}
          >
            {subscribing ? 'Validating...' : 'Validate & Continue'}
          </button>
        </div>
      </div>
    </>
  );
};

export default PaymentSelectionStep;
