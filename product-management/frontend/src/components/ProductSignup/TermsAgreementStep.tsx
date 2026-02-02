import React from 'react';
import { TermsAgreementStepProps } from '../../types';

const TermsAgreementStep: React.FC<TermsAgreementStepProps> = ({
  productName,
  acceptedTerms,
  onTermsChange,
  onBack,
  onContinue,
  styles
}) => {
  return (
    <>
      <h2 style={styles.stepTitle}>
        Terms and Agreement
      </h2>
      
      <div style={styles.termsBox}>
        <h3 style={styles.termsSubtitle}>Service Agreement</h3>
        <p style={styles.termsText}>
          By subscribing to {productName}, you agree to the following terms and conditions:
        </p>
        <ul style={styles.termsList}>
          <li>You will have access to the service features as described in the product listing.</li>
          <li>Billing will be processed according to the selected pricing plan.</li>
          <li>Your data will be processed in accordance with our Privacy Policy.</li>
          <li>You may cancel your subscription at any time from your account settings.</li>
          <li>Service availability is subject to our Service Level Agreement (SLA).</li>
          <li>You agree to use the service in compliance with applicable laws and regulations.</li>
          <li>We reserve the right to modify these terms with prior notice.</li>
        </ul>
        <p style={styles.termsFooter}>
          For complete terms and conditions, please visit our Terms of Service page.
        </p>
      </div>

      <div style={styles.checkboxContainer}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => onTermsChange(e.target.checked)}
            style={styles.checkbox}
          />
          <span style={styles.checkboxText}>
            I have read and agree to the Terms and Agreement
          </span>
        </label>
      </div>

      <div style={styles.buttonContainer}>
        <button
          onClick={onBack}
          style={styles.cancelButton}
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!acceptedTerms}
          style={{
            ...styles.continueButton,
            ...(!acceptedTerms ? styles.continueButtonDisabled : styles.continueButtonEnabled)
          }}
        >
          Continue to Payment
        </button>
      </div>
    </>
  );
};

export default TermsAgreementStep;
